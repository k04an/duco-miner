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
        module.exports.miners = []
        module.exports.threads = []
        // Генерирум число-идентификатор, позволяющее объединить потоки майнера
        // в единую строку в кошельке
        let threadId = Math.round(Math.random() * 2811)

        // Создаем потоки
        for (let minerId = 0; minerId < options.threadsNumber; minerId++) {
            let thread = new Worker(path.join(__dirname, 'thread.js'), {
                workerData: {
                    walletname: options.walletname,
                    threadId: threadId
                }
            })
            module.exports.threads.push(thread)

            // Получаем копию экземпляра майнера в массив
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