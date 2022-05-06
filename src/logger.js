// logger.js
// Здесь описан класс логера. Записывает в лог-файл все что скажешь.

// Импортируем моудли
const fs = require('fs').promises
const path = require('path')

module.exports = class Logger {
    constructor (id) {
        this.id = id
    }

    async log(data) {
        const timeStamp = new Date()
        const msg = `[${this.id}][${timeStamp.toISOString()}] ${data}\n`
        await fs.appendFile(path.join(__dirname, '..', `thread${this.id}.log`), msg)
    }
}