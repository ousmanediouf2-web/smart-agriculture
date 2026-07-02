/**
 * Logique partagée de l'assistant AgroSmart.
 * Utilisée à la fois par le chat web (routes/assistant.js) et le bot Telegram
 * (routes/telegramWebhook.js) pour éviter la duplication de code.
 *
 * Répond aux questions ET donne des recommandations/conseils agronomiques
 * basés sur les données réelles de l'utilisateur (pas d'IA externe).
 */

const Measure = require('../models/Measure');
const Sensor = require('../models/Sensor');
const Parcel = require('../models/Parcel');
const Alert = require('../models/Alert');
const { CROP_PROFILES, generateRecommendations } = require('./irrigationEngine');

// Récupère le contexte agricole de l'utilisateur
const getUserContext = async (userId, isAdmin) => {
  const parcelFilter = isAdmin ? {} : { userId };
  const parcels = await Parcel.find(parcelFilter).populate('cropId');
  const parcelIds = parcels.map(p => p._id);

  const sensors = await Sensor.find({ parcelId: { $in: parcelIds } }).populate('parcelId', 'name cropType');
  const sensorIds = sensors.map(s => s._id);

  const recentMeasures = await Measure.find({ sensorId: { $in: sensorIds } })
    .sort({ recordedAt: -1 }).limit(50).populate('parcelId', 'name cropType');

  const unreadAlerts = await Alert.find({ parcelId: { $in: parcelIds }, acknowledged: false })
    .sort({ createdAt: -1 }).limit(10).populate('parcelId', 'name');

  return { parcels, sensors, recentMeasures, unreadAlerts };
};

// Détecte l'intention du message
const detectIntent = (text) => {
  const t = text.toLowerCase().trim();

  // Interactions sociales — détectées avant les intentions techniques
  // pour qu'un "merci" ne tombe jamais dans le cas générique "bonjour"
  if (/^(merci|thanks|thank you|je te remercie|c'est gentil|sympa de ta part)\b/i.test(t) ||
      /\bmerci\b.*(beaucoup|bien|infiniment)?$/i.test(t)) return 'thanks';

  if (/(au revoir|a\s?\+|bye|bonne journ[ée]e|bonne soir[ée]e|à plus tard|à bientôt|je (m'en vais|pars))/i.test(t)) return 'farewell';

  if (/(tu es (trop )?(g[ée]nial|super|excellent|top|fort|intelligent|utile)|bien jou[ée]|bravo|bon travail|tu g[ée]res|impressionnant|tu m'aides bien)/i.test(t)) return 'compliment';

  if (/^(bonjour|salut|bonsoir|coucou|hello|hey|yo|bonne matin[ée]e)\b/i.test(t) ||
      /comment (vas-tu|tu vas|ça va|allez-vous)/i.test(t)) return 'greeting';

  if (/(qui es-tu|tu es qui|tu es quoi|c'est quoi ton nom|tu t'appelles comment|tu es une ia|es-tu humain|es-tu un robot)/i.test(t)) return 'identity';

  if (/(d[ée]sol[ée]|pardon|excuse[- ]moi|sorry)/i.test(t)) return 'apology_received';

  if (/^(ok|oui|d'accord|compris|super|cool|nice|parfait|bien)\.?$/i.test(t)) return 'acknowledgement';

  // Intentions techniques
  if (/(humidité|humidite).*(sol|terre)|sol.*humid/i.test(t)) return 'soil_humidity';
  if (/temp[ée]rature/i.test(t)) return 'temperature';
  if (/conseil|recommand|astuce|comment am[ée]liorer|optimis/i.test(t)) return 'advice';
  if (/alerte|probl[èe]me|erreur/i.test(t)) return 'alerts';
  if (/capteur|esp32|hors ligne|offline|connexion/i.test(t)) return 'sensors';
  if (/parcelle|champ|culture/i.test(t)) return 'parcels';
  if (/pompe|arrosage|irrigation|eau/i.test(t)) return 'irrigation';
  if (/m[ée]t[ée]o|pluie|climat/i.test(t)) return 'weather';
  if (/aide|help|comment|que peux/i.test(t)) return 'help';
  if (/drone|photo|cartograph/i.test(t)) return 'drone';
  return 'unknown';
};

// Pioche une réponse au hasard dans une liste, pour éviter la répétition
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Génère un conseil agronomique contextuel pour une parcelle donnée
const buildAdviceForParcel = (parcel, measures) => {
  const profile = CROP_PROFILES[parcel.cropType] || CROP_PROFILES[parcel.cropId?.name];
  if (!profile || !measures.length) return null;

  const advices = [];
  const avgSoil = measures.reduce((s, m) => s + (m.soilHumidity || 0), 0) / measures.length;
  const avgTemp = measures.reduce((s, m) => s + (m.temperature || 0), 0) / measures.length;
  const avgAir = measures.reduce((s, m) => s + (m.airHumidity || 0), 0) / measures.length;

  if (avgSoil < profile.soilCritical) {
    advices.push(`🚨 Sol en dessous du seuil critique (${avgSoil.toFixed(0)}% < ${profile.soilCritical}%). Augmente la fréquence d'arrosage immédiatement.`);
  } else if (avgSoil < profile.soilMin) {
    advices.push(`💧 Humidité légèrement faible (${avgSoil.toFixed(0)}%). Vérifie le bon fonctionnement de la pompe.`);
  } else if (avgSoil > profile.soilMax) {
    advices.push(`⚠️ Sol potentiellement trop humide (${avgSoil.toFixed(0)}% > ${profile.soilMax}%). Risque de pourriture racinaire — réduis l'arrosage.`);
  } else {
    advices.push(`✅ Humidité du sol dans la plage optimale pour ${profile.label} (${avgSoil.toFixed(0)}%).`);
  }

  if (avgTemp > profile.tempCritical) {
    advices.push(`🌡️ Température critique (${avgTemp.toFixed(0)}°C). Prévois de l'ombrage ou un arrosage en fin de journée pour limiter le stress thermique.`);
  } else if (avgTemp > profile.tempThreshold) {
    advices.push(`🔥 Température élevée (${avgTemp.toFixed(0)}°C). Privilégie les arrosages tôt le matin ou tard le soir pour réduire l'évaporation.`);
  }

  if (avgAir < 30) {
    advices.push(`🍃 Air très sec (${avgAir.toFixed(0)}%). Le paillage du sol peut aider à conserver l'humidité plus longtemps.`);
  }

  return { parcelName: parcel.name, cropLabel: profile.label, advices };
};

// Construit la réponse complète selon l'intention détectée
const detectAndReply = async (user, message) => {
  if (!message || !message.trim()) {
    return "Pose-moi une question sur tes capteurs, parcelles, alertes, l'irrigation, ou demande-moi des conseils ! 🌾";
  }

  const isAdmin = user.role === 'admin';
  const ctx = await getUserContext(user._id, isAdmin);
  const intent = detectIntent(message);

  switch (intent) {
    case 'greeting':
      return pick([
        `Bonjour ${user.name} 👋 Je peux te renseigner sur tes capteurs, te donner des conseils agronomiques, ou t'aider à piloter ton irrigation. Que veux-tu savoir ?`,
        `Salut ${user.name} ! 🌾 Ça va bien de mon côté, prêt à t'aider sur tes parcelles. Une question ?`,
        `Hello ${user.name} 👋 Comment puis-je t'aider aujourd'hui — humidité, alertes, conseils ?`,
      ]);

    case 'thanks':
      return pick([
        "Avec plaisir ! 😊 N'hésite pas si tu as d'autres questions.",
        "De rien ! Je suis là pour ça. 🌱",
        "Content d'avoir pu t'aider ! Dis-moi si tu as besoin d'autre chose.",
      ]);

    case 'farewell':
      return pick([
        "À bientôt ! Prends soin de tes cultures 🌾",
        "Bonne journée ! Je reste disponible si besoin.",
        "À plus tard ! N'oublie pas de vérifier tes alertes de temps en temps 👋",
      ]);

    case 'compliment':
      return pick([
        "Merci, ça me fait plaisir ! 😊 Je fais de mon mieux pour t'aider sur tes parcelles.",
        "C'est gentil, merci ! On continue à bien s'occuper de tes cultures ensemble 🌱",
        "Merci beaucoup ! N'hésite pas si tu as une autre question.",
      ]);

    case 'identity':
      return `Je suis l'assistant AgroSmart 🌾 Un programme qui consulte directement tes données réelles (capteurs, parcelles, alertes) pour te répondre — pas une intelligence artificielle générique. Je suis là pour t'aider à gérer tes cultures plus facilement.`;

    case 'apology_received':
      return pick([
        "Pas de souci, tout va bien ! 😊 Comment puis-je t'aider ?",
        "Aucun problème ! Dis-moi ce dont tu as besoin.",
      ]);

    case 'acknowledgement':
      return pick([
        "Parfait ! Autre chose ?",
        "Super, je reste disponible si besoin 🌱",
        "D'accord ! N'hésite pas à revenir si tu as une question.",
      ]);

    case 'soil_humidity': {
      if (!ctx.recentMeasures.length) {
        return "Je n'ai pas encore de mesure d'humidité du sol enregistrée. Vérifie que tes capteurs sont bien connectés.";
      }
      const byParcel = {};
      ctx.recentMeasures.forEach(m => {
        const name = m.parcelId?.name || 'Parcelle inconnue';
        if (!byParcel[name]) byParcel[name] = m.soilHumidity;
      });
      const lines = Object.entries(byParcel).map(([name, val]) => `📍 *${name}*: ${val}% (dernière mesure)`);
      return `Voici l'humidité du sol actuelle :\n\n${lines.join('\n')}`;
    }

    case 'temperature': {
      if (!ctx.recentMeasures.length) return "Aucune mesure de température disponible pour le moment.";
      const avgTemp = (ctx.recentMeasures.reduce((s, m) => s + m.temperature, 0) / ctx.recentMeasures.length).toFixed(1);
      const last = ctx.recentMeasures[0];
      return `🌡️ Température actuelle : *${last.temperature}°C* sur "${last.parcelId?.name || 'N/A'}".\nMoyenne récente : ${avgTemp}°C.`;
    }

    case 'advice': {
      if (!ctx.parcels.length) return "Crée d'abord une parcelle pour que je puisse te donner des conseils personnalisés.";

      const adviceBlocks = [];
      for (const parcel of ctx.parcels) {
        const parcelMeasures = ctx.recentMeasures.filter(m => String(m.parcelId?._id || m.parcelId) === String(parcel._id));
        const advice = buildAdviceForParcel(parcel, parcelMeasures);
        if (advice) adviceBlocks.push(advice);
      }

      if (!adviceBlocks.length) {
        return "Pas encore assez de données pour te donner des conseils précis. Attends quelques mesures de tes capteurs.";
      }

      const text = adviceBlocks.map(b =>
        `🌾 *${b.parcelName}* (${b.cropLabel})\n${b.advices.map(a => `  ${a}`).join('\n')}`
      ).join('\n\n');

      return `Voici mes conseils pour tes parcelles :\n\n${text}`;
    }

    case 'alerts': {
      if (!ctx.unreadAlerts.length) return "✅ Aucune alerte non lue actuellement. Tout va bien sur tes parcelles !";
      const lines = ctx.unreadAlerts.slice(0, 5).map(a => `⚠️ ${a.parcelId?.name || 'Parcelle'}: ${a.message}`);
      return `Tu as *${ctx.unreadAlerts.length} alerte(s)* non lue(s) :\n\n${lines.join('\n')}\n\nVa sur la page Alertes pour les traiter.`;
    }

    case 'sensors': {
      if (!ctx.sensors.length) return "Tu n'as pas encore de capteur configuré. Ajoute-en un depuis la page Capteurs.";
      const online = ctx.sensors.filter(s => s.lastSeen && (Date.now() - new Date(s.lastSeen).getTime()) < 10 * 60 * 1000);
      const list = ctx.sensors.map(s => `• ${s.name} (${s.deviceId}) — ${s.parcelId?.name || 'non assigné'}`).slice(0, 5).join('\n');
      return `📡 Tu as *${ctx.sensors.length} capteur(s)*, dont *${online.length} en ligne*.\n\n${list}`;
    }

    case 'parcels': {
      if (!ctx.parcels.length) return "Tu n'as pas encore créé de parcelle. Va sur la Carte pour en dessiner une.";
      const list = ctx.parcels.map(p => `• ${p.name} (${p.cropId?.label || p.cropType || 'culture non définie'})`).join('\n');
      return `🌾 Tu as *${ctx.parcels.length} parcelle(s)* :\n\n${list}`;
    }

    case 'irrigation': {
      const lastPump = ctx.recentMeasures.find(m => m.pumpAction);
      const base = lastPump
        ? `💧 Dernière action de pompe : *${lastPump.pumpAction}* sur "${lastPump.parcelId?.name}".`
        : "Je n'ai pas d'historique récent d'irrigation.";
      return `${base}\nL'irrigation est automatique selon les seuils de chaque culture. Tu peux aussi piloter ta pompe directement avec les commandes /on et /off sur Telegram.`;
    }

    case 'weather':
      return "Pour la météo détaillée, consulte le widget sur ton Tableau de bord. Tape /meteo ici pour un résumé rapide de tes mesures récentes.";

    case 'drone':
      return "🚁 Pour la cartographie drone : va dans *Mission Drone*, génère ton plan de vol, uploade tes photos après le vol, et le système créera automatiquement une carte aérienne + indice NDVI.";

    case 'help':
      return `Je peux t'aider sur :\n\n🌱 Humidité du sol et température\n💡 Conseils et recommandations agronomiques\n📡 État de tes capteurs\n🌾 Tes parcelles et cultures\n⚠️ Alertes en cours\n💧 Irrigation et pilotage pompe (/on /off sur Telegram)\n🚁 Cartographie drone\n\nTu peux aussi simplement discuter avec moi — me dire bonjour, merci, ou poser une question en langage naturel !`;

    default:
      return "Je n'ai pas bien compris 🤔. Essaie : \"Quelle est l'humidité du sol ?\", \"Donne-moi des conseils\", \"Y a-t-il des alertes ?\" ou tape /aide.";
  }
};

module.exports = { detectAndReply, detectIntent, getUserContext, buildAdviceForParcel };
