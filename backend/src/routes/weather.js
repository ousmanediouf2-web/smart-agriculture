const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const weatherCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// GET /api/weather?lat=14.15&lng=-16.08
router.get('/', protect, async (req, res) => {
  try {
    const { lat = 14.15, lng = -16.08 } = req.query;
    const cacheKey = `${lat},${lng}`;
    const cached = weatherCache.get(cacheKey);

    if (cached && Date.now() - cached.fetchedAt < CACHE_DURATION) {
      return res.json({ success: true, data: cached.data, fromCache: true });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      // Données simulées si pas de clé
      const simulated = {
        city: 'Kaolack',
        temp: 32,
        feelsLike: 35,
        humidity: 65,
        description: 'Ensoleillé',
        icon: '01d',
        windSpeed: 12,
        pressure: 1010,
        visibility: 10,
        uvIndex: 8,
        forecast: [
          { day: 'Demain', tempMax: 34, tempMin: 26, description: 'Partiellement nuageux', icon: '02d', rain: 0 },
          { day: 'Dans 2j', tempMax: 31, tempMin: 25, description: 'Nuageux', icon: '03d', rain: 10 },
          { day: 'Dans 3j', tempMax: 29, tempMin: 24, description: 'Pluie légère', icon: '10d', rain: 40 },
        ],
        irrigationAdvice: 'Températures élevées — arrosage recommandé tôt le matin ou en soirée.',
        simulated: true
      };
      return res.json({ success: true, data: simulated });
    }

    // Données réelles OpenWeatherMap
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=fr`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=fr&cnt=24`)
    ]);

    const current = await currentRes.json();
    const forecast = await forecastRes.json();

    if (current.cod !== 200) {
      return res.status(400).json({ success: false, message: 'Erreur OpenWeatherMap: ' + current.message });
    }

    // Prévisions journalières (prendre 1 entrée par jour)
    const dailyForecast = [];
    const seenDays = new Set();
    for (const item of forecast.list || []) {
      const day = new Date(item.dt * 1000).toLocaleDateString('fr-FR', { weekday: 'long' });
      if (!seenDays.has(day) && dailyForecast.length < 3) {
        seenDays.add(day);
        dailyForecast.push({
          day: day.charAt(0).toUpperCase() + day.slice(1),
          tempMax: Math.round(item.main.temp_max),
          tempMin: Math.round(item.main.temp_min),
          description: item.weather[0].description,
          icon: item.weather[0].icon,
          rain: Math.round((item.pop || 0) * 100)
        });
      }
    }

    // Conseil d'irrigation selon météo
    let irrigationAdvice = '';
    const temp = current.main.temp;
    const rainProb = dailyForecast[0]?.rain || 0;
    if (rainProb > 60) irrigationAdvice = '🌧️ Pluie prévue demain — réduire ou suspendre l\'irrigation.';
    else if (temp > 35) irrigationAdvice = '🔥 Chaleur extrême — arroser tôt le matin avant 8h.';
    else if (temp > 28) irrigationAdvice = '☀️ Températures élevées — arrosage recommandé en soirée.';
    else irrigationAdvice = '✅ Conditions favorables pour l\'irrigation normale.';

    // Forcer le nom de la ville selon les coordonnées
    const getCityName = (lat, lng) => {
      if (lat >= 13.8 && lat <= 14.5 && lng >= -16.4 && lng <= -15.7) return 'Kaolack';
      if (lat >= 14.6 && lat <= 14.8 && lng >= -17.6 && lng <= -17.3) return 'Dakar';
      if (lat >= 14.7 && lat <= 15.0 && lng >= -16.0 && lng <= -15.5) return 'Thiès';
      if (lat >= 12.3 && lat <= 12.6 && lng >= -16.3 && lng <= -15.9) return 'Ziguinchor';
      if (lat >= 15.5 && lat <= 16.0 && lng >= -15.5 && lng <= -15.0) return 'Saint-Louis';
      return current.name;
    };

    const data = {
      city: getCityName(parseFloat(lat), parseFloat(lng)),
      temp: Math.round(current.main.temp),
      feelsLike: Math.round(current.main.feels_like),
      humidity: current.main.humidity,
      description: current.weather[0].description,
      icon: current.weather[0].icon,
      windSpeed: Math.round(current.wind.speed * 3.6), // m/s → km/h
      pressure: current.main.pressure,
      visibility: Math.round((current.visibility || 10000) / 1000),
      forecast: dailyForecast,
      irrigationAdvice,
      simulated: false
    };

    weatherCache.set(cacheKey, { data, fetchedAt: Date.now() });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
