const { Parser } = require('json2csv');

const exportMeasuresToCSV = (measures) => {
  const fields = [
    { label: 'Date', value: row => new Date(row.recordedAt).toLocaleString('fr-FR') },
    { label: 'Capteur ID', value: 'sensorId' },
    { label: 'Parcelle', value: 'parcelId' },
    { label: 'Culture', value: 'cropType' },
    { label: 'Humidité Sol (%)', value: 'soilHumidity' },
    { label: 'Température (°C)', value: 'temperature' },
    { label: 'Humidité Air (%)', value: 'airHumidity' },
    { label: 'Latitude', value: row => row.location?.coordinates?.[1] || '' },
    { label: 'Longitude', value: row => row.location?.coordinates?.[0] || '' },
    { label: 'Pompe Activée', value: row => row.pumpActivated ? 'Oui' : 'Non' },
    { label: 'Décision', value: 'decision' },
    { label: 'Urgence', value: 'urgency' }
  ];

  const parser = new Parser({ fields, delimiter: ';' });
  return parser.parse(measures);
};

const exportAlertsToCSV = (alerts) => {
  const fields = [
    { label: 'Date', value: row => new Date(row.createdAt).toLocaleString('fr-FR') },
    { label: 'Type', value: 'type' },
    { label: 'Message', value: 'message' },
    { label: 'Priorité', value: 'priority' },
    { label: 'SMS Envoyé', value: row => row.smsSent ? 'Oui' : 'Non' },
    { label: 'Acquitté', value: row => row.acknowledged ? 'Oui' : 'Non' }
  ];

  const parser = new Parser({ fields, delimiter: ';' });
  return parser.parse(alerts);
};

module.exports = { exportMeasuresToCSV, exportAlertsToCSV };
