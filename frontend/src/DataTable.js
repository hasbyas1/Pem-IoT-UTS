import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DataTable.css';

const DataTable = () => {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('realtime');

  // Fetch data dari database
  const fetchDatabaseData = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/sensor/all');
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching database data:', err);
    }
  };

  // Fetch statistik (format JSON sesuai soal)
  const fetchStats = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/sensor/database');
      setStats(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseData();
    fetchStats();
    
    // Auto refresh setiap 5 detik
    const interval = setInterval(() => {
      fetchDatabaseData();
      fetchStats();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Format timestamp
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return <div className="loading-table">Loading data...</div>;
  }

  return (
    <div className="data-table-container">
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'realtime' ? 'active' : ''}`}
          onClick={() => setActiveTab('realtime')}
        >
        Data Real-time
        </button>
        <button 
          className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
        Statistik & JSON
        </button>
      </div>

      {activeTab === 'realtime' && (
        <div className="table-wrapper">
          <h2>Riwayat Data Sensor (50 Data Terakhir)</h2>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Suhu (°C)</th>
                  <th>Kelembapan (%)</th>
                  <th>Kecerahan (Lux)</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.suhu.toFixed(2)}</td>
                    <td>{row.humidity.toFixed(2)}</td>
                    <td>{row.lux}</td>
                    <td>{formatDate(row.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'stats' && stats && (
        <div className="stats-wrapper">
          <h2>Statistik Data & Format JSON</h2>
          
          <div className="stats-cards">
            <div className="stat-card">
              <h3>Suhu Maksimum</h3>
              <div className="stat-value">{stats.suhumax}°C</div>
            </div>
            <div className="stat-card">
              <h3>Suhu Minimum</h3>
              <div className="stat-value">{stats.suhumin}°C</div>
            </div>
            <div className="stat-card">
              <h3>Suhu Rata-rata</h3>
              <div className="stat-value">{stats.suhurata}°C</div>
            </div>
          </div>

          <div className="json-section">
            <h3>Response JSON (Format Sesuai Soal UTS)</h3>
            <div className="json-viewer">
              <pre>{JSON.stringify(stats, null, 2)}</pre>
            </div>
          </div>

          {stats.nilai_suhu_max_humid_max && stats.nilai_suhu_max_humid_max.length > 0 && (
            <div className="max-data-section">
              <h3>Data dengan Suhu Tertinggi</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Suhu (°C)</th>
                    <th>Kelembapan (%)</th>
                    <th>Kecerahan (Lux)</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.nilai_suhu_max_humid_max.map((row, index) => (
                    <tr key={index}>
                      <td>{row.idx}</td>
                      <td>{row.suhun}</td>
                      <td>{row.humid}</td>
                      <td>{row.kecerahan}</td>
                      <td>{formatDate(row.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataTable;