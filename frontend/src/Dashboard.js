import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = () => {
  const [sensorData, setSensorData] = useState({
    suhu: 0,
    humidity: 0,
    status: 'Menunggu data...',
    relayStatus: 'OFF',
    lastUpdate: null
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data dari backend
  const fetchData = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/sensor');
      if (response.data.success) {
        setSensorData(response.data.data);
        setLoading(false);
        setError(null);
      }
    } catch (err) {
      setError('Gagal mengambil data dari backend');
      setLoading(false);
      console.error('Error fetching data:', err);
    }
  };

  // Kontrol relay
  const controlRelay = async (command) => {
    try {
      const response = await axios.post('http://localhost:5000/api/relay', {
        command: command
      });
      
      if (response.data.success) {
        console.log(`Relay ${command} berhasil`);
        // Langsung update data setelah kontrol
        fetchData();
      }
    } catch (err) {
      console.error('Error controlling relay:', err);
      alert('Gagal mengontrol pompa!');
    }
  };

  // Auto-refresh setiap 2 detik
  useEffect(() => {
    fetchData(); // Fetch pertama kali
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval); // Cleanup
  }, []);

  // Get status color
  const getStatusColor = () => {
    if (sensorData.status.includes('BAHAYA')) return '#dc3545';
    if (sensorData.status.includes('HATI-HATI')) return '#ffc107';
    return '#28a745';
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Belum ada data';
    const date = new Date(timestamp);
    return date.toLocaleString('id-ID');
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🌱 Sistem Monitoring Hidroponik IoT</h1>
        <p className="subtitle">Real-time Monitoring & Control</p>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="cards-container">
        {/* Card Suhu */}
        <div className="card">
          <div className="card-icon">🌡️</div>
          <div className="card-content">
            <h3>Suhu</h3>
            <div className="card-value">{sensorData.suhu.toFixed(2)}°C</div>
          </div>
        </div>

        {/* Card Kelembapan */}
        <div className="card">
          <div className="card-icon">💧</div>
          <div className="card-content">
            <h3>Kelembapan</h3>
            <div className="card-value">{sensorData.humidity.toFixed(2)}%</div>
          </div>
        </div>

        {/* Card Status */}
        <div className="card status-card" style={{ borderColor: getStatusColor() }}>
          <div className="card-icon">📊</div>
          <div className="card-content">
            <h3>Status Sistem</h3>
            <div className="status-text" style={{ color: getStatusColor() }}>
              {sensorData.status}
            </div>
          </div>
        </div>
      </div>

      {/* Kontrol Pompa */}
      <div className="control-panel">
        <h2>🚰 Kontrol Pompa</h2>
        <div className="relay-status">
          Status Pompa: 
          <span className={`status-badge ${sensorData.relayStatus === 'ON' ? 'status-on' : 'status-off'}`}>
            {sensorData.relayStatus}
          </span>
        </div>
        <div className="button-group">
          <button 
            className="btn btn-on"
            onClick={() => controlRelay('ON')}
            disabled={sensorData.relayStatus === 'ON'}
          >
            ▶️ Hidupkan Pompa
          </button>
          <button 
            className="btn btn-off"
            onClick={() => controlRelay('OFF')}
            disabled={sensorData.relayStatus === 'OFF'}
          >
            ⏸️ Matikan Pompa
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>📡 Last Update: {formatTime(sensorData.lastUpdate)}</p>
        <p className="info-text">Data diperbarui setiap 2 detik secara otomatis</p>
      </footer>
    </div>
  );
};

export default Dashboard;