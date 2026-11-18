/**
 * Moteur de décision intelligent pour l'irrigation automatique.
 * Analyse les relations entre les mesures et applique des règles métier
 * spécifiques à chaque culture agricole.
 */

const CROP_PROFILES = {
  // ── Légumes et cultures maraîchères ──────────────────────────────────────
  tomate:       { soilMin: 50, soilOptimal: 70, soilMax: 85, soilCritical: 30, tempThreshold: 28, tempCritical: 38, tempFactor: 1.30, airHumFactor: 0.85, irrigationDuration: 40, label: 'Tomate' },
  aubergine:    { soilMin: 40, soilOptimal: 60, soilMax: 80, soilCritical: 25, tempThreshold: 30, tempCritical: 40, tempFactor: 1.10, airHumFactor: 0.90, irrigationDuration: 30, label: 'Aubergine' },
  piment:       { soilMin: 45, soilOptimal: 65, soilMax: 80, soilCritical: 28, tempThreshold: 28, tempCritical: 38, tempFactor: 1.20, airHumFactor: 0.88, irrigationDuration: 30, label: 'Piment' },
  oignon:       { soilMin: 40, soilOptimal: 60, soilMax: 75, soilCritical: 25, tempThreshold: 24, tempCritical: 35, tempFactor: 1.10, airHumFactor: 0.92, irrigationDuration: 25, label: 'Oignon' },
  gombo:        { soilMin: 40, soilOptimal: 60, soilMax: 78, soilCritical: 22, tempThreshold: 32, tempCritical: 42, tempFactor: 0.90, airHumFactor: 0.95, irrigationDuration: 30, label: 'Gombo' },
  concombre:    { soilMin: 55, soilOptimal: 72, soilMax: 85, soilCritical: 35, tempThreshold: 28, tempCritical: 38, tempFactor: 1.25, airHumFactor: 0.82, irrigationDuration: 35, label: 'Concombre' },
  chou:         { soilMin: 55, soilOptimal: 72, soilMax: 85, soilCritical: 35, tempThreshold: 20, tempCritical: 30, tempFactor: 1.30, airHumFactor: 0.80, irrigationDuration: 35, label: 'Chou' },
  laitue:       { soilMin: 55, soilOptimal: 75, soilMax: 88, soilCritical: 38, tempThreshold: 20, tempCritical: 28, tempFactor: 1.35, airHumFactor: 0.78, irrigationDuration: 35, label: 'Laitue' },
  carotte:      { soilMin: 45, soilOptimal: 65, soilMax: 80, soilCritical: 28, tempThreshold: 20, tempCritical: 30, tempFactor: 1.15, airHumFactor: 0.90, irrigationDuration: 28, label: 'Carotte' },
  haricot:      { soilMin: 40, soilOptimal: 60, soilMax: 78, soilCritical: 25, tempThreshold: 26, tempCritical: 36, tempFactor: 1.10, airHumFactor: 0.90, irrigationDuration: 28, label: 'Haricot vert' },
  poivron:      { soilMin: 45, soilOptimal: 65, soilMax: 80, soilCritical: 28, tempThreshold: 28, tempCritical: 38, tempFactor: 1.20, airHumFactor: 0.88, irrigationDuration: 30, label: 'Poivron' },
  pastèque:     { soilMin: 35, soilOptimal: 55, soilMax: 75, soilCritical: 20, tempThreshold: 32, tempCritical: 43, tempFactor: 0.95, airHumFactor: 0.95, irrigationDuration: 25, label: 'Pastèque' },
  melon:        { soilMin: 35, soilOptimal: 55, soilMax: 75, soilCritical: 20, tempThreshold: 30, tempCritical: 42, tempFactor: 1.00, airHumFactor: 0.95, irrigationDuration: 25, label: 'Melon' },

  // ── Céréales et tubercules ───────────────────────────────────────────────
  manioc:       { soilMin: 25, soilOptimal: 45, soilMax: 70, soilCritical: 15, tempThreshold: 32, tempCritical: 43, tempFactor: 0.90, airHumFactor: 1.00, irrigationDuration: 20, label: 'Manioc' },
  mil:          { soilMin: 20, soilOptimal: 40, soilMax: 65, soilCritical: 12, tempThreshold: 35, tempCritical: 44, tempFactor: 0.80, airHumFactor: 1.05, irrigationDuration: 18, label: 'Mil' },
  sorgho:       { soilMin: 22, soilOptimal: 42, soilMax: 65, soilCritical: 13, tempThreshold: 34, tempCritical: 44, tempFactor: 0.82, airHumFactor: 1.05, irrigationDuration: 18, label: 'Sorgho' },
  maïs:         { soilMin: 40, soilOptimal: 60, soilMax: 80, soilCritical: 25, tempThreshold: 30, tempCritical: 41, tempFactor: 1.00, airHumFactor: 0.90, irrigationDuration: 30, label: 'Maïs' },
  riz:          { soilMin: 70, soilOptimal: 85, soilMax: 95, soilCritical: 55, tempThreshold: 30, tempCritical: 40, tempFactor: 1.00, airHumFactor: 0.75, irrigationDuration: 50, label: 'Riz' },
  patate_douce: { soilMin: 35, soilOptimal: 55, soilMax: 75, soilCritical: 20, tempThreshold: 30, tempCritical: 41, tempFactor: 1.00, airHumFactor: 0.95, irrigationDuration: 25, label: 'Patate douce' },
  igname:       { soilMin: 40, soilOptimal: 60, soilMax: 78, soilCritical: 25, tempThreshold: 32, tempCritical: 42, tempFactor: 0.95, airHumFactor: 0.92, irrigationDuration: 28, label: 'Igname' },
  niébé:        { soilMin: 25, soilOptimal: 45, soilMax: 65, soilCritical: 15, tempThreshold: 32, tempCritical: 43, tempFactor: 0.88, airHumFactor: 1.00, irrigationDuration: 20, label: 'Niébé' },
  arachide:     { soilMin: 35, soilOptimal: 55, soilMax: 72, soilCritical: 20, tempThreshold: 30, tempCritical: 41, tempFactor: 0.95, airHumFactor: 0.95, irrigationDuration: 22, label: 'Arachide' },
  fonio:        { soilMin: 18, soilOptimal: 38, soilMax: 60, soilCritical: 10, tempThreshold: 32, tempCritical: 43, tempFactor: 0.85, airHumFactor: 1.05, irrigationDuration: 15, label: 'Fonio' },

  // ── Cultures de rente ────────────────────────────────────────────────────
  canne_sucre:  { soilMin: 55, soilOptimal: 72, soilMax: 88, soilCritical: 35, tempThreshold: 32, tempCritical: 42, tempFactor: 1.00, airHumFactor: 0.82, irrigationDuration: 50, label: 'Canne à sucre' },
  coton:        { soilMin: 35, soilOptimal: 55, soilMax: 75, soilCritical: 20, tempThreshold: 32, tempCritical: 42, tempFactor: 0.95, airHumFactor: 0.95, irrigationDuration: 28, label: 'Coton' },

  // ── Fruits ───────────────────────────────────────────────────────────────
  banane:       { soilMin: 55, soilOptimal: 75, soilMax: 88, soilCritical: 38, tempThreshold: 28, tempCritical: 40, tempFactor: 1.20, airHumFactor: 0.80, irrigationDuration: 45, label: 'Banane' },
  papaye:       { soilMin: 40, soilOptimal: 60, soilMax: 78, soilCritical: 25, tempThreshold: 30, tempCritical: 42, tempFactor: 1.00, airHumFactor: 0.90, irrigationDuration: 30, label: 'Papaye' },
  mangue:       { soilMin: 30, soilOptimal: 50, soilMax: 70, soilCritical: 18, tempThreshold: 33, tempCritical: 44, tempFactor: 0.88, airHumFactor: 1.00, irrigationDuration: 22, label: 'Mangue' },
  ananas:       { soilMin: 40, soilOptimal: 58, soilMax: 75, soilCritical: 25, tempThreshold: 30, tempCritical: 42, tempFactor: 0.95, airHumFactor: 0.92, irrigationDuration: 28, label: 'Ananas' },
  goyave:       { soilMin: 30, soilOptimal: 50, soilMax: 70, soilCritical: 18, tempThreshold: 30, tempCritical: 42, tempFactor: 0.92, airHumFactor: 1.00, irrigationDuration: 22, label: 'Goyave' },
};

/**
 * Analyse le besoin en irrigation selon les mesures et la culture.
 * @param {object} measure - { soilHumidity, temperature, airHumidity }
 * @param {string} cropType - 'tomate' | 'aubergine' | 'manioc'
 * @param {boolean} currentPumpState - état actuel de la pompe
 * @returns {object} Décision d'irrigation complète
 */
function analyzeIrrigationNeed(measure, cropType, currentPumpState = false) {
  const profile = CROP_PROFILES[cropType];
  if (!profile) {
    return { shouldIrrigate: false, reason: 'Culture inconnue', urgency: 'none', adjustedThreshold: 40 };
  }

  const { soilHumidity, temperature, airHumidity } = measure;
  const reasons = [];

  // --- Calcul du seuil ajusté par les conditions ---
  let adjustedMin = profile.soilMin;

  // Température élevée → besoin en eau augmente
  if (temperature > profile.tempThreshold) {
    const tempBonus = (temperature - profile.tempThreshold) * 0.6 * profile.tempFactor;
    adjustedMin += tempBonus;
    reasons.push(`Temp élevée (${temperature.toFixed(1)}°C) +${tempBonus.toFixed(1)}%`);
  }

  // Stress thermique critique
  if (temperature >= profile.tempCritical) {
    adjustedMin += 10;
    reasons.push(`Stress thermique critique`);
  }

  // Humidité air élevée → besoin réduit
  if (airHumidity > 70) {
    const airBonus = (airHumidity - 70) * 0.15 * (2 - profile.airHumFactor);
    adjustedMin -= airBonus;
    reasons.push(`Air humide (${airHumidity.toFixed(1)}%) -${airBonus.toFixed(1)}%`);
  }

  // Air très sec → besoin augmenté
  if (airHumidity < 30) {
    adjustedMin += 6;
    reasons.push(`Air très sec (${airHumidity.toFixed(1)}%)`);
  }

  // Borner le seuil entre critique et optimal
  adjustedMin = Math.max(profile.soilCritical, Math.min(adjustedMin, profile.soilOptimal - 5));

  // --- Décision ---
  let shouldIrrigate = false;
  let urgency = 'none';
  let action = 'none';
  let mainReason = '';

  if (soilHumidity >= profile.soilMax) {
    // Sol déjà trop humide → arrêter si pompe active
    shouldIrrigate = false;
    urgency = 'none';
    mainReason = `Sol saturé (${soilHumidity.toFixed(1)}% ≥ ${profile.soilMax}%), pas d'arrosage`;
    if (currentPumpState) action = 'off';
  } else if (soilHumidity <= profile.soilCritical) {
    shouldIrrigate = true;
    urgency = 'critical';
    action = 'on';
    mainReason = `⚠️ Sol en état CRITIQUE (${soilHumidity.toFixed(1)}% ≤ ${profile.soilCritical}%)`;
  } else if (soilHumidity < adjustedMin) {
    shouldIrrigate = true;
    const deficit = adjustedMin - soilHumidity;
    urgency = deficit > 15 ? 'high' : deficit > 7 ? 'medium' : 'low';
    action = 'on';
    mainReason = `Humidité insuffisante (${soilHumidity.toFixed(1)}% < seuil ${adjustedMin.toFixed(1)}%)`;
  } else if (currentPumpState && soilHumidity >= profile.soilOptimal) {
    // Pompe active mais sol déjà optimal → arrêter
    shouldIrrigate = false;
    action = 'off';
    urgency = 'none';
    mainReason = `Sol atteint niveau optimal (${soilHumidity.toFixed(1)}%), arrêt pompe`;
  }

  return {
    shouldIrrigate,
    action,
    urgency,
    adjustedThreshold: parseFloat(adjustedMin.toFixed(1)),
    reason: mainReason,
    details: reasons,
    profile: {
      cropLabel: profile.label,
      soilCritical: profile.soilCritical,
      soilOptimal: profile.soilOptimal,
      irrigationDuration: profile.irrigationDuration
    }
  };
}

/**
 * Génère des recommandations d'optimisation pour une parcelle.
 */
function generateRecommendations(measures, cropType) {
  if (!measures || measures.length === 0) return [];

  const profile = CROP_PROFILES[cropType];
  if (!profile) return [];

  const recommendations = [];
  const latest = measures[0];
  const avgSoil = measures.reduce((s, m) => s + (m.soilHumidity || 0), 0) / measures.length;
  const avgTemp = measures.reduce((s, m) => s + (m.temperature || 0), 0) / measures.length;

  if (avgSoil < profile.soilMin * 0.9) {
    recommendations.push({
      type: 'warning',
      message: `Humidité sol moyenne faible (${avgSoil.toFixed(1)}%). Augmentez la fréquence d'arrosage.`
    });
  }

  if (avgTemp > profile.tempThreshold + 5) {
    recommendations.push({
      type: 'info',
      message: `Température élevée détectée (${avgTemp.toFixed(1)}°C). Arrosage aux heures fraîches recommandé.`
    });
  }

  const pumpActivations = measures.filter(m => m.pumpActivated).length;
  const pumpRate = (pumpActivations / measures.length) * 100;
  if (pumpRate > 60) {
    recommendations.push({
      type: 'warning',
      message: `Pompe active ${pumpRate.toFixed(0)}% du temps. Vérifiez les seuils ou l'état du sol.`
    });
  }

  return recommendations;
}

module.exports = { analyzeIrrigationNeed, generateRecommendations, CROP_PROFILES };
