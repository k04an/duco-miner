// thread.js
// Здесь описана логика одного потока майнера

// Импортируем зависимости
const miner = require('./miner')
const { workerData, parentPort } = require('worker_threads')

const minerData = new miner(workerData.id, 'Custom rig', workerData.walletname)

parentPort.postMessage({
    id: minerData.id,
    isOnline: minerData.isOnline,
    performanceLog: minerData.performanceLog
})

setInterval(() => {
    parentPort.postMessage({
        id: minerData.id,
        isOnline: minerData.isOnline,
        performanceLog: minerData.performanceLog
    })
}, 1500)