/* eslint-disable @typescript-eslint/no-var-requires */

// truffle script

const chai = require('chai')
global.web3 = require('web3') // XXX: These are needed for helpers.js, for now.
global.assert = chai.assert

// XXX: Hopefully there'll be a nicer way to access this, by the time this is
// ready.
const chainLink = require('../../evm/dist/src/helpers.js')

const fs = require('fs')
const request = require('request-promise').defaults({ jar: true })
const url = require('url')
const { abort, DEVNET_ADDRESS, scriptRunner } = require('../common.js')

console.log('cwd', __dirname)
const CoordinatorABI = JSON.parse(
  fs.readFileSync('../../evm/v0.5/build/contracts/Coordinator.json', 'utf8'),
).abi
const coordinatorAddress = process.env.COORDINATOR_ADDRESS
const Coordinator = new web3.eth.Contract(CoordinatorABI, coordinatorAddress)
Coordinator.abi = CoordinatorABI

const agreement = JSON.parse(fs.readFileSync('../agreement.json', 'utf8'))

const amount = web3.utils.toBN(web3.utils.toWei('1000'))

const stripQuotes = s => s.replace(/"(0x[0-9a-fA-F]+)"/, '$1')
const rawSignature = stripQuotes(process.env.ORACLE_SIGNATURE)

agreement.oracleSignatures = [chainLink.newSignature(rawSignature)]
agreement.requestDigest = web3.utils.keccak256(
  stripQuotes(process.env.NORMALIZED_REQUEST),
)
agreement.sAID = chainLink.calculateSAID2(agreement)

module.exports = async function(callback) {
  console.log('foo')
  console
    .log(
      'initiateServiceAgreementCall',
      await chainLink.initiateServiceAgreementCall(Coordinator, agreement),
    )
    .catch(err => {
      console.log('initiateServiceAgreementCall', err)
      callback(err)
    })
  console.log('bar')
  console
    .log(
      'oracleRequest',
      await Coordinator.oracleRequest(
        agreement.sAID,
        '0x0101010101010101010101010101010101010101', // Receiving contract address
        '0x12345678', // receiving method selector
        1, // nonce
        '', // data for initialization of request
      ),
    )
    .catch(err => {
      console.log('oracleRequest', err)
      callback(err)
    })
  console.log('baz')
  callback()
}
