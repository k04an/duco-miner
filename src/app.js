// app.js
// Главный файл приложения реализующий основную логику

// Импортируем зависимости
const path = require('path')
require('dotenv').config({
    path: path.join(__dirname, '..', '.env')
})
const cli = require('./cli')
const options = require('./options')
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
            setTimeout(() => {
                let thread = new Worker(path.join(__dirname, 'thread.js'), {
                    workerData: {
                        walletname: options.walletname,
                        threadId: threadId,
                        threadNumber: minerId,
                        rigName: options.rigName
                    }
                })
                module.exports.threads.push(thread)
    
                // Получаем копию экземпляра майнера в массив
                thread.on('message', (miner) => {
                    module.exports.miners[minerId] = JSON.parse(miner)
                })
            }, minerId * 1000)
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