const twilio = require('twilio');

let client = null;

const initTwilio = () => {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      console.log('✅ Twilio initialisé');
    } catch (err) {
      console.warn('⚠️  Twilio non initialisé:', err.message);
    }
  } else {
    console.warn('⚠️  Variables Twilio manquantes, notifications désactivées');
  }
};

// Formater le numéro de téléphone au format international
const formatPhone = (phone) => {
  if (!phone) return null;
  let p = phone.replace(/\s+/g, '').replace(/-/g, '');
  if (!p.startsWith('+')) p = '+' + p;
  return p;
};

const WA_TEMPLATES = {
  soil_dry: (d) => `🌱 *ALERTE SÉCHERESSE*\n\n📍 Parcelle: *${d.parcelName}*\n🌿 Culture: ${d.cropType}\n💧 Humidité sol: *${d.soilHumidity}%* (seuil: ${d.threshold}%)\n🌡️ Température: ${d.temperature}°C\n\n✅ Pompe activée automatiquement.`,
  soil_wet: (d) => `💧 *ALERTE EXCÈS EAU*\n\n📍 Parcelle: *${d.parcelName}*\n💦 Humidité sol: *${d.soilHumidity}%*\n\n⛔ Arrosage suspendu automatiquement.`,
  temp_critical: (d) => `🌡️ *TEMPÉRATURE CRITIQUE*\n\n📍 Parcelle: *${d.parcelName}*\n🔥 Température: *${d.temperature}°C*\n⚡ Action: ${d.action}`,
  pump_on: (d) => `💧 *POMPE ACTIVÉE*\n\n📍 Parcelle: *${d.parcelName}*\n⚡ Déclenchement: ${d.trigger}\n💧 Humidité: ${d.soilHumidity}%`,
  pump_off: (d) => `✅ *POMPE ARRÊTÉE*\n\n📍 Parcelle: *${d.parcelName}*\n💧 Humidité atteinte: *${d.soilHumidity}%*`,
  sensor_offline: (d) => `⚠️ *CAPTEUR HORS LIGNE*\n\n📡 Appareil: *${d.deviceId}*\n📍 Parcelle: ${d.parcelName}\n🕒 Dernière donnée: ${d.lastSeen}\n\nVérifiez la connexion du capteur.`,
  satellite_update: (d) => `🛰️ *NOUVELLE IMAGE SATELLITAIRE*\n\n📍 Parcelle: *${d.parcelName}*\n📅 Date: ${d.date}\n🌿 Indice NDVI: ${d.ndvi || 'N/A'}\n\nConsultez votre tableau de bord.`,
  daily_report: (d) => `📊 *RAPPORT JOURNALIER*\n\n📅 ${d.date}\n📍 ${d.parcelName}\n\n💧 Humidité sol moy.: *${d.avgSoil}%*\n🌡️ Température moy.: *${d.avgTemp}°C*\n💦 Arrosages: ${d.pumpCount} fois\n⚠️ Alertes: ${d.alertCount}\n\nBonne journée agricole ! 🌾`,
  account_validated: (d) => `✅ *COMPTE VALIDÉ*\n\nBonjour *${d.name}*,\n\nVotre compte AgroSmart a été validé par un administrateur.\n\nVous pouvez maintenant créer vos parcelles et ajouter vos capteurs.\n\n🌾 Bonne agriculture connectée !`,
};

const sendWhatsApp = async (to, type, data) => {
  const phone = formatPhone(to);
  if (!phone) {
    console.warn('⚠️  Numéro de téléphone invalide:', to);
    return { success: false, reason: 'Numéro invalide' };
  }

  const templateFn = WA_TEMPLATES[type];
  const body = templateFn ? templateFn(data) : (data.message || '🌾 Notification AgroSmart');

  if (!client) {
    console.log(`[WhatsApp simulé → ${phone}] ${type}:`, body.substring(0, 80));
    return { success: false, simulated: true };
  }

  // Format WhatsApp Twilio sandbox
  const waFrom = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER}`;
  const waTo = `whatsapp:${phone}`;

  try {
    const message = await client.messages.create({ body, from: waFrom, to: waTo });
    console.log(`✅ WhatsApp envoyé à ${phone} [${message.sid}]`);
    return { success: true, sid: message.sid };
  } catch (err) {
    console.error(`❌ WhatsApp Twilio erreur (${phone}):`, err.message);
    // Fallback SMS
    try {
      const sms = await client.messages.create({
        body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
      console.log(`✅ SMS fallback envoyé à ${phone} [${sms.sid}]`);
      return { success: true, sid: sms.sid, fallback: 'sms' };
    } catch (smsErr) {
      console.error(`❌ SMS fallback erreur:`, smsErr.message);
      return { success: false, error: smsErr.message };
    }
  }
};

const sendAlert = async (alertType, data, userPhone) => {
  const phone = userPhone || process.env.ADMIN_PHONE_NUMBER;
  if (!phone) return { success: false, reason: 'Numéro manquant' };
  return sendWhatsApp(phone, alertType, data);
};

const sendDailyReports = async () => {
  try {
    const User = require('../models/User');
    const Parcel = require('../models/Parcel');
    const Measure = require('../models/Measure');
    const Alert = require('../models/Alert');

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const farmers = await User.find({
      isActive: true,
      isValidated: true,
      phone: { $exists: true, $ne: '' },
      'notificationPrefs.daily': true
    });

    for (const farmer of farmers) {
      const parcels = await Parcel.find({ userId: farmer._id });
      for (const parcel of parcels) {
        const measures = await Measure.find({ parcelId: parcel._id, recordedAt: { $gte: since } });
        if (!measures.length) continue;
        const avgSoil = (measures.reduce((s, m) => s + m.soilHumidity, 0) / measures.length).toFixed(1);
        const avgTemp = (measures.reduce((s, m) => s + m.temperature, 0) / measures.length).toFixed(1);
        const pumpCount = measures.filter(m => m.pumpAction === 'on').length;
        const alertCount = await Alert.countDocuments({ parcelId: parcel._id, createdAt: { $gte: since } });
        await sendWhatsApp(farmer.phone, 'daily_report', {
          date: new Date().toLocaleDateString('fr-FR'),
          parcelName: parcel.name, avgSoil, avgTemp, pumpCount, alertCount
        });
      }
    }
  } catch (err) {
    console.error('Erreur rapports journaliers:', err.message);
  }
};

module.exports = { initTwilio, sendAlert, sendWhatsApp, sendDailyReports, WA_TEMPLATES };
