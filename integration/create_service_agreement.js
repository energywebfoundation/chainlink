/* eslint-disable @typescript-eslint/no-var-requires */

// truffle script

const abi = require('ethereumjs-abi')

const chainLink = require('../evm/dist/src/helpers.js')

const fs = require('fs')
const request = require('request-promise').defaults({ jar: true })
const url = require('url')
const { abort, DEVNET_ADDRESS, scriptRunner } = require('../common.js')

const Coordinator = artifacts.require('Coordinator.sol')

const

const amount = web3.utils.toBN(web3.utils.toWei('1000'))

const agreement = JSON.parse(fs.readFileSync('./agreement.json', 'utf8'))

