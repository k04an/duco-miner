// cli.js
// Здесь описана логика вывода интерфейса командной строки

// Импортируем зависимости
const chalk = require('chalk')
const clui = require('clui')
const rl = require('readline')
const app = require('./app')
const os = require('os')

module.exports.data = {
    active: true,
    hashrateThrottle: false,
    nameReplace: false
}

// Запуск цикла отрисовки интерфейса
module.exports.init = () => {
    console.clear()

    flush()

    process.stdin.on('keypress', (str, key) => {
        switch (key.name) {
            case 'f2':
                module.exports.data.active = !module.exports.data.active
                app.toggleMiners(module.exports.data.active)
                flush()
                break
        }
    
        // Регистрируем комбинацию выхода из приложения, так как из-за перехвата
        // нажатий стандарная комбинация перестает работать
        if (key.name == 'c' && key.ctrl) process.exit()
    })

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

    // Заголовок блока общей информации
    new clui.Line(buffer)
        .padding(24)
        .column(chalk.cyan('General information'))
        .fill()
        .store()

    // Информация о ОС и суммарный хешрейт

    let totalHashrate = 0
    app.miners.forEach(miner => {
        let hpsSum = 0
        miner.performanceLog.forEach(entry => {
            hpsSum += entry.HPS
        }) 
        totalHashrate += Math.round(hpsSum / miner.performanceLog.length)
    })    

    new clui.Line(buffer)
        .column(`${chalk.cyan('OS:')} ${chalk.red(os.version())}`)
        .padding(3)
        .column(chalk.cyan(`Arch: ${chalk.red(os.arch())}`))
        .padding(3)
        .column(chalk.cyan(`CPU number: ${os.cpus().length == 0 ? chalk.bgRed.white('Unknown') : chalk.red(os.cpus().length)}`))
        .padding(3)
        .column(chalk.cyan(`Total hashrate: ${chalk.red(totalHashrate)} h/s`))
        .fill()
        .store()

    // Информация о загрузке процессора
    // Считаем среднюю загрузку процессора
    let avgCpuUsage = 0
    app.cpuUsages.forEach(cpuUsage => {
        avgCpuUsage += Number(cpuUsage)
    })
    avgCpuUsage = Math.round(avgCpuUsage / app.cpuUsages.length)
    
    // Определеяем сообщение на вывод
    let cpuStatus
    if (os.cpus().length == 0) cpuStatus = chalk.red('Unknown')
    else if (!avgCpuUsage) cpuStatus = chalk.green('Loading...')
    else cpuStatus = clui.Gauge(avgCpuUsage, 100, 40, 80, chalk.cyan(`${avgCpuUsage}%`))

    new clui.Line(buffer)
        .column(chalk.cyan('CPU usage: '))
        .column(cpuStatus)
        .fill()
        .store()

    new clui.Line(buffer)
        .fill()
        .store()

    // Рисуем заголовки таблицы
    new clui.Line(buffer)
        .column('Status', 10)
        .column('Performance (ms per hash)', 40)
        .column('Avarage hashrate')
        .fill()
        .store()

    // Выводим информацию о каждом майнере
    app.miners.forEach(miner => {
        // Считаем средний хешрейт
        let hpsSum = 0
        miner.performanceLog.forEach(entry => {
            hpsSum += entry.HPS
        })
        let avgHPS = Math.round(hpsSum / miner.performanceLog.length)

        // Определяем статус
        let status
        switch (miner.status) {
            case 'offline':
                status = chalk.red('Offline')
                break

            case 'online':
                status = chalk.green('Online')
                break
            
            case 'paused':
                status = chalk.yellow('Paused')
                break
        }

        new clui.Line(buffer)
            .column(status, 10)
            .column(clui.Sparkline(miner.performanceLog.map(entry => {return entry.time})), 40)
            .column(`${avgHPS} h/s`)
            .fill()
            .store()
    })

    // Выводим данные на экран и запускаем перехват нажатия кнопок
    buffer.output()
    process.stdin.resume()
    rl.emitKeypressEvents(process.stdin, buffer)
    if (process.stdin.isTTY) process.stdin.setRawMode(true)
}