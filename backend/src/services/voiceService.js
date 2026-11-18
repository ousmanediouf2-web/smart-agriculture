/**
 * Vocal des alertes Telegram.
 *
 * PRIORITÉ 1 — votre propre enregistrement : déposez un fichier nommé
 *   sol-critique.ogg  (ou .opus, .mp3, .m4a)
 * dans backend/assets/voice/ . Il est envoyé tel quel à chaque alerte « sol critique ».
 *
 * PRIORITÉ 2 (si aucun fichier n'est présent) — synthèse vocale automatique :
 *
 * Deux modes, choisis automatiquement :
 *  1. GOOGLE_TTS_API_KEY défini → Google Cloud Text-to-Speech (officiel, voix de qualité,
 *     sortie OGG/Opus : s'affiche comme un vrai message vocal Telegram).
 *     Palier gratuit : 4 millions de caractères/mois en voix « Standard »
 *     (un compte de facturation Google Cloud doit être activé).
 *  2. Sinon → service gratuit de Google Translate (non officiel, sans clé, MP3) envoyé
 *     comme fichier audio. Pratique pour démarrer, mais pas garanti dans la durée.
 */

const fs = require('fs');
const path = require('path');

const VOICE_DIR = process.env.VOICE_DIR || path.join(__dirname, '..', '..', 'assets', 'voice');
const CUSTOM_FORMATS = {
  '.ogg':  { mime: 'audio/ogg',  kind: 'voice' },
  '.opus': { mime: 'audio/ogg',  kind: 'voice' },
  '.mp3':  { mime: 'audio/mpeg', kind: 'voice' },
  '.m4a':  { mime: 'audio/mp4',  kind: 'voice' }
};
const MAX_CUSTOM_BYTES = 20 * 1024 * 1024; // Telegram accepte jusqu'à 50 Mo ; on reste prudent

/** Charge l'enregistrement personnalisé « sol-critique.* » s'il existe (relu à chaque envoi) */
const loadCustomVoice = (name = 'sol-critique') => {
  for (const [ext, fmt] of Object.entries(CUSTOM_FORMATS)) {
    const file = path.join(VOICE_DIR, `${name}${ext}`);
    try {
      if (!fs.existsSync(file)) continue;
      const buffer = fs.readFileSync(file);
      if (buffer.length === 0) { console.warn(`⚠️  ${name}${ext} est vide, ignoré`); continue; }
      if (buffer.length > MAX_CUSTOM_BYTES) { console.warn(`⚠️  ${name}${ext} dépasse 20 Mo, ignoré`); continue; }
      return { buffer, kind: fmt.kind, mime: fmt.mime, filename: `${name}${ext}`, custom: true };
    } catch (err) {
      console.error(`⚠️  Lecture de ${file} impossible :`, err.message);
    }
  }
  return null;
};

const TTS_VOICE = process.env.GOOGLE_TTS_VOICE || 'fr-FR-Standard-A';

// Nettoie un nom saisi par l'utilisateur pour qu'il soit lisible à voix haute
const speakable = (value, fallback = 'sans nom') => {
  const cleaned = String(value ?? '').replace(/[^\p{L}\p{N}\s'’-]/gu, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 40) || fallback;
};

const round = (n) => (Number.isFinite(Number(n)) ? Math.round(Number(n)) : null);

/** Texte lu dans le message vocal quand le sol est critique */
const buildSoilCriticalScript = ({ parcelName, soilHumidity, threshold, pumpActivated = true }) => {
  const soil = round(soilHumidity);
  const thr = round(threshold);
  // Texte volontairement court (< 200 caractères avec un nom de parcelle moyen) :
  // le mode gratuit refuse les textes plus longs.
  const parts = [`Alerte AgroSmart. Sol critique sur la parcelle ${speakable(parcelName)}.`];
  if (soil !== null) parts.push(`Humidité du sol : ${soil} pour cent${thr !== null ? `, seuil critique : ${thr} pour cent` : ''}.`);
  parts.push(pumpActivated ? 'La pompe est activée. Vérifiez la parcelle.' : 'Vérifiez la parcelle.');
  return parts.join(' ');
};

const synthGoogleCloud = async (text) => {
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(process.env.GOOGLE_TTS_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'fr-FR', name: TTS_VOICE },
      audioConfig: { audioEncoding: 'OGG_OPUS', speakingRate: 0.95 }
    }),
    signal: AbortSignal.timeout(15000)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.audioContent) {
    throw new Error(`Google TTS ${res.status} ${json?.error?.message || ''}`.trim());
  }
  return { buffer: Buffer.from(json.audioContent, 'base64'), kind: 'voice', mime: 'audio/ogg', filename: 'alerte.ogg' };
};

const synthTranslateFree = async (text) => {
  // Ce service limite le texte à ~200 caractères par requête
  const short = text.length > 200 ? `${text.slice(0, 197)}…` : text;
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=fr&q=${encodeURIComponent(short)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgroSmart/1.0)' },
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`Translate TTS ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 500) throw new Error('Audio vide reçu du service de synthèse');
  return { buffer, kind: 'audio', mime: 'audio/mpeg', filename: 'alerte.mp3' };
};

/** Convertit un texte en audio ; lève une erreur si tous les modes échouent */
const synthesize = async (text) => {
  if (process.env.GOOGLE_TTS_API_KEY) {
    try { return await synthGoogleCloud(text); }
    catch (err) { console.error('⚠️  Google Cloud TTS indisponible, repli sur le mode gratuit :', err.message); }
  }
  return synthTranslateFree(text);
};

module.exports = { buildSoilCriticalScript, synthesize, loadCustomVoice };
