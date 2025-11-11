CREATE DATABASE IF NOT EXISTS uts_iot_hidroponik_db;
USE uts_iot_hidroponik_db;

CREATE TABLE IF NOT EXISTS data_sensor (
  id INT AUTO_INCREMENT PRIMARY KEY,
  suhu FLOAT NOT NULL,
  humidity FLOAT NOT NULL,
  lux INT DEFAULT 0,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO data_sensor (suhu, humidity, lux) VALUES 
(28.5, 65.2, 0),
(30.2, 70.5, 0),
(32.1, 68.3, 0),
(35.5, 72.1, 0),
(29.8, 66.7, 0);