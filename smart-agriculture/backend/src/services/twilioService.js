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
    console.warn('⚠️  Variables Twilio manquantes, SMS désactivés');
  }
};

const SMS_TEMPLATES = {
  soil_dry: (data) => `🌱 ALERTE SÉCHERESSE\nParcelle: ${data.parcelName}\nCulture: ${data.cropType}\nHumidité sol: ${data.soilHumidity}%\nSeuil: ${data.threshold}%\nPompe activée automatiquement.`,
  soil_wet: (data) => `💧 ALERTE EXCÈS EAU\nParcelle: ${data.parcelName}\nHumidité sol: ${data.soilHumidity}% (trop élevé)\nArrosage suspendu.`,
  temp_critical: (data) => `🌡️ TEMPÉRATURE CRITIQUE\nParcelle: ${data.parcelName}\nTempérature: ${data.temperature}°C\nAction: ${data.action}`,
  pump_on: (data) => `💧 POMPE ACTIVÉE\nParcelle: ${data.parcelName}\nDéclenchement: ${data.trigger}\nHumidité: ${data.soilHumidity}%`,
  pump_off: (data) => `✅ POMPE ARRÊTÉE\nParcelle: ${data.parcelName}\nHumidité atteinte: ${data.soilHumidity}%`,
  sensor_offline: (data) => `⚠️ CAPTEUR HORS LIGNE\nAppareil: ${data.deviceId}\nParcelle: ${data.parcelName}\nDernière donnée: ${data.lastSeen}`,
  no_data: (data) => `📡 AUCUNE DONNÉE\nCapteur ${data.deviceId} n'a pas envoyé de données depuis ${data.duration} minutes.`,
  humidity_danger: (data) => `🚨 HUMIDITÉ DANGEREUSE\nParcelle: ${data.parcelName}\nHumidité air: ${data.airHumidity}%\nRisque de maladies fongiques.`
};

const sendSMS = async (to, type, data) => {
  if (!client) {
    console.log(`[SMS simulé] → ${to}: ${type}`, data);
    return { success: false, simulated: true };
  }

  try {
    const templateFn = SMS_TEMPLATES[type];
    const body = templateFn ? templateFn(data) : data.message || 'Alerte Smart Agriculture';

    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });

    console.log(`✅ SMS envoyé à ${to}: ${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (err) {
    console.error('❌ Erreur SMS Twilio:', err.message);
    return { success: false, error: err.message };
  }
};

const sendAlert = async (alertType, data, userPhone) => {
  const phone = userPhone || process.env.ADMIN_PHONE_NUMBER;
  if (!phone) return { success: false, reason: 'Numéro de téléphone manquant' };
  return sendSMS(phone, alertType, data);
};

module.exports = { initTwilio, sendAlert, sendSMS };
