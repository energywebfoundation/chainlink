/* eslint-disable @typescript-eslint/no-var-requires */

// truffle script

const abi = require('ethereumjs-abi')

const chainLink = require('')

const fs = require('fs')
const request = require('request-promise').defaults({ jar: true })
const url = require('url')
const { abort, DEVNET_ADDRESS, scriptRunner } = require('../common.js')

const Coordinator = artifacts.require('Coordinator')

const LinkToken = artifacts.require('LinkToken')
const { CHAINLINK_URL, ECHO_SERVER_URL } = process.env

const creationUrl = url.resolve(CHAINLINK_URL, '/service_agreements')

const credentials = { email: 'notreal@fakeemail.ch', password: 'twochains' }

const amount = web3.utils.toBN(web3.utils.toWei('1000'))

const agreement = JSON.parse(fs.readFileSync('./agreement.json', 'utf8'))

