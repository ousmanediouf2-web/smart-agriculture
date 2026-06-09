require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./db');
const Crop = require('../models/Crop');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const crops = [
  { name: 'tomate', label: 'Tomate', color: '#ef4444', waterNeed: 'élevé', soilHumidity: { min: 50, optimal: 70, max: 85, critical: 30 }, temperature: { min: 15, optimal: 25, max: 35, critical: 40 }, airHumidityFactor: 0.85, irrigationDuration: 40 },
  { name: 'aubergine', label: 'Aubergine', color: '#8b5cf6', waterNeed: 'moyen', soilHumidity: { min: 40, optimal: 60, max: 80, critical: 25 }, temperature: { min: 18, optimal: 28, max: 38, critical: 42 }, airHumidityFactor: 0.9, irrigationDuration: 30 },
  { name: 'manioc', label: 'Manioc', color: '#3b82f6', waterNeed: 'faible', soilHumidity: { min: 25, optimal: 45, max: 70, critical: 15 }, temperature: { min: 20, optimal: 30, max: 40, critical: 45 }, airHumidityFactor: 1.0, irrigationDuration: 20 }
];

const seedDB = async () => {
  await connectDB();
  await Crop.deleteMany({});
  await User.deleteMany({});
  await Crop.insertMany(crops);
  console.log('✅ Cultures insérées');
  const hashedPassword = await bcrypt.hash('admin123', 12);
  await User.create({ name: 'Administrateur', email: 'admin@gmail.com', password: hashedPassword, role: 'admin', phone: '+221771234567' });
  console.log('✅ Admin créé: admin@gmail.com / admin123');
  console.log('🌱 Base initialisée!');
  mongoose.connection.close();
};

seedDB().catch(err => { console.error(err); process.exit(1); });
