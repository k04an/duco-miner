// cli.js
// Здесь описана логика вывода интерфейса командной строки

// Импортируем зависимости
const chalk = require('chalk')
const clui = require('clui')
const rl = require('readline')
const app = require('./app')

module.exports.data = {
    active: true,
    hashrateThrottle: false,
    nameReplace: false
}

process.stdin.on('keypress', (str, key) => {
    switch (key.name) {
        case 'f2':
            module.exports.data.active = !module.exports.data.active
            flush()
            break
    }

    // Регистрируем комбинацию выхода из приложения, так как из-за перехвата
    // нажатий стандарная комбинация перестает работать
    if (key.name == 'c' && key.ctrl) process.exit()
})

// Запуск цикла отрисовки интерфейса
module.exports.init = () => {
    console.clear()

    flush()

    setInterval(() => {
        flush()
    }, 3000)
}

// Функция для формирования и вывода буфера на экран
const flush = () => {
    // Создаем буфер
    buffer = new clui.LineBuffer({
        x: 0,
        y: 0,
        width: 'console',
        height: 'console'
    })

    // Рисуем вернее меню
    new clui.Line(buffer)
    .column(module.exports.data.active ? chalk.green('[F2] Pause') : chalk.red('[F2] Resume'))
    .padding(3)
    // TODO: Поменять цвет текст после реализации тротлинга
    .column(module.exports.data.hashrateThrottle ? chalk.gray('[F4] Throttle: Enabled') : chalk.gray('[F4] Throttle: Disabled'))
    .padding(3)
    // TODO: Поменять цвет текст после реализации обхода системы штрафов
    .column(module.exports.data.hashrateThrottle ? chalk.gray('[F5] Kolka bypass: Enabled') : chalk.gray('[F5] Kolka bypass: Disabled'))
    .fill()
    .store()

    // Отступ
    new clui.Line(buffer)
        .fill()
        .store()

    // Рисуем заголовки таблицы
    new clui.Line(buffer)
        .column('Miner ID', 15)
        .column('Status', 10)
        .column('Performance (ms per hash)', 45)
        .column('Avarage hashrate')
        .fill()
        .store()

    // Выводим информацию о каждом майнере
    app.miners.forEach(miner => {
        let hpsSum = 0
        miner.performanceLog.forEach(entry => {
            hpsSum += entry.HPS
        })
        new clui.Line(buffer)
            .column(miner.id, 15)
            .column(miner.isOnline ? chalk.green('Online') : chalk.red('Offline'), 10)
            .column(clui.Sparkline(miner.performanceLog.map(entry => {return entry.time})), 45)
            .column(`${hpsSum / miner.performanceLog.length} h/s`)
            .fill()
            .store()
    })

    // Выводим данные на экран и запускаем перехват нажатия кнопок
    buffer.output()
    process.stdin.resume()
    rl.emitKeypressEvents(process.stdin, buffer)
    process.stdin.setRawMode(true)
}