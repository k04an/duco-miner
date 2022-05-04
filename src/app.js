// app.js
// Главный файл приложения реализующий основную логику

// Получаем данные из файла .env
require('dotenv').config()

// Импортируем зависимости
const cli = require('./cli')
const options = require('./options')
const path = require('path')
const { Worker } = require('worker_threads')

// Получаем данные настроек
options.getOptions()
    .then(options => {
        // Создаем майнеры
        module.exports.miners = []
        module.exports.threads = []
        for (let minerId = 0; minerId < options.threadsNumber; minerId++) {
            let thread = new Worker(path.join(__dirname, 'thread.js'), {
                workerData: {
                    walletname: options.walletname,
                }
            })
            module.exports.threads.push(thread)

            thread.on('message', (miner) => {
                module.exports.miners[minerId] = JSON.parse(miner)
            })
            
        }
        
        // Функция для отправки стоп команды в потоки
        module.exports.toggleMiners = (active) => {
            module.exports.threads.forEach(thread => {
                if (active) thread.postMessage('start')
                else thread.postMessage('stop')
            })
        }

        // Отрисовываем интерфейс
        cli.init()
    })