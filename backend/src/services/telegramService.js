/**
 * Service de notifications Telegram — gratuit, illimité, sans sandbox
 *
 * Configuration (2 étapes, 2 minutes) :
 * 1. Ouvrir Telegram → chercher "@BotFather" → envoyer /newbot → suivre les instructions
 *    BotFather donne un token type: 123456789:ABCdefGhIJKlmNoPQRstuVWXyz
 *    → mettre ce token dans TELEGRAM_BOT_TOKEN (variable d'environnement Render)
 *
 * 2. Chaque agriculteur doit récupérer son "chat_id" :
 *    - Ouvrir Telegram → chercher le bot créé (ex: @AgroSmartBot) → cliquer "Démarrer" / envoyer /start
 *    - Aller sur https://api.telegram.org/bot<TOKEN>/getUpdates dans un navigateur
 *    - Chercher "chat":{"id": XXXXXXXXX} → ce nombre est le chat_id
 *    - L'agriculteur colle ce chat_id dans son profil AgroSmart (page Paramètres)
 *
 * Avantages vs Twilio :
 * - 100% gratuit, sans limite de messages
 * - Pas de sandbox à rejoindre manuellement
 * - Pas de carte bancaire requise
 * - Fonctionne immédiatement après création du bot
 */

let botToken = null;

const initTelegram = () => {
  botToken = process.env.TELEGRAM_BOT_TOKEN || null;
  if (botToken) {
    console.log('✅ Telegram Bot initialisé');
  } else {
    console.warn('⚠️  TELEGRAM_BOT_TOKEN manquant, notifications désactivées');
  }
};

// Templates de messages (Markdown Telegram = *gras*, _italique_)
const MSG_TEMPLATES = {
  soil_dry: (d) => `🌱 *ALERTE SÉCHERESSE*\n\n📍 Parcelle: *${d.parcelName}*\n🌿 Culture: ${d.cropType}\n💧 Humidité sol: *${d.soilHumidity}%* (seuil: ${d.threshold}%)\n🌡️ Température: ${d.temperature}°C\n\n✅ Pompe activée automatiquement.`,
  soil_wet: (d) => `💧 *ALERTE EXCÈS EAU*\n\n📍 Parcelle: *${d.parcelName}*\n💦 Humidité sol: *${d.soilHumidity}%*\n\n⛔ Arrosage suspendu automatiquement.`,
  temp_critical: (d) => `🌡️ *TEMPÉRATURE CRITIQUE*\n\n📍 Parcelle: *${d.parcelName}*\n🔥 Température: *${d.temperature}°C*\n⚡ Action: ${d.action}`,
  pump_on: (d) => `💧 *POMPE ACTIVÉE*\n\n📍 Parcelle: *${d.parcelName}*\n⚡ Déclenchement: ${d.trigger}\n💧 Humidité: ${d.soilHumidity}%`,
  pump_off: (d) => `✅ *POMPE ARRÊTÉE*\n\n📍 Parcelle: *${d.parcelName}*\n💧 Humidité atteinte: *${d.soilHumidity}%*`,
  sensor_offline: (d) => `⚠️ *CAPTEUR HORS LIGNE*\n\n📡 Appareil: *${d.deviceId}*\n📍 Parcelle: ${d.parcelName}\n🕒 Dernière donnée: ${d.lastSeen}\n\nVérifiez la connexion du capteur.`,
  satellite_update: (d) => `🛰️ *NOUVELLE IMAGE SATELLITAIRE*\n\n📍 Parcelle: *${d.parcelName}*\n📅 Date: ${d.date}\n🌿 Indice NDVI: ${d.ndvi || 'N/A'}\n\nConsultez votre tableau de bord.`,
  daily_report: (d) => `📊 *RAPPORT JOURNALIER*\n\n📅 ${d.date}\n📍 ${d.parcelName}\n\n💧 Humidité sol moy.: *${d.avgSoil}%*\n🌡️ Température moy.: *${d.avgTemp}°C*\n💦 Arrosages: ${d.pumpCount} fois\n⚠️ Alertes: ${d.alertCount}\n\nBonne journée agricole ! 🌾`,
  account_validated: (d) => `✅ *COMPTE VALIDÉ*\n\nBonjour *${d.name}*,\n\nVotre compte AgroSmart a été validé par un administrateur.\n\nVous pouvez maintenant créer vos parcelles et ajouter vos capteurs.\n\n🌾 Bonne agriculture connectée !`,
  raw: (d) => d.message, // message libre, déjà formaté (utilisé par le webhook de commandes)
};

/**
 * Envoie un message Telegram à un chat_id donné
 * @param {string} chatId - L'identifiant de chat Telegram de l'utilisateur
 * @param {string} type - Le type de message (clé de MSG_TEMPLATES)
 * @param {object} data - Les données à injecter dans le template
 */
const sendTelegram = async (chatId, type, data) => {
  if (!chatId) {
    console.warn('⚠️  Chat ID Telegram manquant');
    return { success: false, reason: 'Chat ID manquant' };
  }

  const templateFn = MSG_TEMPLATES[type];
  const messageBody = templateFn ? templateFn(data) : (data.message || '🌾 Notification AgroSmart');

  if (!botToken) {
    console.log(`[Telegram simulé → ${chatId}] ${type}:`, messageBody.substring(0, 80));
    return { success: false, simulated: true };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageBody,
        parse_mode: 'Markdown'
      })
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseErr) {
      console.error(`❌ Telegram réponse non-JSON (${chatId}):`, responseText.substring(0, 300));
      return { success: false, error: 'Réponse invalide de Telegram' };
    }

    if (result.ok) {
      console.log(`✅ Telegram envoyé à ${chatId} [msg_id: ${result.result.message_id}]`);
      return { success: true, messageId: result.result.message_id };
    } else {
      console.error(`❌ Telegram erreur (${chatId}):`, result.description);
      return { success: false, error: result.description };
    }
  } catch (err) {
    console.error(`❌ Telegram exception (${chatId}):`, err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Envoie une alerte au numéro/chat_id admin par défaut, ou à celui fourni
 */
const sendAlert = async (alertType, data, userChatId) => {
  const chatId = userChatId || process.env.ADMIN_TELEGRAM_CHAT_ID;
  if (!chatId) return { success: false, reason: 'Chat ID manquant' };
  return sendTelegram(chatId, alertType, data);
};

/**
 * Envoie les rapports journaliers à tous les agriculteurs validés ayant
 * activé cette préférence et configuré leur chat_id Telegram
 */
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
      telegramChatId: { $exists: true, $ne: '' },
      'notificationPrefs.daily': true
    });

    console.log(`📊 Rapport journalier: ${farmers.length} agriculteur(s) éligible(s) (daily=true + telegramChatId configuré)`);

    for (const farmer of farmers) {
      const parcels = await Parcel.find({ userId: farmer._id });
      console.log(`📊 ${farmer.name}: ${parcels.length} parcelle(s) à traiter`);
      for (const parcel of parcels) {
        const measures = await Measure.find({ parcelId: parcel._id, recordedAt: { $gte: since } });
        if (!measures.length) {
          console.log(`⏭️  ${parcel.name}: aucune mesure dans les 24h, rapport ignoré`);
          continue;
        }
        const avgSoil = (measures.reduce((s, m) => s + m.soilHumidity, 0) / measures.length).toFixed(1);
        const avgTemp = (measures.reduce((s, m) => s + m.temperature, 0) / measures.length).toFixed(1);
        const pumpCount = measures.filter(m => m.pumpAction === 'on').length;
        const alertCount = await Alert.countDocuments({ parcelId: parcel._id, createdAt: { $gte: since } });
        console.log(`📤 Envoi rapport journalier à ${farmer.name} pour ${parcel.name}`);
        await sendTelegram(farmer.telegramChatId, 'daily_report', {
          date: new Date().toLocaleDateString('fr-FR'),
          parcelName: parcel.name, avgSoil, avgTemp, pumpCount, alertCount
        });
      }
    }
  } catch (err) {
    console.error('Erreur rapports journaliers Telegram:', err.message);
  }
};

/**
 * Envoie un fichier (document) à un chat_id Telegram donné
 * @param {string} chatId
 * @param {Buffer} fileBuffer - contenu du fichier
 * @param {string} filename - nom du fichier (avec extension)
 * @param {string} caption - légende optionnelle au-dessus du fichier
 */
const sendDocument = async (chatId, fileBuffer, filename, caption = '') => {
  if (!chatId) return { success: false, reason: 'Chat ID manquant' };
  if (!botToken) {
    console.log(`[Telegram simulé → ${chatId}] Document: ${filename}`);
    return { success: false, simulated: true };
  }

  try {
    // Utiliser le FormData natif de Node (compatible avec fetch natif)
    const form = new FormData();
    form.append('chat_id', String(chatId));
    const blob = new Blob([fileBuffer], { type: 'text/csv' });
    form.append('document', blob, filename);
    if (caption) {
      form.append('caption', caption);
      form.append('parse_mode', 'Markdown');
    }

    const url = `https://api.telegram.org/bot${botToken}/sendDocument`;
    const response = await fetch(url, { method: 'POST', body: form });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseErr) {
      console.error(`❌ Telegram réponse non-JSON (${chatId}):`, responseText.substring(0, 300));
      return { success: false, error: 'Réponse invalide de Telegram' };
    }

    if (result.ok) {
      console.log(`✅ Document Telegram envoyé à ${chatId}: ${filename}`);
      return { success: true, messageId: result.result.message_id };
    } else {
      console.error(`❌ Telegram sendDocument erreur (${chatId}):`, result.description);
      return { success: false, error: result.description };
    }
  } catch (err) {
    console.error(`❌ Telegram sendDocument exception (${chatId}):`, err.message);
    return { success: false, error: err.message };
  }
};

module.exports = {
  initTelegram,
  sendAlert,
  sendTelegram,
  sendDocument,
  // Alias pour compatibilité avec le code existant (sendWhatsApp -> sendTelegram)
  sendWhatsApp: sendTelegram,
  sendDailyReports,
  MSG_TEMPLATES
};
