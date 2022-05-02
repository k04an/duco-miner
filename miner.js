// MinerThread.js
// Здесь описан класс еденичного потока майнера, который может быть размножен

// Импортируем зависимости
const net = require('net')
const fetch = require('node-fetch')
const crypto = require('crypto')

// Описание класса
module.exports = class MinerThread {
    constructor(rigName, username) {
        (async () => {
            // Задаем свойства класса
            this.rigName = rigName
            this.username = username
            this.performanceLog = []

            // Получаем пул
            this.pool = await this.#getPool()

            // Создаем TCP сокет для связи с сервером
            this.worker = new net.Socket()
            this.worker.setTimeout(6000)
            this.worker.setEncoding('utf-8')
            this.worker.connect(this.pool.port, this.pool.ip)

            // Обработчики событий
            // При подключении пул сразу отправляет версию сервера, которую мы получаем
            this.worker.on('connect', () => {
                this.worker.once('data', () => {
                    // TODO: Сделать что-нибудь с версией сервера
                    this.#sendJobRequest()
                })
            })
            return
        })()
    }

    async #getPool() {
        let response = await fetch('https://server.duinocoin.com/getPool')
        let data = await response.json()
        console.log(data)
        return data
    }

    #sendJobRequest() {
        // Отправляем запрос на получение задачи
        this.worker.write(`JOB,${this.username},LOW`)

        // По получению задачи
        this.worker.once('data', (data) => {
            let jobStart = performance.now()
            let job = data.split(',')
            let previous = job[0]
            let expected = job[1]
            let difficulty = job[2]
            let isHashFound = false

            // Для нахождения добавочного числа (ответа), проходимся по циклу, размер которого
            // меняется в зависимости от сложности задачи
            for (let nonce = 0; nonce < 100 * difficulty + 1; nonce++) {
                let hash = crypto.createHash('sha1').update(previous + nonce).digest('hex')
                if (hash == expected) {
                    let jobEnd = performance.now()
                    this.performanceLog.push({
                        time: jobEnd - jobStart,
                        HPS: nonce / (jobEnd - jobStart)
                    })
                    this.worker.write(`${nonce},${nonce / ((jobEnd - jobStart) / 1000)},NodeJS miner (k04an), ${this.rigName}`)
                    break
                }
            }

            // После отправки разгадонного ответа, ждем подтвержение что он был корректен
            this.worker.once('data', (response) => {
                switch (response) {
                    case 'GOOD':
                        // TODO: Как-нибудь обработать успешное разгадывание (статистика или типо того)
                        break

                    case 'BAD':
                        // TODO: Как-нибудь обработать неудачное разгадывание (статистика или типо того)
                        break
                }
                // TODO: Добавить завершения разгадываения
                this.#sendJobRequest()
            })
        })
    }
}