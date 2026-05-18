require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const connectDB = require('./db');

const Crop = require('../models/Crop');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const crops = [
  {
    name: 'tomate',
    label: 'Tomate',
    color: '#ef4444',
    soilHumidity: { min: 50, optimal: 70, max: 85, critical: 30 },
    temperature: { min: 15, optimal: 25, max: 35, critical: 40 },
    airHumidityFactor: 0.85,
    irrigationDuration: 40,
    waterNeed: 'élevé',
    description: 'Culture exigeante en eau, surtout pendant la fructification.'
  },
  {
    name: 'aubergine',
    label: 'Aubergine',
    color: '#8b5cf6',
    soilHumidity: { min: 40, optimal: 60, max: 80, critical: 25 },
    temperature: { min: 18, optimal: 28, max: 38, critical: 42 },
    airHumidityFactor: 0.9,
    irrigationDuration: 30,
    waterNeed: 'moyen',
    description: 'Besoin en eau modéré, sensible aux excès.'
  },
  {
    name: 'manioc',
    label: 'Manioc',
    color: '#3b82f6',
    soilHumidity: { min: 25, optimal: 45, max: 70, critical: 15 },
    temperature: { min: 20, optimal: 30, max: 40, critical: 45 },
    airHumidityFactor: 1.0,
    irrigationDuration: 20,
    waterNeed: 'faible',
    description: 'Très résistant à la sécheresse, nécessite peu d\'irrigation.'
  }
];

const seedDB = async () => {
  await connectDB();

  // Supprimer les données existantes
  await Crop.deleteMany({});
  await User.deleteMany({});

  // Insérer les cultures
  await Crop.insertMany(crops);
  console.log('✅ Cultures insérées:', crops.map(c => c.label).join(', '));

  // Créer un utilisateur admin par défaut
  const hashedPassword = await bcrypt.hash('admin123', 12);
  await User.create({
    name: 'Administrateur',
    email: 'admin@smartagri.com',
    password: hashedPassword,
    role: 'admin',
    phone: '+221771234567'
  });
  console.log('✅ Utilisateur admin créé: admin@smartagri.com / admin123');

  console.log('🌱 Base de données initialisée avec succès!');
  mongoose.connection.close();
};

seedDB().catch(err => {
  console.error(err);
  process.exit(1);
});
