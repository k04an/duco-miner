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
            this.logger.log('Connecting to pool...')
            this.worker.connect(this.pool.port, this.pool.ip)

            // Обработчики событий
            // При подключении пул сразу отправляет версию сервера, которую мы получаем
            this.worker.on('connect', () => {
                this.logger.log('Connected!')
                this.worker.once('data', (version) => {
                    // TODO: Сделать что-нибудь с версией сервера
                    this.logger.log(`Pool version - v${version}`)
                    this.status = 'online'
                    this.#sendJobRequest()
                })
            })

            this.worker.on('close', (hadError) => this.logger.log('CONNECTION CLOSED!' + String(hadError)))
            this.worker.on('error', () => this.logger.log('GOT ERROR!'))
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
                let hash = crypto.createHash('sha1').update(previous + nonce).digest('hex')
                if (hash == expected) {
                    await this.logger.log('Hash is cracked!')
                    let jobEnd = performance.now()
                    this.performanceLog.shift()
                    this.performanceLog.push({
                        time: Math.round(jobEnd - jobStart),
                        HPS: Math.round(nonce / ((jobEnd - jobStart) / 1000))
                    })
                    // TODO: Добавить minerID для объеденения потоков в единый пункт в кошельке
                    // https://github.com/revoxhere/duino-coin/blob/master/PC_Miner.py:1250
                    this.worker.write(`${nonce},${Math.round(nonce / ((jobEnd - jobStart) / 1000))},NodeJS miner (k04an), ${this.rigName},,${this.threadId}`)
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
                    if (this.status == 'online') this.#sendJobRequest()
                }, 1000)
            })
        })
    }
}