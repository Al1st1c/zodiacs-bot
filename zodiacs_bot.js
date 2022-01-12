const axios = require('axios')
const colors = require('colors')
const cf = require('cfonts');
const fs = require('fs')

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Get config file
const config = fs.readFileSync(`./config.txt`, 'utf-8').toString();

// var totalRaces = 0
var carsIds = []

let sumZDC = 0
let bodyPayload = JSON.parse(config.split('=')[1])

let startRaceRoute = 'https://prfnbjckmlbo.usemoralis.com:2053/server/functions/battlefield_startRace'
let checkRaceRoute = 'https://prfnbjckmlbo.usemoralis.com:2053/server/functions/battlefield_claimReward'
let getCarsRoute = 'https://prfnbjckmlbo.usemoralis.com:2053/server/functions/user_getData'


// Don't change this line please...
cf.say('CHEATDUO.IO', { font: 'huge' });


async function raceStepOne(body) {
    try {
        const getInfoStartRace = await axios.post(startRaceRoute, body)
        if (getInfoStartRace.status == 200) {
            return { error: 0, status: 200, message: '[ 🟠 ] - RACE STARTED !!', racesOk: getInfoStartRace.data.result.racingCount }
        }
        // console.log(getInfoStartRace)
    } catch (error) {

        if(error?.response?.status === 502){
            return raceStepOne(body)
        }else{

        if (error.message == 'Error: Request failed with status code 502') {
            return { error: 1, status: 502, message: '[ 🔴 ] -> Server Down' }
        }

        if(error.response.data.error === 'You reach the racing quota per day. Please try again tomorrow (UTC time).'){
            return { error : 2, message: '[ 🔴 ] -> This car has already reached the racing limit today.'}
        }
        
        if(error.response.data.error === 'You have already a car on racing'){
            return { error: 0, status: 200, message: '[ 🟠 ] - RACE ALREADY ON RACING !!', racesOk: 0 }
        }

        if(error.response.data.error == 'Validation failed. Please login to continue.'){
            return raceStepOne(body)
            // return {error: 1, status: 0, message: '[ 🔴 ] -> '+ error.response.data.error + ' [ PLEASE FIX "REQUEST" IN CONFIG ]'}
        }

        if (error.message == 'Request failed with status code 400') {
            return { error: 0, status: 400, message: '[ 🟠 ] -> Race already started!' }
        }

        
    }

        return { error: 0 }
    }
}


async function checkStepTwo(body2) {
    try {
        const getInfoCheckRace = await axios.post(checkRaceRoute, body2)
        return getInfoCheckRace.data
    } catch (error) {
        if (error.response.data.error == 'Your car is on racing. Please wait.'){
            console.log('⏰  -> Wait to finish the race.'.yellow )
            await sleep(9000)
            return checkStepTwo(body2)
        }

        if(error.response.data.error == 'Validation failed. Please login to continue.'){
            return checkStepTwo(body2)
            // return {error: 1, status: 0, message: '[ 🔴 ] -> '+ error.response.data.error + ' [ PLEASE FIX "REQUEST" IN CONFIG ]'}
        }
        if (error.response.data.error == 'You have no car on racing'){
            return raceStepOne(body2)
        }
        if (error.response.data.code !== 200) {
            return checkStepTwo(body2)
        }
        return error.response.data
    }
}

async function getListCars() {
    try {
        // Check Users
        const check = await axios.post('https://prfnbjckmlbo.usemoralis.com:2053/server/functions/user_checkSession', bodyPayload)
        if(check.data.result.isOk !== true) return {error: 1, status: 0, message: '[ 🔴 ] -> Account is invalid!'}
        const list = await axios.post(getCarsRoute, bodyPayload)
        const cars = list.data.result.userCars

        if(cars.length){
            for(let itera of cars ){
                carsIds.push({id: itera.objectId, totalRaces: itera.racingCount || 0, zdcTotal: 0})
            }
            return { error: 0, message: `[ 🚗🚙 ] -> CARS LISTED !! - CARS: ${carsIds.length}`};
        }
        return { error: 1, message: '[ 🔴 ] -> NO EXISTS CARS'};
        
    } catch (error) {
        if(error.message == 'Request failed with status code 502') return getListCars();
        return { error: 1, message: error.message}
    }
}

async function start() {
    try {
        // FOR DOS CARROS
        const getQtdCars = await getListCars()
        if(getQtdCars.error == 1) return console.log(`${getQtdCars.message}`.red)
        console.log(`${getQtdCars.message}`.green)
        for(const [key, cars] of Object.entries(carsIds)){
            var body = {userCarId: cars.id, ...bodyPayload}
            await sleep(2000)
            // CORRIDA COM 1 CARRO
            while(cars.totalRaces <= 12){
                // console.log(body)
                const retorno = await raceStepOne(body)
                if(await isException(retorno.error) == true){
                    carsIds[key].totalRaces = 13
                    console.log(`[${cars.id}] - ${retorno.message}`.red)
                    continue;
                }

                if(retorno.racesOk){
                    carsIds[key].totalRaces = retorno.racesOk
                }
                console.log(`[${cars.id}]${retorno.message}  -> 🚖 RACES : ${carsIds[key].totalRaces}`.magenta)
                
                if (retorno.error == 0) {
                    console.log(`[${cars.id}][ 🟡 ] - CHECKING RESULT . . . .`.yellow)
                    const retorno2 = await checkStepTwo(body)
                    if(await isException(retorno2.error) == true){
                        carsIds[key].totalRaces = 13
                        console.log(`[${cars.id}] - ${retorno.message}`.red)
                        continue;
                    }
            
                    sumZDC += retorno2.result.result.rewardTokens
                    carsIds[key].zdcTotal +=  retorno2.result.result.rewardTokens
                    console.log(`[ 🟢 ] ZDC WON :  ${retorno2.result.result.rewardTokens} -> 💲 TOTAL: ${sumZDC}\n`.green)
                }

            }

        }
        console.log(`[ 🟩 ] - TOTAL CARS: \n${carsIds.map(x=> `[${x.id}] - ZDC: ${x.zdcTotal}\n`)}`.green)

    } catch (error) {
        console.log(error)
    }
}



async function isException(error) {
    if(error == 2){
        return true
    }
    return false
}

start()
