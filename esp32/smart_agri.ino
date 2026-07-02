/*
 * Smart Agriculture - Code ESP32
 * Capteurs: DHT11 (temp/humidité air) + capteur humidité sol
 * Actionneur: Pompe à eau
 * Communication: HTTPS REST vers serveur Render
 *
 * Librairies requises (Library Manager Arduino IDE):
 * - DHT sensor library by Adafruit
 * - ArduinoJson by Benoit Blanchon
 * - WiFiClientSecure (incluse ESP32)
 * - HTTPClient (incluse ESP32)
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ===== CONFIGURATION - MODIFIER CES VALEURS =====
const char* WIFI_SSID     = "VOTRE_WIFI_SSID";
const char* WIFI_PASSWORD = "VOTRE_WIFI_PASSWORD";
const char* SERVER_URL    = "https://votre-backend.onrender.com";  // URL Render
const char* API_KEY       = "VOTRE_CLE_API_ESP32";  // Depuis le backend
const char* CROP_TYPE     = "tomate";  // tomate | aubergine | manioc
const char* PARCEL_ID     = "";        // ID MongoDB de la parcelle (optionnel)

// ===== PINS =====
#define SOIL_SENSOR_PIN   34   // Capteur humidité sol (analogique)
#define DHT_PIN           4    // DHT11
#define PUMP_RELAY_PIN    26   // Relais pompe
#define LED_STATUS_PIN    2    // LED intégrée ESP32

// ===== POLARITÉ DU RELAIS =====
// La plupart des modules relais vendus avec les kits Arduino/ESP32 sont
// "actifs au niveau HAUT" (HIGH = relais activé = pompe allumée).
// Certains modules (souvent ceux avec optocoupleur, type "Songle SRD")
// sont "actifs au niveau BAS" (LOW = activé).
// Si ta pompe démarre quand tu envoies /off et s'arrête quand tu envoies /on,
// inverse cette valeur : passe-la à true.
#define RELAY_ACTIVE_LOW  false

// ===== PARAMÈTRES =====
#define DHT_TYPE          DHT11
#define SEND_INTERVAL     3000    // Envoi données toutes les 3 secondes
#define RECONNECT_DELAY   5000    // Délai reconnexion WiFi
#define MAX_RETRIES       3       // Nombre de tentatives HTTP

// Calibration capteur sol (à ajuster selon votre capteur)
#define SOIL_DRY_VALUE    3200    // Valeur ADC sol sec
#define SOIL_WET_VALUE    1200    // Valeur ADC sol saturé

DHT dht(DHT_PIN, DHT_TYPE);
WiFiClientSecure client;

// Variables état
bool pumpState = false;
unsigned long lastSendTime = 0;
unsigned long lastWiFiCheck = 0;
int failedSends = 0;

// Buffer hors-ligne (stockage local si pas de connexion)
struct MeasureBuffer {
  float soilHumidity;
  float temperature;
  float airHumidity;
  unsigned long timestamp;
  bool valid;
} offlineBuffer[5];  // Stocke 5 mesures hors ligne
int bufferIndex = 0;

// ===== SETUP =====
void setup() {
  Serial.begin(115200);
  Serial.println("\n🌱 Smart Agriculture ESP32 - Démarrage");

  pinMode(PUMP_RELAY_PIN, OUTPUT);
  pinMode(LED_STATUS_PIN, OUTPUT);
  setPumpRelay(false);  // Pompe éteinte au démarrage

  dht.begin();

  // Initialiser le buffer hors-ligne
  for (int i = 0; i < 5; i++) offlineBuffer[i].valid = false;

  connectWiFi();
  client.setInsecure();  // Pour HTTPS sans vérification cert (acceptable pour IoT)

  Serial.println("✅ Initialisation terminée");
}

// ===== LOOP =====
void loop() {
  unsigned long now = millis();

  // Vérifier connexion WiFi toutes les 30 secondes
  if (now - lastWiFiCheck > 30000) {
    lastWiFiCheck = now;
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("⚠️  WiFi déconnecté, reconnexion...");
      connectWiFi();
    }
  }

  // Envoyer les données selon l'intervalle
  if (now - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = now;

    // Lire les capteurs
    float soilHumidity = readSoilHumidity();
    float temperature  = readTemperature();
    float airHumidity  = readAirHumidity();

    // Validation des données
    if (isnan(temperature) || isnan(airHumidity)) {
      Serial.println("❌ Erreur lecture DHT11, skip...");
      blinkLED(3);
      return;
    }

    Serial.printf("📊 Sol: %.1f%% | Temp: %.1f°C | Air: %.1f%%\n",
                  soilHumidity, temperature, airHumidity);

    // Envoyer ou stocker hors-ligne
    if (WiFi.status() == WL_CONNECTED) {
      // Envoyer les mesures en buffer d'abord
      sendBufferedMeasures();
      // Envoyer la mesure actuelle
      sendMeasure(soilHumidity, temperature, airHumidity);
    } else {
      storeOffline(soilHumidity, temperature, airHumidity);
    }
  }

  delay(100);
}

// ===== CONNEXION WIFI =====
void connectWiFi() {
  Serial.printf("📶 Connexion à %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n✅ WiFi connecté! IP: %s\n", WiFi.localIP().toString().c_str());
    digitalWrite(LED_STATUS_PIN, HIGH);
    failedSends = 0;
  } else {
    Serial.println("\n❌ Échec connexion WiFi");
    digitalWrite(LED_STATUS_PIN, LOW);
  }
}

// ===== LECTURE CAPTEURS =====
float readSoilHumidity() {
  int rawValue = 0;
  for (int i = 0; i < 5; i++) {
    rawValue += analogRead(SOIL_SENSOR_PIN);
    delay(10);
  }
  rawValue /= 5;  // Moyenne de 5 lectures

  // Convertir ADC en pourcentage (0-100%)
  float humidity = map(rawValue, SOIL_DRY_VALUE, SOIL_WET_VALUE, 0, 100);
  return constrain(humidity, 0.0, 100.0);
}

float readTemperature() {
  float temp = dht.readTemperature();
  if (isnan(temp)) {
    delay(500);
    temp = dht.readTemperature();  // Retry
  }
  return temp;
}

float readAirHumidity() {
  float hum = dht.readHumidity();
  if (isnan(hum)) {
    delay(500);
    hum = dht.readHumidity();  // Retry
  }
  return hum;
}

// ===== ENVOI DONNÉES AU SERVEUR =====
bool sendMeasure(float soilHumidity, float temperature, float airHumidity) {
  HTTPClient http;
  String url = String(SERVER_URL) + "/api/measures";

  // Construire le JSON
  StaticJsonDocument<256> doc;
  doc["soilHumidity"] = round(soilHumidity * 10) / 10.0;
  doc["temperature"]  = round(temperature * 10) / 10.0;
  doc["airHumidity"]  = round(airHumidity * 10) / 10.0;
  doc["cropType"]     = CROP_TYPE;
  if (strlen(PARCEL_ID) > 0) doc["parcelId"] = PARCEL_ID;
  // GPS (décommentez si module GPS connecté)
  // doc["latitude"]  = gps.location.lat();
  // doc["longitude"] = gps.location.lng();

  String jsonBody;
  serializeJson(doc, jsonBody);

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);
  http.setTimeout(10000);

  int httpCode = http.POST(jsonBody);

  if (httpCode == 200) {
    String response = http.getString();
    StaticJsonDocument<256> resDoc;
    deserializeJson(resDoc, response);

    bool newPumpState = resDoc["pumpCommand"] | false;
    String decision = resDoc["decision"] | "";
    String urgency = resDoc["urgency"] | "none";

    Serial.printf("✅ Réponse serveur: pompe=%s | %s | urgence=%s\n",
                  newPumpState ? "ON" : "OFF", decision.c_str(), urgency.c_str());

    // Appliquer la commande pompe
    if (newPumpState != pumpState) {
      setPump(newPumpState);
    }

    failedSends = 0;
    blinkLED(1);
    http.end();
    return true;
  } else {
    Serial.printf("❌ Erreur HTTP: %d\n", httpCode);
    failedSends++;
    if (failedSends >= MAX_RETRIES) {
      Serial.println("⚠️  Trop d'erreurs, stockage hors-ligne");
      storeOffline(soilHumidity, temperature, airHumidity);
      failedSends = 0;
    }
    http.end();
    return false;
  }
}

// ===== CONTRÔLE RELAIS POMPE =====
// Centralise la logique de polarité — modifie uniquement RELAY_ACTIVE_LOW
// en haut du fichier si la pompe s'active dans le mauvais sens
void setPumpRelay(bool wantOn) {
  bool pinLevel = RELAY_ACTIVE_LOW ? !wantOn : wantOn;
  digitalWrite(PUMP_RELAY_PIN, pinLevel ? HIGH : LOW);
}

void setPump(bool state) {
  pumpState = state;
  setPumpRelay(state);
  Serial.printf("💧 Pompe: %s\n", state ? "ACTIVÉE" : "ARRÊTÉE");
  blinkLED(state ? 2 : 1);
}

// ===== GESTION HORS-LIGNE =====
void storeOffline(float soil, float temp, float air) {
  offlineBuffer[bufferIndex % 5] = { soil, temp, air, millis(), true };
  bufferIndex++;
  Serial.printf("💾 Stocké hors-ligne (%d/5)\n", min(bufferIndex, 5));
}

void sendBufferedMeasures() {
  for (int i = 0; i < 5; i++) {
    if (offlineBuffer[i].valid) {
      Serial.printf("📤 Envoi mesure buffered [%d]...\n", i);
      if (sendMeasure(offlineBuffer[i].soilHumidity,
                      offlineBuffer[i].temperature,
                      offlineBuffer[i].airHumidity)) {
        offlineBuffer[i].valid = false;
      }
      delay(500);  // Petit délai entre envois
    }
  }
}

// ===== UTILITAIRES =====
void blinkLED(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_STATUS_PIN, LOW);
    delay(100);
    digitalWrite(LED_STATUS_PIN, HIGH);
    delay(100);
  }
}
