# 🌾 Smart Agriculture IoT Platform v2.0

Plateforme IoT complète pour la gestion agricole intelligente.  
ESP32 + MongoDB Atlas + Node.js + React + Socket.IO + **WhatsApp Twilio** + **Images Satellitaires**

---

## 🆕 Nouveautés v2.0

- ✅ **Gestion des utilisateurs** : panel admin complet (créer / modifier / supprimer / reset mot de passe)
- 📱 **WhatsApp au lieu de SMS** : toutes les alertes envoyées sur WhatsApp du numéro de l'agriculteur
- 🛰️ **Images satellitaires** : vue NDVI + vraie couleur, rafraîchissement automatique toutes les 5 jours
- 📊 **Rapport journalier WhatsApp** : envoyé à 7h00 à chaque agriculteur (optionnel)
- 🔐 **Route /api/init-db protégée** par secret header
- 🌍 **Variables d'environnement** : fin du BACKEND_URL hardcodé

---

## 🚀 Déploiement sur Render

### 1. Variables d'environnement Backend

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | URI MongoDB Atlas |
| `JWT_SECRET` | Secret JWT (auto-généré par Render) |
| `TWILIO_ACCOUNT_SID` | SID Twilio |
| `TWILIO_AUTH_TOKEN` | Token Twilio |
| `TWILIO_WHATSAPP_NUMBER` | Numéro WhatsApp sandbox Twilio (`+14155238886`) |
| `ADMIN_PHONE_NUMBER` | Votre numéro WhatsApp admin |
| `INIT_SECRET` | Secret pour initialiser la BD (auto-généré) |
| `FRONTEND_URL` | URL du frontend Render |
| `CDSE_CLIENT_ID` / `CDSE_CLIENT_SECRET` | (recommandé) OAuth Copernicus Data Space pour le NDVI réel |
| `MAPBOX_TOKEN` | (optionnel) Token Mapbox |

### 2. Variables d'environnement Frontend

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | URL du backend Render |
| `VITE_SOCKET_URL` | URL du backend Render (même URL) |
| `VITE_MAPBOX_TOKEN` | (optionnel) Token Mapbox pour les cartes |

### 3. Initialiser la base de données

```bash
# Après déploiement, appelez cette route UNE SEULE FOIS
curl -H "x-init-secret: VOTRE_INIT_SECRET" https://votre-backend.onrender.com/api/init-db
```

---

## 📱 Configuration WhatsApp Twilio

1. Créez un compte sur [twilio.com](https://twilio.com)
2. Activez le **sandbox WhatsApp** (gratuit)
3. Rejoignez le sandbox depuis votre téléphone : envoyez `join <mot-sandbox>` au numéro Twilio
4. Configurez `TWILIO_WHATSAPP_NUMBER=+14155238886`
5. Chaque agriculteur doit rejoindre le sandbox avec son numéro

**Notifications envoyées :**
- 💧 Pompe activée/arrêtée
- 🌡️ Température critique
- ⚠️ Capteur hors ligne
- 🛰️ Nouvelle image satellitaire (toutes les 5 jours)
- 📊 Rapport journalier à 7h00 (optionnel)

---

## 🔊 Alerte vocale Telegram

Quand le sol atteint l'état **critique** (humidité ≤ seuil critique de la culture), l'alerte écrite est suivie d'un **message vocal**. Anti-spam : au maximum un vocal toutes les 5 minutes par capteur. Désactivable dans Paramètres → « Message vocal si le sol est critique ». Le bouton de test Telegram envoie aussi le vocal.

- **Votre propre voix (prioritaire)** : placez `sol-critique.ogg` (ou `.mp3`, `.m4a`, `.opus`) dans `backend/assets/voice/`, puis poussez sur GitHub.
- **Sinon, voix de synthèse** : gratuite par défaut (MP3), ou Google Cloud Text-to-Speech avec `GOOGLE_TTS_API_KEY` (vrai vocal OGG).

---

## 🛰️ NDVI Sentinel-2

- **Carte** : chaque parcelle est colorée selon son NDVI (échelle sol nu → végétation dense) avec la valeur affichée au centre
- **Fiche parcelle** : valeur actuelle, évolution sur ~60 jours, légende
- **Image Sentinel-2** : image NDVI ou vraie couleur découpée sur le contour de la parcelle (sélection d'une parcelle sur la carte)
- **Fréquence** : recalcul automatique tous les **5 jours** (cron 8h) et bouton « Actualiser »
- **Nuages** : pixels nuageux, ombrés ou aquatiques exclus grâce à la bande SCL
- **Source gratuite** : Copernicus Data Space (`CDSE_CLIENT_ID` / `CDSE_CLIENT_SECRET`)
- **Sans identifiants** : valeurs simulées, toujours signalées « simulées » dans l'interface

API : `GET /api/satellite/ndvi/summary`, `GET /api/satellite/:parcelId`, `GET /api/satellite/:parcelId/image?type=ndvi|truecolor`, `POST /api/satellite/:parcelId/refresh`

---

## 🔐 Comptes par défaut (après init-db)

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@gmail.com | admin123 | Admin |

**⚠️ Changez le mot de passe immédiatement après la première connexion !**

---

## ⚠️ IMPORTANT — Maintenir le serveur éveillé (Render Free)

Render Free met automatiquement le backend en veille après **15 minutes sans requête HTTP entrante**.
Quand le serveur dort, **tout s'arrête** : les rapports journaliers Telegram (7h00), les alertes
capteur hors-ligne (toutes les 5 min), et les mises à jour satellite ne se déclenchent plus,
car le processus Node.js lui-même est suspendu.

**Un ping interne (`setInterval` dans le code) ne suffit pas** — s'il n'y a personne pour
réveiller le serveur depuis l'extérieur, ce timer ne s'exécute jamais non plus.

### Solution gratuite (5 minutes de configuration)

1. Va sur **[uptimerobot.com](https://uptimerobot.com)** → crée un compte gratuit
2. **Add New Monitor** → Monitor Type: `HTTP(s)`
3. URL à surveiller :
   ```
   https://smart-agriculture-aeo3.onrender.com/health
   ```
4. Intervalle : **5 minutes** (le plus court possible sur le plan gratuit)
5. Sauvegarde — c'est tout, ton serveur restera éveillé 24h/24

Avec ce ping externe actif, les cron jobs (rapport journalier 7h, alertes 5 min,
satellite tous les 5 jours) se déclencheront normalement car le serveur ne dormira plus.

---

## 🏗️ Architecture

```
smart-agriculture/
├── backend/          Node.js + Express + Socket.IO
│   └── src/
│       ├── routes/   auth, users, sensors, measures, parcels, alerts, satellite, export
│       ├── models/   User, Sensor, Parcel, Measure, Alert, Crop, PumpLog
│       └── services/ twilioService (WhatsApp), irrigationEngine
├── frontend/         React + Vite + Tailwind CSS
│   └── src/
│       └── pages/    Dashboard, Map (satellite), Admin (users), Parcels, Sensors, Alerts...
└── esp32/            Code Arduino pour ESP32
```
