/**
 * Moteur de décision intelligent pour l'irrigation automatique.
 * Analyse les relations entre les mesures et applique des règles métier
 * spécifiques à chaque culture agricole.
 */

const CROP_PROFILES = {
  tomate: {
    soilMin: 50, soilOptimal: 70, soilMax: 85, soilCritical: 30,
    tempThreshold: 28, tempCritical: 38,
    tempFactor: 1.3,
    airHumFactor: 0.85,
    irrigationDuration: 40,
    label: 'Tomate'
  },
  aubergine: {
    soilMin: 40, soilOptimal: 60, soilMax: 80, soilCritical: 25,
    tempThreshold: 30, tempCritical: 40,
    tempFactor: 1.1,
    airHumFactor: 0.9,
    irrigationDuration: 30,
    label: 'Aubergine'
  },
  manioc: {
    soilMin: 25, soilOptimal: 45, soilMax: 70, soilCritical: 15,
    tempThreshold: 32, tempCritical: 43,
    tempFactor: 0.9,
    airHumFactor: 1.0,
    irrigationDuration: 20,
    label: 'Manioc'
  }
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
