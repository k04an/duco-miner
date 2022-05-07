// thread.js
// Здесь описана логика одного потока майнера

// Импортируем зависимости
const miner = require('./miner')
const { workerData, parentPort } = require('worker_threads')
const Logger = require('./logger')

// Создаем экземпляр майнера
const minerData = new miner(workerData.rigName, workerData.walletname, workerData.threadId, workerData.threadNumber)

const sendMinerData = () => {
    parentPort.postMessage(JSON.stringify(minerData))
}

// Обработчик получения команды от главного потока
parentPort.on('message', (command) => {
    switch (command) {
        case 'start':
            minerData.status = 'online'
            minerData.startMiners()
            break
        case 'stop':
            minerData.status = 'paused'
            break
    }
})

// Переодически отправляем информацию в главный поток
sendMinerData()
setInterval(() => {
    sendMinerData()
}, 1500)