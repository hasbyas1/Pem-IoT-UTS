require('dotenv').config();
const express = require('express');
const mqtt = require('mqtt');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Data storage (in-memory)
let sensorData = {
  suhu: 0,
  humidity: 0,
  status: 'Menunggu data...',
  relayStatus: 'OFF',
  lastUpdate: null
};

// MQTT Configuration
const MQTT_BROKER = `mqtt://${process.env.MQTT_BROKER}:${process.env.MQTT_PORT}`;
const client = mqtt.connect(MQTT_BROKER, {
  clientId: 'Backend_Hidroponik_' + Math.random().toString(16).substr(2, 8)
});

// MQTT Topics
const topics = {
  suhu: 'hidroponik/sensor/suhu',
  humidity: 'hidroponik/sensor/humidity',
  status: 'hidroponik/status/led',
  relayControl: 'hidroponik/control/relay',
  relayStatus: 'hidroponik/status/relay'
};

// MQTT Connect
client.on('connect', () => {
  console.log('Terhubung ke MQTT Broker:', process.env.MQTT_BROKER);
  
  // Subscribe ke semua topic
  Object.values(topics).forEach(topic => {
    if (topic !== topics.relayControl) { // Tidak subscribe ke control topic
      client.subscribe(topic, (err) => {
        if (!err) {
          console.log(`Subscribe ke topic: ${topic}`);
        }
      });
    }
  });
});

// MQTT Message Handler
client.on('message', (topic, message) => {
  const data = message.toString();
  const timestamp = new Date().toISOString();
  
  console.log(`📩 [${topic}]: ${data}`);
  
  switch(topic) {
    case topics.suhu:
      sensorData.suhu = parseFloat(data);
      break;
    case topics.humidity:
      sensorData.humidity = parseFloat(data);
      break;
    case topics.status:
      sensorData.status = data;
      break;
    case topics.relayStatus:
      sensorData.relayStatus = data;
      break;
  }
  
  sensorData.lastUpdate = timestamp;
});

// MQTT Error Handler
client.on('error', (err) => {
  console.error('MQTT Error:', err);
});

// ========== API ENDPOINTS ==========

// GET - Ambil data sensor terbaru
app.get('/api/sensor', (req, res) => {
  res.json({
    success: true,
    data: sensorData
  });
});

// POST - Kontrol relay (pompa)
app.post('/api/relay', (req, res) => {
  const { command } = req.body; // "ON" atau "OFF"
  
  if (command !== 'ON' && command !== 'OFF') {
    return res.status(400).json({
      success: false,
      message: 'Command harus "ON" atau "OFF"'
    });
  }
  
  // Publish command ke MQTT
  client.publish(topics.relayControl, command, (err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Gagal mengirim command',
        error: err.message
      });
    }
    
    res.json({
      success: true,
      message: `Relay ${command}`,
      command: command
    });
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    mqtt: client.connected ? 'Connected' : 'Disconnected' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});