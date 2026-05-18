# 🌱 Smart Agriculture IoT Platform

Plateforme web intelligente de gestion agricole connectée basée sur ESP32, MongoDB Atlas, React et Node.js.

## ✨ Fonctionnalités

- **Collecte IoT temps réel** — ESP32 + capteur sol + DHT11
- **Automatisation intelligente** — Arrosage automatique selon culture (Tomate/Aubergine/Manioc)
- **Dashboard temps réel** — Socket.IO, graphiques, état des pompes
- **Carte interactive** — Leaflet.js, dessin de polygones, géolocalisation GPS
- **Alertes SMS** — Twilio pour notifications critiques
- **Export données** — CSV et JSON avec filtres
- **Multi-cultures** — Seuils spécifiques par culture
- **Authentification JWT** — Sécurité complète

---

## 🚀 Installation rapide

### Prérequis
- Node.js ≥ 18
- Compte MongoDB Atlas (gratuit)
- Compte Twilio (optionnel)
- Arduino IDE avec ESP32 board

### 1. Cloner le projet
```bash
git clone https://github.com/VOTRE_USERNAME/smart-agriculture.git
cd smart-agriculture
```

### 2. Configurer le Backend
```bash
cd backend
cp .env.example .env
# Éditez .env avec vos vraies valeurs
npm install
```

### 3. Configurer le Frontend
```bash
cd ../frontend
cp .env.example .env
# VITE_API_URL=http://localhost:5000
# VITE_SOCKET_URL=http://localhost:5000
npm install
```

### 4. Initialiser la base de données
```bash
cd backend
node src/config/seed.js
```
> Crée les 3 cultures et un admin: **admin@smartagri.com / admin123**

### 5. Lancer en développement
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

→ Frontend: http://localhost:5173  
→ Backend: http://localhost:5000

---

## 📡 Configuration ESP32

### Librairies Arduino IDE requises
- **DHT sensor library** by Adafruit
- **ArduinoJson** by Benoit Blanchon

### Étapes
1. Ouvrez `esp32/smart_agri.ino` dans Arduino IDE
2. Installez le support ESP32: `File > Preferences > Additional boards URL`:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Sélectionnez `Tools > Board > ESP32 Dev Module`
4. Modifiez les variables dans le code:

```cpp
const char* WIFI_SSID     = "VOTRE_WIFI";
const char* WIFI_PASSWORD = "VOTRE_MOT_DE_PASSE";
const char* SERVER_URL    = "https://votre-backend.onrender.com";
const char* API_KEY       = "VOTRE_CLE_API";  // Depuis l'interface Capteurs
const char* CROP_TYPE     = "tomate";         // tomate | aubergine | manioc
```

### Schéma de câblage
```
ESP32           Capteur Sol
GPIO 34   ←→   Signal (analogique)
3.3V      ←→   VCC
GND       ←→   GND

ESP32           DHT11
GPIO 4    ←→   Signal
3.3V      ←→   VCC
GND       ←→   GND

ESP32           Relais Pompe
GPIO 26   ←→   IN
5V        ←→   VCC
GND       ←→   GND
```

### Calibration capteur sol
Ajustez dans le code selon votre capteur:
```cpp
#define SOIL_DRY_VALUE    3200   // ADC en air sec
#define SOIL_WET_VALUE    1200   // ADC dans l'eau
```

---

## ☁️ Déploiement sur Render.com

### Étape 1 — MongoDB Atlas
1. Créez un compte sur https://cloud.mongodb.com
2. Créez un cluster gratuit M0
3. Dans `Database Access`: créez un utilisateur avec mot de passe
4. Dans `Network Access`: ajoutez `0.0.0.0/0` (autoriser tout)
5. Copiez l'URI de connexion: `mongodb+srv://user:pass@cluster.mongodb.net/smart_agriculture`

### Étape 2 — GitHub
```bash
git init
git add .
git commit -m "feat: initial Smart Agriculture platform"
git branch -M main
git remote add origin https://github.com/VOTRE_USERNAME/smart-agriculture.git
git push -u origin main
```

### Étape 3 — Render Backend
1. https://render.com → New → Web Service
2. Connectez votre repo GitHub
3. Configurez:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Variables d'environnement:
   ```
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=votre_secret_aleatoire_32_chars
   TWILIO_ACCOUNT_SID=ACxxxx
   TWILIO_AUTH_TOKEN=xxxx
   TWILIO_PHONE_NUMBER=+1234567890
   ADMIN_PHONE_NUMBER=+221771234567
   ESP32_API_KEY=votre_cle_api_esp32
   FRONTEND_URL=https://votre-frontend.onrender.com
   NODE_ENV=production
   ```

### Étape 4 — Render Frontend
1. New → Static Site
2. Connectez le même repo
3. Configurez:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Variables d'environnement:
   ```
   VITE_API_URL=https://votre-backend.onrender.com
   VITE_SOCKET_URL=https://votre-backend.onrender.com
   ```

### Étape 5 — Initialiser la DB en production
Depuis le Shell Render (onglet Shell du service backend):
```bash
node src/config/seed.js
```

### Étape 6 — Configurer l'ESP32
Mettez à jour `SERVER_URL` avec l'URL de votre backend Render.

---

## 🧠 Architecture de décision intelligente

Le moteur d'irrigation (`irrigationEngine.js`) prend en compte:

| Condition | Effet sur l'arrosage |
|-----------|---------------------|
| Température > seuil culture | Augmente le besoin |
| Stress thermique critique | +10% seuil minimum |
| Humidité air > 70% | Réduit légèrement le besoin |
| Air très sec (< 30%) | +6% seuil minimum |
| Sol saturé (> max) | Bloque l'arrosage |
| Sol critique | Irrigation d'urgence |

### Profils par culture
| Culture | Sol Min | Sol Optimal | Sol Critique | Durée arrosage |
|---------|---------|-------------|--------------|----------------|
| Tomate | 50% | 70% | 30% | 40 min |
| Aubergine | 40% | 60% | 25% | 30 min |
| Manioc | 25% | 45% | 15% | 20 min |

---

## 📁 Structure du projet

```
smart-agriculture/
├── backend/
│   ├── src/
│   │   ├── config/         # DB, seed
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # API REST
│   │   ├── middleware/      # Auth JWT
│   │   ├── services/       # Logique métier
│   │   └── socket/         # Socket.IO temps réel
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios clients
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks (Socket)
│   │   ├── pages/          # Pages principales
│   │   └── store/          # Zustand state
│   └── package.json
├── esp32/
│   └── smart_agri.ino      # Code Arduino
├── render.yaml             # Config Render
└── README.md
```

---

## 🔌 API Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/register` | Inscription |
| GET | `/api/measures` | Historique mesures |
| **POST** | `/api/measures` | **Envoi depuis ESP32** |
| GET | `/api/sensors` | Liste capteurs |
| POST | `/api/sensors` | Créer capteur |
| PUT | `/api/sensors/:id/pump` | Contrôle pompe |
| GET | `/api/parcels` | Liste parcelles |
| POST | `/api/parcels` | Créer parcelle (GeoJSON) |
| GET | `/api/alerts` | Liste alertes |
| GET | `/api/export/measures/csv` | Export CSV |
| GET | `/api/export/measures/json` | Export JSON |

**Authentification ESP32**: Header `x-api-key: VOTRE_CLE`  
**Authentification utilisateur**: Header `Authorization: Bearer JWT_TOKEN`

---

## 🔒 Sécurité

- JWT avec expiration 7 jours
- API Key unique par capteur ESP32
- Rate limiting (500 req/15min général, 120 req/min ESP32)
- Helmet.js (headers HTTP sécurisés)
- CORS configuré par environnement
- Bcrypt (salt=12) pour les mots de passe

---

## 📱 Captures d'écran

- **Dashboard** — Vue d'ensemble temps réel avec graphiques
- **Carte** — Leaflet.js avec dessin de polygones et GPS
- **Alertes** — Priorités avec acquittement
- **Capteurs** — Contrôle manuel des pompes
- **Export** — CSV/JSON avec filtres

---

## 🔧 Dépannage

### ESP32 ne se connecte pas
- Vérifiez WIFI_SSID/PASSWORD
- Vérifiez que l'URL du serveur est correcte (https://)
- Vérifiez l'API_KEY dans l'interface Capteurs

### MongoDB connexion échoue
- Vérifiez l'URI dans .env (pas d'espaces)
- Vérifiez que l'IP 0.0.0.0/0 est autorisée dans Atlas

### SMS Twilio non reçus
- Vérifiez TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN
- Vérifiez que le numéro destination est vérifié (compte trial)
- Vérifiez ADMIN_PHONE_NUMBER format: +221XXXXXXXXX

### Pompe ne répond pas aux commandes
- Vérifiez le câblage du relais (LOW = actif)
- Vérifiez que le capteur est associé à une parcelle
- Testez le contrôle manuel depuis l'interface

---

## 📝 Licence

MIT — Projet académique/professionnel Smart Agriculture IoT
