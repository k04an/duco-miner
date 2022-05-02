// app.js
// Главный файл приложения реализующий основную логику

// Получаем данные из файла .env
require('dotenv').config()

// Импортируем зависимости
const miner = require('./miner')
const cli = require('./cli')
const options = require('./options')