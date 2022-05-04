// thread.js
// Здесь описана логика одного потока майнера

// Импортируем зависимости
const miner = require('./miner')
const { workerData, parentPort } = require('worker_threads')

const minerData = new miner('Custom rig', workerData.walletname)

const sendMinerData = () => {
    parentPort.postMessage(JSON.stringify(minerData))
}

// Переодически отправляем информацию в главный поток
sendMinerData()
setInterval(() => {
    sendMinerData()
}, 1500)