// options.js
// Данный модуль проверяет заполненость файла .env
// и при отсутствии нужной информации получает ее от пользователя

// Импортируем зависимости
const inquirer = require('inquirer')
const OS = require('os')
const fs = require('fs').promises
const path = require('path')

// Пишем данные из .env в объект
let userdata = {
    walletname: process.env.walletname,
    threadsNumber: process.env.threads_number,
    rigName: process.env.rig_name
}

module.exports.getOptions = async () => {
    return new Promise((resolve, reject) => {
        // Запрашиваем у пользователя недостающие данные
        inquirer
        .prompt(
            [
                {
                    type: 'input',
                    name: 'walletname',
                    message: 'Enter name of your DUCO wallet:'
                },
                {
                    type: 'input',
                    name: 'threadsNumber',
                    message: `Number of threads to use (max ${OS.cpus().length == 0 ? 'whatever' : OS.cpus().length})`,
                    validate(answer) {
                        if (!Number(answer) || (Number(answer) > OS.cpus().length && OS.cpus().length != 0)) return false
                        else return true
                    },  
                    filter(answer) {
                        return Math.round(answer)
                    }
                },
                {
                    type: 'input',
                    name: 'rigName',
                    message: 'Name for the rig (random by default):',
                    filter(answer) {
                        // При пустом ответе, создаем случайное имя для рига
                        if (answer == '') return 'Node-' + (Math.random() + 1).toString(36).substring(2)
                        else return answer
                    }
                }
            ],
            userdata
        )
        .then(async (answers) => {
            userdata = answers
            
            // Переписываем .env с новыми данными
            // FIXME: Файл переписывается при любом расскладе, даже если .env полностью заполнен
            let data =`walletname=${userdata.walletname}\n`
            data += `threads_number=${userdata.threadsNumber}\n`
            data += `rig_name=${userdata.rigName}`
            await fs.writeFile(path.join(__dirname, '..', '.env'), data)

            resolve(userdata)
        })
    })
}