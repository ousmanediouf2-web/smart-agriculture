// Traduction des statuts de parcelle pour l'affichage. Les valeurs restent
// en anglais en base (modèle Parcel) pour ne rien casser côté backend —
// seul l'affichage est traduit ici, à un seul endroit pour tout le site.
export const PARCEL_STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  dry: 'Sec',
  optimal: 'Optimal',
  wet: 'Humide'
};

export const getParcelStatusLabel = (status) => PARCEL_STATUS_LABELS[status] || status;

// Idem pour le mode de la pompe (auto/manual), affiché sur les pages capteurs.
export const PUMP_MODE_LABELS = {
  auto: 'Automatique',
  manual: 'Manuel'
};

export const getPumpModeLabel = (mode) => PUMP_MODE_LABELS[mode] || mode;

// Traduction des types et priorités d'alerte (valeurs stockées en BD en
// anglais dans le modèle Alert — seul l'affichage est traduit ici).
export const ALERT_TYPE_LABELS = {
  soil_dry: 'Sol sec',
  soil_wet: 'Sol détrempé',
  temp_critical: 'Température critique',
  pump_on: 'Pompe activée',
  pump_off: 'Pompe arrêtée',
  sensor_offline: 'Capteur hors ligne',
  no_data: 'Pas de données',
  system_error: 'Erreur système',
  humidity_danger: 'Humidité dangereuse'
};

export const getAlertTypeLabel = (type) => ALERT_TYPE_LABELS[type] || (type || '').replace(/_/g, ' ');

export const ALERT_PRIORITY_LABELS = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Élevée',
  critical: 'Critique'
};

export const getAlertPriorityLabel = (priority) => ALERT_PRIORITY_LABELS[priority] || priority;
