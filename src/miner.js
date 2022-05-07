// miner.js
// Здесь описан класс майнера

// Импортируем зависимости
const net = require('net')
const fetch = require('node-fetch')
const crypto = require('crypto')
const Logger = require('./logger')

// Описание класса
module.exports = class MinerThread {
    constructor(rigName, username, threadId, logId) {
        (async () => {
            // Задаем свойства класса
            this.rigName = rigName
            this.username = username
            this.performanceLog = []
            this.status = 'offline'
            this.threadId = threadId
            this.logId = logId

            for (let i = 0; i < 20; i++) {
                this.performanceLog.push({time: 0, HPS: 0})
            }

            // Создаем TCP сокет для связи с сервером
            this.worker = new net.Socket()
            this.worker.setEncoding('utf-8')

            this.logger = new Logger(this.logId)

            this.logger.log('Getting pool...')
            // Получаем пул
            this.pool = await this.#getPool()
            this.logger.log(`Got pool - ${JSON.stringify(this.pool)}`)

            // Подключаемся к пулу
            await this.#connectToPool()

            // При неожиданном разрыве соединения, переподключаемся и продолжаем майнить
            this.worker.on('close', async () => {
                if (this.status === 'online') {
                    this.status = 'offline'
                    await this.logger.log('CONNECTION CLOSED! Reconnecting...')

                    // Делаем небольшую задержку, для того чтобы создались обработчики
                    // которые должны быть удалены
                    setTimeout(async () => {
                        // Удалаяем оставшиеся обработчики во избежании отправки лишних запросов
                        this.worker.removeAllListeners('data')

                        // Запрашиваем новую задачу
                        await this.#connectToPool()
                        this.#sendJobRequest()
                    }, 1000)
                }
            })

            // Запрашиваем задачу
            this.#sendJobRequest()
            return
        })()
    }

    startMiners() {
        this.#sendJobRequest()
    }

    async #getPool() {
        let response = await fetch('https://server.duinocoin.com/getPool')
        return await response.json()
    }

    #connectToPool() {
        return new Promise((resolve, reject) => {
            this.logger.log('Connecting to pool...')
            this.worker.connect(this.pool.port, this.pool.ip)

            // При подключении, пул сразу отправляет версию сервера, которую мы получаем
            this.worker.once('connect', () => {
                this.logger.log('Connected!')
                this.worker.once('data', (version) => {
                    // TODO: Сделать что-нибудь с версией сервера
                    this.logger.log(`Pool version - v${version}`)
                    this.status = 'online'
                    resolve()
                })
            })
        })
    }

    #sendJobRequest() {
        // Отправляем запрос на получение задачи
        this.logger.log('Requesting job...')
        this.worker.write(`JOB,${this.username},LOW`)

        // По получению задачи
        this.worker.once('data', async (data) => {
            await this.logger.log(`Got job - ${data}`)
            let jobStart = performance.now()
            let job = data.split(',')
            let previous = job[0]
            let expected = job[1]
            let difficulty = job[2]
            let isHashFound = false

            // Для нахождения добавочного числа (ответа), проходимся по циклу, размер которого
            // меняется в зависимости от сложности задачи
            await this.logger.log('Start solving...')
            for (let nonce = 0; nonce < 100 * difficulty + 1; nonce++) {
                // Создаем хеш
                let hash = crypto.createHash('sha1').update(previous + nonce).digest('hex')

                // Если созданный хеш совпадает с тем что отправил нам сервер...
                if (hash == expected) {
                    await this.logger.log('Hash is cracked!')

                    // Записываем время потраченное на взлом хеша
                    let jobEnd = performance.now()
                    this.performanceLog.shift()
                    this.performanceLog.push({
                        time: Math.round(jobEnd - jobStart),
                        HPS: Math.round(nonce / ((jobEnd - jobStart) / 1000))
                    })

                    // Отправляем результат
                    if (this.status === 'online') this.worker.write(`${nonce},${Math.round(nonce / ((jobEnd - jobStart) / 1000))},NodeJS miner (k04an), ${this.rigName},,${this.threadId}`)
                    break
                }
            }
            await this.logger.log('Loop is over!')

            // После отправки разгадонного ответа, ждем подтвержение что он был корректен
            this.logger.log('Waiting for response...')
            this.worker.once('data', (response) => {
                this.logger.log(`Got response - ${response}`)
                switch (response) {
                    case 'GOOD':
                        // TODO: Как-нибудь обработать успешное разгадывание (статистика или типо того)
                        break

                    case 'BAD':
                        // TODO: Как-нибудь обработать неудачное разгадывание (статистика или типо того)
                        break
                }
                // TODO: Добавить завершения разгадываения
                setTimeout(() => {
                    this.#sendJobRequest()
                }, 1000)
            })
        })
    }
}