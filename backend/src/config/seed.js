require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./db');
const Crop = require('../models/Crop');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const crops = [
  // ── Légumes et cultures maraîchères ──────────────────────────────────────
  { name: 'tomate',      label: 'Tomate',      color: '#ef4444', waterNeed: 'élevé',  soilHumidity: { min: 50, optimal: 70, max: 85, critical: 30 }, temperature: { min: 15, optimal: 25, max: 35, critical: 40 }, airHumidityFactor: 0.85, irrigationDuration: 40 },
  { name: 'aubergine',   label: 'Aubergine',   color: '#8b5cf6', waterNeed: 'moyen',  soilHumidity: { min: 40, optimal: 60, max: 80, critical: 25 }, temperature: { min: 18, optimal: 28, max: 38, critical: 42 }, airHumidityFactor: 0.90, irrigationDuration: 30 },
  { name: 'piment',      label: 'Piment',      color: '#f97316', waterNeed: 'moyen',  soilHumidity: { min: 45, optimal: 65, max: 80, critical: 28 }, temperature: { min: 18, optimal: 27, max: 35, critical: 40 }, airHumidityFactor: 0.88, irrigationDuration: 30 },
  { name: 'oignon',      label: 'Oignon',      color: '#eab308', waterNeed: 'moyen',  soilHumidity: { min: 40, optimal: 60, max: 75, critical: 25 }, temperature: { min: 13, optimal: 22, max: 32, critical: 38 }, airHumidityFactor: 0.92, irrigationDuration: 25 },
  { name: 'gombo',       label: 'Gombo',       color: '#22c55e', waterNeed: 'moyen',  soilHumidity: { min: 40, optimal: 60, max: 78, critical: 22 }, temperature: { min: 22, optimal: 30, max: 40, critical: 44 }, airHumidityFactor: 0.95, irrigationDuration: 30 },
  { name: 'concombre',   label: 'Concombre',   color: '#10b981', waterNeed: 'élevé',  soilHumidity: { min: 55, optimal: 72, max: 85, critical: 35 }, temperature: { min: 18, optimal: 26, max: 35, critical: 40 }, airHumidityFactor: 0.82, irrigationDuration: 35 },
  { name: 'chou',        label: 'Chou',        color: '#6ee7b7', waterNeed: 'élevé',  soilHumidity: { min: 55, optimal: 72, max: 85, critical: 35 }, temperature: { min: 10, optimal: 18, max: 28, critical: 34 }, airHumidityFactor: 0.80, irrigationDuration: 35 },
  { name: 'laitue',      label: 'Laitue',      color: '#a3e635', waterNeed: 'élevé',  soilHumidity: { min: 55, optimal: 75, max: 88, critical: 38 }, temperature: { min: 10, optimal: 18, max: 27, critical: 32 }, airHumidityFactor: 0.78, irrigationDuration: 35 },
  { name: 'carotte',     label: 'Carotte',     color: '#fb923c', waterNeed: 'moyen',  soilHumidity: { min: 45, optimal: 65, max: 80, critical: 28 }, temperature: { min: 10, optimal: 18, max: 28, critical: 34 }, airHumidityFactor: 0.90, irrigationDuration: 28 },
  { name: 'haricot',     label: 'Haricot vert',color: '#4ade80', waterNeed: 'moyen',  soilHumidity: { min: 40, optimal: 60, max: 78, critical: 25 }, temperature: { min: 16, optimal: 24, max: 32, critical: 38 }, airHumidityFactor: 0.90, irrigationDuration: 28 },
  { name: 'poivron',     label: 'Poivron',     color: '#f43f5e', waterNeed: 'moyen',  soilHumidity: { min: 45, optimal: 65, max: 80, critical: 28 }, temperature: { min: 18, optimal: 26, max: 34, critical: 40 }, airHumidityFactor: 0.88, irrigationDuration: 30 },
  { name: 'pastèque',    label: 'Pastèque',    color: '#fb7185', waterNeed: 'moyen',  soilHumidity: { min: 35, optimal: 55, max: 75, critical: 20 }, temperature: { min: 22, optimal: 30, max: 40, critical: 45 }, airHumidityFactor: 0.95, irrigationDuration: 25 },
  { name: 'melon',       label: 'Melon',       color: '#fbbf24', waterNeed: 'moyen',  soilHumidity: { min: 35, optimal: 55, max: 75, critical: 20 }, temperature: { min: 20, optimal: 28, max: 38, critical: 43 }, airHumidityFactor: 0.95, irrigationDuration: 25 },

  // ── Céréales et tubercules ───────────────────────────────────────────────
  { name: 'manioc',      label: 'Manioc',      color: '#3b82f6', waterNeed: 'faible', soilHumidity: { min: 25, optimal: 45, max: 70, critical: 15 }, temperature: { min: 20, optimal: 30, max: 40, critical: 45 }, airHumidityFactor: 1.00, irrigationDuration: 20 },
  { name: 'mil',         label: 'Mil',         color: '#d97706', waterNeed: 'faible', soilHumidity: { min: 20, optimal: 40, max: 65, critical: 12 }, temperature: { min: 25, optimal: 33, max: 42, critical: 46 }, airHumidityFactor: 1.05, irrigationDuration: 18 },
  { name: 'sorgho',      label: 'Sorgho',      color: '#b45309', waterNeed: 'faible', soilHumidity: { min: 22, optimal: 42, max: 65, critical: 13 }, temperature: { min: 23, optimal: 32, max: 42, critical: 46 }, airHumidityFactor: 1.05, irrigationDuration: 18 },
  { name: 'maïs',        label: 'Maïs',        color: '#facc15', waterNeed: 'moyen',  soilHumidity: { min: 40, optimal: 60, max: 80, critical: 25 }, temperature: { min: 18, optimal: 27, max: 38, critical: 43 }, airHumidityFactor: 0.90, irrigationDuration: 30 },
  { name: 'riz',         label: 'Riz',         color: '#86efac', waterNeed: 'élevé',  soilHumidity: { min: 70, optimal: 85, max: 95, critical: 55 }, temperature: { min: 20, optimal: 28, max: 38, critical: 42 }, airHumidityFactor: 0.75, irrigationDuration: 50 },
  { name: 'patate_douce',label: 'Patate douce',color: '#c084fc', waterNeed: 'moyen',  soilHumidity: { min: 35, optimal: 55, max: 75, critical: 20 }, temperature: { min: 20, optimal: 28, max: 38, critical: 43 }, airHumidityFactor: 0.95, irrigationDuration: 25 },
  { name: 'igname',      label: 'Igname',      color: '#a16207', waterNeed: 'moyen',  soilHumidity: { min: 40, optimal: 60, max: 78, critical: 25 }, temperature: { min: 22, optimal: 30, max: 38, critical: 43 }, airHumidityFactor: 0.92, irrigationDuration: 28 },
  { name: 'niébé',       label: 'Niébé',       color: '#65a30d', waterNeed: 'faible', soilHumidity: { min: 25, optimal: 45, max: 65, critical: 15 }, temperature: { min: 22, optimal: 30, max: 40, critical: 44 }, airHumidityFactor: 1.00, irrigationDuration: 20 },
  { name: 'arachide',    label: 'Arachide',    color: '#ca8a04', waterNeed: 'moyen',  soilHumidity: { min: 35, optimal: 55, max: 72, critical: 20 }, temperature: { min: 20, optimal: 28, max: 38, critical: 43 }, airHumidityFactor: 0.95, irrigationDuration: 22 },
  { name: 'fonio',       label: 'Fonio',       color: '#92400e', waterNeed: 'faible', soilHumidity: { min: 18, optimal: 38, max: 60, critical: 10 }, temperature: { min: 22, optimal: 30, max: 40, critical: 44 }, airHumidityFactor: 1.05, irrigationDuration: 15 },

  // ── Cultures de rente ────────────────────────────────────────────────────
  { name: 'canne_sucre', label: 'Canne à sucre',color: '#16a34a',waterNeed: 'élevé', soilHumidity: { min: 55, optimal: 72, max: 88, critical: 35 }, temperature: { min: 20, optimal: 30, max: 40, critical: 44 }, airHumidityFactor: 0.82, irrigationDuration: 50 },
  { name: 'coton',       label: 'Coton',       color: '#f1f5f9', waterNeed: 'moyen',  soilHumidity: { min: 35, optimal: 55, max: 75, critical: 20 }, temperature: { min: 20, optimal: 30, max: 40, critical: 44 }, airHumidityFactor: 0.95, irrigationDuration: 28 },

  // ── Fruits et arbres fruitiers ───────────────────────────────────────────
  { name: 'banane',      label: 'Banane',      color: '#fde047', waterNeed: 'élevé',  soilHumidity: { min: 55, optimal: 75, max: 88, critical: 38 }, temperature: { min: 18, optimal: 27, max: 38, critical: 42 }, airHumidityFactor: 0.80, irrigationDuration: 45 },
  { name: 'papaye',      label: 'Papaye',      color: '#fb923c', waterNeed: 'moyen',  soilHumidity: { min: 40, optimal: 60, max: 78, critical: 25 }, temperature: { min: 20, optimal: 28, max: 38, critical: 43 }, airHumidityFactor: 0.90, irrigationDuration: 30 },
  { name: 'mangue',      label: 'Mangue',      color: '#f59e0b', waterNeed: 'faible', soilHumidity: { min: 30, optimal: 50, max: 70, critical: 18 }, temperature: { min: 22, optimal: 30, max: 42, critical: 46 }, airHumidityFactor: 1.00, irrigationDuration: 22 },
  { name: 'ananas',      label: 'Ananas',      color: '#fbbf24', waterNeed: 'moyen',  soilHumidity: { min: 40, optimal: 58, max: 75, critical: 25 }, temperature: { min: 20, optimal: 28, max: 38, critical: 43 }, airHumidityFactor: 0.92, irrigationDuration: 28 },
  { name: 'goyave',      label: 'Goyave',      color: '#86efac', waterNeed: 'faible', soilHumidity: { min: 30, optimal: 50, max: 70, critical: 18 }, temperature: { min: 18, optimal: 28, max: 40, critical: 44 }, airHumidityFactor: 1.00, irrigationDuration: 22 },
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
