/* eslint-disable @typescript-eslint/no-var-requires */

// truffle script

//console.log("###########", process.env)
const abi = require('ethereumjs-abi')
global.web3 = require('web3')

const chainLink = require('../../evm/dist/src/helpers.js')

const fs = require('fs')
const request = require('request-promise').defaults({ jar: true })
const url = require('url')
const { abort, DEVNET_ADDRESS, scriptRunner } = require('../common.js')

const CoordinatorABI = JSON.parse(fs.readFileSync('../../evm/v0.5/build/contracts/Coordinator.json', 'utf8'))
const coordinatorAddress = process.env.COORDINATOR_ADDRESS
console.log("!!!!!!!!!!!!!!!", coordinatorAddress)
const Coordinator = new web3.eth.Contract(CoordinatorABI, coordinatorAddress)
console.log("@@@@@@@@@@@@@", Coordinator)

const agreement = JSON.parse(fs.readFileSync('./agreement.json', 'utf8'))

const amount = web3.utils.toBN(web3.utils.toWei('1000'))
