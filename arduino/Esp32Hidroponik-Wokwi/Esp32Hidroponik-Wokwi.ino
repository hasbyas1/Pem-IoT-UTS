#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// ========== KONFIGURASI WIFI ==========
const char* ssid = "Wokwi-GUEST"; // WiFi ID
const char* password = ""; // WiFi Password
// atau gunakan Wokwi-GUEST dengan password kosong

// ========== KONFIGURASI MQTT BROKER ==========
const char* mqtt_server = "broker.hivemq.com";  // Broker public untuk testing
const int mqtt_port = 1883;
const char* client_id = "fa95308c-0d0c-45ec-b7c3-8c835999cb0e";  // ID unik untuk ESP32 Anda

// ========== MQTT TOPICS ==========
const char* topic_suhu = "hidroponik/sensor/suhu";
const char* topic_humidity = "hidroponik/sensor/humidity";
const char* topic_status = "hidroponik/status/led";
const char* topic_relay_control = "hidroponik/control/relay";
const char* topic_relay_status = "hidroponik/status/relay";

// ========== PIN CONFIGURATION ==========
#define DHTPIN 8
#define DHTTYPE DHT22
#define LED_MERAH 12
#define LED_KUNING 10
#define LED_HIJAU 5
#define BUZZER 9
#define RELAY_POMPA 7

// ========== INISIALISASI ==========
DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient client(espClient);

// Variable global
unsigned long lastMsg = 0;
bool relayStatus = false;

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== SISTEM HIDROPONIK IoT ===");
  
  // Setup pin mode
  pinMode(LED_MERAH, OUTPUT);
  pinMode(LED_KUNING, OUTPUT);
  pinMode(LED_HIJAU, OUTPUT);
  pinMode(RELAY_POMPA, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  
  // Matikan semua output
  digitalWrite(LED_MERAH, LOW);
  digitalWrite(LED_KUNING, LOW);
  digitalWrite(LED_HIJAU, LOW);
  digitalWrite(RELAY_POMPA, HIGH);
  digitalWrite(BUZZER, LOW);
  
  // Inisialisasi sensor
  dht.begin();
  
  // Koneksi WiFi
  setup_wifi();
  
  // Setup MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void setup_wifi() {
  delay(10);
  Serial.println("\n[WiFi] Menghubungkan ke: " + String(ssid));
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempt = 0;
  while (WiFi.status() != WL_CONNECTED && attempt < 20) {
    delay(500);
    Serial.print(".");
    attempt++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Terhubung!");
    Serial.println("[WiFi] IP Address: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n[WiFi] Gagal terhubung!");
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  // Convert payload to string
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.println("\n[MQTT] Pesan diterima:");
  Serial.println("  Topic: " + String(topic));
  Serial.println("  Pesan: " + message);
  
  // Kontrol relay/pompa
  if (String(topic) == topic_relay_control) {
    if (message == "ON" || message == "1" || message == "on") {
      digitalWrite(RELAY_POMPA, LOW);
      relayStatus = true;
      client.publish(topic_relay_status, "ON");
      Serial.println("  [RELAY] Pompa DIHIDUPKAN");
    } 
    else if (message == "OFF" || message == "0" || message == "off") {
      digitalWrite(RELAY_POMPA, HIGH);
      relayStatus = false;
      client.publish(topic_relay_status, "OFF");
      Serial.println("  [RELAY] Pompa DIMATIKAN");
    }
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("\n[MQTT] Connecting to broker...");
    
    if (client.connect(client_id)) {
      Serial.println(" Terhubung!");
      
      // Subscribe ke topic kontrol relay
      client.subscribe(topic_relay_control);
      Serial.println("[MQTT] Subscribe ke: " + String(topic_relay_control));
      
      // Publish status online dan status relay saat pertama connect
      client.publish(topic_status, "ESP32 Online");
      client.publish(topic_relay_status, relayStatus ? "ON" : "OFF");
      
    } else {
      Serial.print(" Gagal, rc=");
      Serial.print(client.state());
      Serial.println(" Retry dalam 5 detik...");
      delay(5000);
    }
  }
}

void kontrolLEDBerdasarkanSuhu(float suhu) {
  String status = "";
  
  // Matikan semua LED dan buzzer
  digitalWrite(LED_MERAH, LOW);
  digitalWrite(LED_KUNING, LOW);
  digitalWrite(LED_HIJAU, LOW);
  digitalWrite(BUZZER, LOW);
  
  // Logika kontrol
  if (suhu > 35) {
    digitalWrite(LED_MERAH, HIGH);
    digitalWrite(BUZZER, HIGH);
    status = "BAHAYA - Suhu Tinggi";
    Serial.println("  [ALERT] LED Merah & Buzzer ON");
  } 
  else if (suhu >= 30 && suhu <= 35) {
    digitalWrite(LED_KUNING, HIGH);
    status = "HATI-HATI - Suhu Sedang";
    Serial.println("  [INFO] LED Kuning ON");
  } 
  else {
    digitalWrite(LED_HIJAU, HIGH);
    status = "NORMAL - Suhu Aman";
    Serial.println("  [OK] LED Hijau ON");
  }
  
  // Publish status LED ke MQTT
  client.publish(topic_status, status.c_str());
}

void loop() {
  // Cek koneksi MQTT
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  
  // Kirim data setiap 2 detik
  unsigned long now = millis();
  if (now - lastMsg > 2000) {
    lastMsg = now;
    
    // Baca sensor DHT11
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();
    
    // Validasi pembacaan sensor
    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("\n[ERROR] Gagal membaca sensor DHT11!");
      return;
    }
    
    // Tampilkan di Serial Monitor
    Serial.println("\n========== DATA SENSOR ==========");
    Serial.printf("Suhu       : %.2f °C\n", temperature);
    Serial.printf("Kelembapan : %.2f %%\n", humidity);
    Serial.println("Status Pompa: " + String(relayStatus ? "ON" : "OFF"));
    
    // Kontrol LED berdasarkan suhu
    kontrolLEDBerdasarkanSuhu(temperature);
    
    // Publish data ke MQTT
    char tempStr[8];
    char humStr[8];
    
    dtostrf(temperature, 1, 2, tempStr);
    dtostrf(humidity, 1, 2, humStr);
    
    client.publish(topic_suhu, tempStr);
    client.publish(topic_humidity, humStr);
    
    // PUBLISH STATUS RELAY SECARA BERKALA
    client.publish(topic_relay_status, relayStatus ? "ON" : "OFF");
    
    Serial.println("\n[MQTT] Data berhasil dikirim!");
    Serial.println("  - Suhu: " + String(tempStr) + " °C");
    Serial.println("  - Humidity: " + String(humStr) + " %");
    Serial.println("  - Relay Status: " + String(relayStatus ? "ON" : "OFF"));
    Serial.println("================================\n");
  }
}