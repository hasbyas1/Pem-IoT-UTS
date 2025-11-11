require('dotenv').config();
const express = require('express');
const mqtt = require('mqtt');
const cors = require('cors');
const db = require('./database');

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
    if (topic !== topics.relayControl) {
      client.subscribe(topic, (err) => {
        if (!err) {
          console.log(`Subscribe ke topic: ${topic}`);
        }
      });
    }
  });
});

// MQTT Message Handler
client.on('message', async (topic, message) => {
  const data = message.toString();
  const timestamp = new Date().toISOString();
  
  console.log(`[${topic}]: ${data}`);
  
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
  
  // SIMPAN KE DATABASE setiap kali ada update suhu DAN humidity
  if (sensorData.suhu > 0 && sensorData.humidity > 0) {
    try {
      await db.query(
        'INSERT INTO data_sensor (suhu, humidity, lux) VALUES (?, ?, ?)',
        [sensorData.suhu, sensorData.humidity, 0] // lux default 0
      );
      console.log('Data tersimpan ke database');
    } catch (err) {
      console.error('Error menyimpan ke database:', err);
    }
  }
});

// MQTT Error Handler
client.on('error', (err) => {
  console.error('MQTT Error:', err);
});

// ========== API ENDPOINTS ==========

// GET - Ambil data sensor terbaru (real-time dari MQTT)
app.get('/api/sensor', (req, res) => {
  res.json({
    success: true,
    data: sensorData
  });
});

// GET - Ambil data dari database dengan format JSON sesuai soal
app.get('/api/sensor/database', async (req, res) => {
  try {
    // Query untuk mendapatkan suhu max, min, dan rata-rata
    const [stats] = await db.query(`
      SELECT 
        MAX(suhu) as suhumax,
        MIN(suhu) as suhumin,
        AVG(suhu) as suhurata
      FROM data_sensor
    `);

    // Query untuk mendapatkan data dengan suhu dan humidity tertinggi
    const [maxData] = await db.query(`
      SELECT id as idx, suhu as suhun, humidity as humid, lux as kecerahan, timestamp
      FROM data_sensor
      WHERE suhu = (SELECT MAX(suhu) FROM data_sensor)
      ORDER BY timestamp DESC
      LIMIT 2
    `);

    // Query untuk mendapatkan data per bulan-tahun
    const [monthYear] = await db.query(`
      SELECT CONCAT(MONTH(timestamp), '-', YEAR(timestamp)) as month_year
      FROM data_sensor
      GROUP BY YEAR(timestamp), MONTH(timestamp)
      ORDER BY timestamp DESC
      LIMIT 2
    `);

    // Format response sesuai contoh di soal
    const response = {
      suhumax: stats[0].suhumax,
      suhumin: stats[0].suhumin,
      suhurata: parseFloat(stats[0].suhurata.toFixed(2)),
      nilai_suhu_max_humid_max: maxData,
      month_year_max: monthYear
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching database:', error);
    res.status(500).json({
      success: false,
      message: 'Error mengambil data dari database',
      error: error.message
    });
  }
});

// GET - Ambil semua data sensor dari database (untuk tabel)
app.get('/api/sensor/all', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, suhu, humidity, lux, timestamp
      FROM data_sensor
      ORDER BY timestamp DESC
      LIMIT 50
    `);
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching all data:', error);
    res.status(500).json({
      success: false,
      message: 'Error mengambil data',
      error: error.message
    });
  }
});

// POST - Kontrol relay (pompa)
app.post('/api/relay', (req, res) => {
  const { command } = req.body;
  
  if (command !== 'ON' && command !== 'OFF') {
    return res.status(400).json({
      success: false,
      message: 'Command harus "ON" atau "OFF"'
    });
  }
  
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