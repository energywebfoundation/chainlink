import cbor from 'cbor'
import TruffleContract from 'truffle-contract'
import { linkToken } from './linkToken'
import { assertBigNum } from './matchers'
import * as abi from 'ethereumjs-abi'
import BN from 'bn.js'
import * as util from 'ethereumjs-util'

import { FunctionFragment, ParamType } from 'ethers/utils/abi-coder'

const HEX_BASE = 16

// https://github.com/ethereum/web3.js/issues/1119#issuecomment-394217563
web3.providers.HttpProvider.prototype.sendAsync =
  web3.providers.HttpProvider.prototype.send
export const eth = web3.eth

export interface Roles {
  defaultAccount: string
  oracleNode: string
  oracleNode1: string
  oracleNode2: string
  oracleNode3: string
  stranger: string
  consumer: string
}

export interface Personas {
  Default: string
  Neil: string
  Ned: string
  Nelly: string
  Carol: string
  Eddy: string
}

interface RolesAndPersonas {
  roles: Roles
  personas: Personas
}

/**
 * Generate roles and personas for tests along with their corrolated account addresses
 */
export async function initializeRolesAndPersonas(): Promise<RolesAndPersonas> {
  const [
    defaultAccount,
    oracleNode1,
    oracleNode2,
    oracleNode3,
    stranger,
    consumer,
  ] = await eth.getAccounts()

  const personas: Personas = {
    Default: defaultAccount,
    Neil: oracleNode1,
    Ned: oracleNode2,
    Nelly: oracleNode3,
    Carol: consumer,
    Eddy: stranger,
  }

  const roles: Roles = {
    defaultAccount,
    oracleNode: oracleNode1,
    oracleNode1,
    oracleNode2,
    oracleNode3,
    stranger,
    consumer,
  }

  return { personas, roles }
}

const bNToStringOrIdentity = (a: any): any => (BN.isBN(a) ? a.toString() : a)

// Deal with transfer amount type truffle doesn't currently handle. (BN)
export const wrappedERC20 = (contract: any): any => ({
  ...contract,
  transfer: async (address: any, amount: any) =>
    contract.transfer(address, bNToStringOrIdentity(amount)),
  transferAndCall: async (
    address: any,
    amount: any,
    payload: any,
    options: any,
  ) =>
    contract.transferAndCall(
      address,
      bNToStringOrIdentity(amount),
      payload,
      options,
    ),
})

export const linkContract = async (account: string): Promise<any> => {
  if (!account) {
    throw Error('No account supplied as a parameter')
  }
  const receipt = await web3.eth.sendTransaction({
    data: linkToken.bytecode,
    from: account,
    gas: 2000000,
  })
  const contract = TruffleContract({ abi: linkToken.abi })
  contract.setProvider(web3.currentProvider)
  contract.defaults({
    from: account,
    gas: 3500000,
    gasPrice: 10000000000,
  })

  return wrappedERC20(await contract.at(receipt.contractAddress))
}

export const bigNum = (num: any) => web3.utils.toBN(num)
// TODO: dont call assertions on import
assertBigNum(
  bigNum('1'),
  bigNum(1),
  'Different representations should give same BNs',
)

// toWei(n) is n * 10**18, as a BN.
export const toWei = (num: string | number): any =>
  bigNum(web3.utils.toWei(bigNum(num)))
// TODO: dont call assertions on import
assertBigNum(
  toWei('1'),
  toWei(1),
  'Different representations should give same BNs',
)

export const toUtf8 = web3.utils.toUtf8

export const keccak = web3.utils.sha3

export const hexToInt = (str: string): any => bigNum(str).toNumber()

export const toHexWithoutPrefix = (arg: any): string => {
  if (arg instanceof Buffer || arg instanceof BN) {
    return arg.toString('hex')
  } else if (arg instanceof Uint8Array) {
    return arg.reduce((a, v) => a + v.toString(16).padStart(2, '0'), '')
  } else if (Number(arg) === arg) {
    return arg.toString(16).padStart(64, '0')
  } else {
    return Buffer.from(arg, 'ascii').toString('hex')
  }
}

export const toHex = (value: any): string => {
  return Ox(toHexWithoutPrefix(value))
}

export function Ox(value: any): string {
  return value.slice(0, 2) !== '0x' ? `0x${value}` : value
}

// True if h is a standard representation of a byte array, false otherwise
export const isByteRepresentation = (h: any): boolean => {
  return h instanceof Buffer || h instanceof BN || h instanceof Uint8Array
}

export const getEvents = (contract: any): Promise<any[]> =>
  new Promise((resolve, reject) =>
    contract
      .getPastEvents()
      .then((events: any) => resolve(events))
      .catch((error: any) => reject(error)),
  )

export const getLatestEvent = async (contract: any): Promise<any[]> => {
  const events = await getEvents(contract)
  return events[events.length - 1]
}

// link param must be from linkContract(), if amount is a BN
export const requestDataFrom = (
  oc: any,
  link: any,
  amount: any,
  args: any,
  options: any,
): any => {
  if (!options) {
    options = { value: 0 }
  }
  return link.transferAndCall(oc.address, amount, args, options)
}

export const functionSelector = (signature: any): string =>
  '0x' +
  keccak(signature)
    .slice(2)
    .slice(0, 8)

export const assertActionThrows = (action: any) =>
  Promise.resolve()
    .then(action)
    .catch(error => {
      assert(error, 'Expected an error to be raised')
      assert(error.message, 'Expected an error to be raised')
      return error.message
    })
    .then(errorMessage => {
      assert(errorMessage, 'Expected an error to be raised')
      const invalidOpcode = errorMessage.includes('invalid opcode')
      const reverted = errorMessage.includes(
        'VM Exception while processing transaction: revert',
      )
      assert(
        invalidOpcode || reverted,
        'expected following error message to include "invalid JUMP" or ' +
          `"revert": "${errorMessage}"`,
      )
      // see https://github.com/ethereumjs/testrpc/issues/39
      // for why the "invalid JUMP" is the throw related error when using TestRPC
    })

export const checkPublicABI = (contract: any, expectedPublic: any) => {
  const actualPublic = []
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const method of contract.abi) {
    if (method.type === 'function') {
      actualPublic.push(method.name)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const method of actualPublic) {
    const index = expectedPublic.indexOf(method)
    assert.isAtLeast(index, 0, `#${method} is NOT expected to be public`)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const method of expectedPublic) {
    const index = actualPublic.indexOf(method)
    assert.isAtLeast(index, 0, `#${method} is expected to be public`)
  }
}

export const decodeRunABI = (log: any): any => {
  const runABI = util.toBuffer(log.data)
  const types = ['bytes32', 'address', 'bytes4', 'bytes']
  return abi.rawDecode(types, runABI)
}

const startMapBuffer = Buffer.from([0xbf])
const endMapBuffer = Buffer.from([0xff])

export const decodeRunRequest = (log: any): any => {
  const runABI = util.toBuffer(log.data)
  const types = [
    'address',
    'bytes32',
    'uint256',
    'address',
    'bytes4',
    'uint256',
    'uint256',
    'bytes',
  ]
  const [
    requester,
    requestId,
    payment,
    callbackAddress,
    callbackFunc,
    expiration,
    version,
    data,
  ] = abi.rawDecode(types, runABI)

  return {
    callbackAddr: Ox(callbackAddress),
    callbackFunc: toHex(callbackFunc),
    data: autoAddMapDelimiters(data),
    dataVersion: version,
    expiration: toHex(expiration),
    id: toHex(requestId),
    jobId: log.topics[1],
    payment: toHex(payment),
    requester: Ox(requester),
    topic: log.topics[0],
  }
}

function autoAddMapDelimiters(data: any): Buffer {
  let buffer = data

  if (buffer[0] >> 5 !== 5) {
    buffer = Buffer.concat(
      [startMapBuffer, buffer, endMapBuffer],
      buffer.length + 2,
    )
  }

  return buffer
}

export const decodeDietCBOR = (data: any): any => {
  return cbor.decodeFirstSync(autoAddMapDelimiters(data))
}

export const runRequestId = (log: any): any => {
  const { requestId } = decodeRunRequest(log)
  return requestId
}

export const requestDataBytes = (
  specId: any,
  to: any,
  fHash: any,
  nonce: any,
  data: any,
): any => {
  const types = [
    'address',
    'uint256',
    'bytes32',
    'address',
    'bytes4',
    'uint256',
    'uint256',
    'bytes',
  ]
  const values = [0, 0, specId, to, fHash, nonce, 1, data]
  const encoded = abiEncode(types, values)
  const funcSelector = functionSelector(
    'oracleRequest(address,uint256,bytes32,address,bytes4,uint256,uint256,bytes)',
  )
  return funcSelector + encoded
}

export function abiEncode(types: any, values: any): string {
  return abi.rawEncode(types, values).toString('hex')
}

export const newUint8ArrayFromStr = (str: string): Uint8Array => {
  const codePoints = [...str].map(c => c.charCodeAt(0))
  return Uint8Array.from(codePoints)
}

// newUint8Array returns a uint8array of count bytes from either a hex or
// decimal string, hex strings must begin with 0x
export const newUint8Array = (str: string, count: number): any => {
  let result = new Uint8Array(count)

  if (str.startsWith('0x') || str.startsWith('0X')) {
    const hexStr = str.slice(2).padStart(count * 2, '0')
    for (let i = result.length; i >= 0; i--) {
      const offset = i * 2
      result[i] = parseInt(hexStr[offset] + hexStr[offset + 1], HEX_BASE)
    }
  } else {
    const num = bigNum(str)
    result = newHash('0x' + num.toString(HEX_BASE))
  }

  return result
}

// newSignature returns a signature object with v, r, and s broken up
export const newSignature = (str: string): any => {
  const oracleSignature = newUint8Array(str, 65)
  let v = oracleSignature[64]
  if (v < 27) {
    v += 27
  }
  return {
    full: oracleSignature,
    r: oracleSignature.slice(0, 32),
    s: oracleSignature.slice(32, 64),
    v,
  }
}

// newHash returns a 65 byte Uint8Array for representing a hash
export function newHash(str: string): Uint8Array {
  return newUint8Array(str, 32)
}

// newAddress returns a 20 byte Uint8Array for representing an address
export const newAddress = (str: string): Uint8Array => {
  return newUint8Array(str, 20)
}

// lengthTypedArrays sums the length of all specified TypedArrays
export const lengthTypedArrays = <T>(
  ...arrays: Array<ArrayLike<T>>
): number => {
  return arrays.reduce((a, v) => a + v.length, 0)
}

export const toBuffer = (uint8a: Uint8Array): Buffer => {
  return Buffer.from(uint8a)
}

// concatTypedArrays recursively concatenates TypedArrays into one big
// TypedArray
// TODO: Does not work recursively
export const concatTypedArrays = <T>(
  ...arrays: Array<ArrayLike<T>>
): ArrayLike<T> => {
  const size = lengthTypedArrays(...arrays)
  const arrayCtor: any = arrays[0].constructor
  const result = new arrayCtor(size)
  let offset = 0
  arrays.forEach(a => {
    result.set(a, offset)
    offset += a.length
  })
  return result
}

export const increaseTime5Minutes = async () => {
  await web3.currentProvider.send(
    {
      id: 0,
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [300],
    },
    (error: any) => {
      if (error) {
        console.log(`Error during helpers.increaseTime5Minutes! ${error}`)
        throw error
      }
    },
  )
}

export const sendToEvm = async (evmMethod: string, ...params: any) => {
  await web3.currentProvider.send(
    {
      id: 0,
      jsonrpc: '2.0',
      method: evmMethod,
      params: [...params],
    },
    (error: any) => {
      if (error) {
        console.log(`Error during ${evmMethod}! ${error}`)
        throw error
      }
    },
  )
}

export const mineBlocks = async (blocks: number) => {
  for (let i = 0; i < blocks; i++) {
    await sendToEvm('evm_mine')
  }
}

export const createTxData = (
  selector: string,
  types: any,
  values: any,
): any => {
  const funcSelector = functionSelector(selector)
  const encoded = abiEncode([...types], [...values])
  return funcSelector + encoded
}

export const calculateSAID = ({
  payment,
  expiration,
  endAt,
  oracles,
  requestDigest,
}: any): Uint8Array => {
  const serviceAgreementIDInput = concatTypedArrays(
    newHash(payment.toString()),
    newHash(expiration.toString()),
    newHash(endAt.toString()),
    concatTypedArrays(
      ...oracles
        .map(newAddress)
        .map(toHex)
        .map(newHash),
    ),
    requestDigest,
  )
  const serviceAgreementIDInputDigest = util.keccak(
    toHex(serviceAgreementIDInput),
  )
  return newHash(toHex(serviceAgreementIDInputDigest))
}

export const recoverPersonalSignature = (
  message: Uint8Array,
  signature: any,
): any => {
  const personalSignPrefix = newUint8ArrayFromStr(
    '\x19Ethereum Signed Message:\n',
  )
  const personalSignMessage = Uint8Array.from(
    concatTypedArrays(
      personalSignPrefix,
      newUint8ArrayFromStr(message.length.toString()),
      message,
    ),
  )
  const digest = util.keccak(toBuffer(personalSignMessage))
  const requestDigestPubKey = util.ecrecover(
    digest,
    signature.v,
    toBuffer(signature.r),
    toBuffer(signature.s),
  )
  return util.pubToAddress(requestDigestPubKey)
}

export const personalSign = async (
  account: any,
  message: any,
): Promise<any> => {
  if (!isByteRepresentation(message)) {
    throw new Error(`Message ${message} is not a recognized representation of a byte array.
    (Can be Buffer, BigNumber, Uint8Array, 0x-prepended hexadecimal string.)`)
  }
  return newSignature(await web3.eth.sign(toHex(message), account))
}

export const executeServiceAgreementBytes = (
  sAID: any,
  to: any,
  fHash: any,
  nonce: any,
  data: any,
): any => {
  const types = [
    'address',
    'uint256',
    'bytes32',
    'address',
    'bytes4',
    'uint256',
    'uint256',
    'bytes',
  ]
  const values = [0, 0, sAID, to, fHash, nonce, 1, data]
  const encoded = abiEncode(types, values)
  const funcSelector = functionSelector(
    'oracleRequest(address,uint256,bytes32,address,bytes4,uint256,uint256,bytes)',
  )
  return funcSelector + encoded
}

// Convenience functions for constructing hexadecimal representations of
// binary serializations.
export const strip0x = (s: string): string =>
  s.startsWith('0x') ? s.slice(2) : s
export const padHexTo256Bit = (s: string): string =>
  strip0x(s).padStart(64, '0')
export const padNumTo256Bit = (n: number): string =>
  padHexTo256Bit(n.toString(16))

export const constructStructArgs = (
  fieldNames: string[],
  values: any[],
): any => {
  assert.equal(fieldNames.length, values.length)
  const args: Record<number | string, any> = {}
  for (let i = 0; i < fieldNames.length; i++) {
    args[i] = values[i]
    args[fieldNames[i]] = values[i]
  }
  return args
}

export const initiateServiceAgreementArgs = ({
  payment,
  expiration,
  endAt,
  oracles,
  oracleSignatures,
  requestDigest,
}: any): any[] => {
  return [
    constructStructArgs(
      ['payment', 'expiration', 'endAt', 'oracles', 'requestDigest'],
      [
        toHex(newHash(payment.toString())),
        toHex(newHash(expiration.toString())),
        toHex(newHash(endAt.toString())),
        oracles.map(newAddress).map(toHex),
        toHex(requestDigest),
      ],
    ),
    constructStructArgs(
      ['vs', 'rs', 'ss'],
      [
        oracleSignatures.map((os: any) => os.v),
        oracleSignatures.map((os: any) => toHex(os.r)),
        oracleSignatures.map((os: any) => toHex(os.s)),
      ],
    ),
  ]
}

////////////////////////////////////////////////////////////////////////

interface Signature {
  v: number
  r: Uint8Array
  s: Uint8Array
}

interface ServiceAgreement {
  // Corresponds to ServiceAgreement struct in CoordinatorInterface.sol
  payment: BN // uint256
  expiration: BN // uint256
  endAt: BN // uint256
  oracles: string[] // 0x hex representation of oracle addresses (uint160's)
  requestDigest: string // 0x hex representation of bytes32
  aggregator: string // 0x hex representation of aggregator address
  aggInitiateJobSelector: string // 0x hex representation of aggregator.initiateAggregatorForJob function selector (uint32)
  aggFulfillSelector: string // function selector for aggregator.fulfill
  // Information which is useful to carry around with the agreement, but not
  // part of the solidity struct
  id: string // ServiceAgreement Id (sAId)
  oracleSignatures: Signature[]
}

// ABI specification for the given method on the given contract
export const getMethod = (
  contract: any,
  methodName: string,
): FunctionFragment => {
  const methodABIs = contract.abi.filter(
    ({ name: attrName }: FunctionFragment) => attrName == methodName,
  )
  const fqName = `${contract.contractName}.${methodName}: ${methodABIs}`
  assert.equal(methodABIs.length, 1, `No method ${fqName}, or ambiguous`)
  return methodABIs[0]
}

// ABI specification for the given argument of the given contract method
const getMethodArg = (
  contract: any,
  methodName: string,
  argName: string,
): ParamType => {
  const fqName = `${contract.contractName}.${methodName}`
  const methodABI = getMethod(contract, methodName)
  let eMsg = `${fqName} is not a method: ${methodABI}`
  assert.equal(methodABI.type, 'function', eMsg)
  const argMatches = methodABI.inputs.filter((a: any) => a.name == argName)
  eMsg = `${fqName} has no argument ${argName}, or name is ambiguous`
  assert.equal(argMatches.length, 1, eMsg)
  return argMatches[0]
}

// Struct as mapping => tuple representation of struct, for use in truffle call
//
// TODO(alx): This does not deal with nested structs. It may be possible to do
// that by making an AbiCoder with a custom CoerceFunc which, given a tuple
// type, checks whether the input value is a map or a sequence, and if a map,
// converts it to a sequence as I'm doing here.
export const structAsTuple = (
  struct: { [fieldName: string]: any },
  contract: any,
  methodName: string,
  argName: string,
): { abi: ParamType; struct: ArrayLike<any> } => {
  const abi: ParamType = getMethodArg(contract, methodName, argName)
  const eMsg =
    `${contract.contractName}.${methodName}'s argument ${argName} ` +
    `is not a struct: ${abi}`
  assert.equal(abi.type, 'tuple', eMsg)
  return { abi, struct: (abi as any).components.map((a: any) => struct[a.name]) }
}

export const initiateServiceAgreementArgs2 = (
  coordinator: any,
  serviceAgreement: ServiceAgreement,
): any[] => {
  const signatures = {
    vs: serviceAgreement.oracleSignatures.map(os => os.v),
    rs: serviceAgreement.oracleSignatures.map(os => os.r),
    ss: serviceAgreement.oracleSignatures.map(os => os.s),
  }
  const tup = (s: any, n: any) =>
    structAsTuple(s, coordinator, 'initiateServiceAgreement', n).struct
  return [tup(serviceAgreement, '_agreement'), tup(signatures, '_signatures')]
}

// Call coordinator contract to initiate the specified service agreement, and
// get the return value
export const initiateServiceAgreementCall2 = async (
  coordinator: any,
  serviceAgreement: ServiceAgreement,
) =>
  await coordinator.initiateServiceAgreement.call(
    ...initiateServiceAgreementArgs2(coordinator, serviceAgreement),
  )


/** Call coordinator contract to initiate the specified service agreement. */
export const initiateServiceAgreement2 = async (
  coordinator: any,
  serviceAgreement: ServiceAgreement,
) =>
  coordinator.initiateServiceAgreement(
    ...initiateServiceAgreementArgs2(coordinator, serviceAgreement),
  )

////////////////////////////////////////////////////////////////////////

// Call coordinator contract to initiate the specified service agreement, and
// get the return value
export const initiateServiceAgreementCall = async (
  coordinator: any,
  args: any,
): Promise<any> =>
  coordinator.initiateServiceAgreement.call(
    ...initiateServiceAgreementArgs(args),
  )

/** Call coordinator contract to initiate the specified service agreement. */
export const initiateServiceAgreement = async (
  coordinator: any,
  args: any,
): Promise<any> =>
  coordinator.initiateServiceAgreement(...initiateServiceAgreementArgs(args))

/** Check that the given service agreement was stored at the correct location */
export const checkServiceAgreementPresent = async (
  coordinator: any,
  { payment, expiration, endAt, requestDigest, id }: any,
): Promise<any> => {
  const sa = await coordinator.serviceAgreements.call(id)
  assertBigNum(sa[0], bigNum(payment))
  assertBigNum(sa[1], bigNum(expiration))
  assertBigNum(sa[2], bigNum(endAt))
  assert.equal(sa[3], toHex(requestDigest))

  /// / TODO:

  /// / Web3.js doesn't support generating an artifact for arrays
  /// within a struct. / This means that we aren't returned the
  /// list of oracles and / can't assert on their values.
  /// /

  /// / However, we can pass them into the function to generate the
  /// ID / & solidity won't compile unless we pass the correct
  /// number and / type of params when initializing the
  /// ServiceAgreement struct, / so we have some indirect test
  /// coverage.
  /// /
  /// / https://github.com/ethereum/web3.js/issues/1241
  /// / assert.equal(
  /// /   sa[2],
  /// /   ['0x70AEc4B9CFFA7b55C0711b82DD719049d615E21d',
  /// /    '0xd26114cd6EE289AccF82350c8d8487fedB8A0C07']
  /// / )
}

// Check that all values for the struct at this SAID have default values. I.e.
// nothing was changed due to invalid request
export const checkServiceAgreementAbsent = async (
  coordinator: any,
  serviceAgreementID: any,
) => {
  const sa = await coordinator.serviceAgreements.call(
    toHex(serviceAgreementID).slice(0, 66),
  )
  assertBigNum(sa[0], bigNum(0))
  assertBigNum(sa[1], bigNum(0))
  assertBigNum(sa[2], bigNum(0))
  assert.equal(
    sa[3],
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  )
}

export const newServiceAgreement = async (params: any): Promise<any> => {
  const agreement: any = {}
  params = params || {}
  agreement.payment = params.payment || '1000000000000000000'
  agreement.expiration = params.expiration || 300
  agreement.endAt = params.endAt || sixMonthsFromNow()
  if (!params.oracles) {
    throw Error('No Oracle node address provided')
  }
  agreement.oracles = params.oracles
  agreement.oracleSignatures = []
  agreement.requestDigest =
    params.requestDigest ||
    newHash(
      '0xbadc0de5badc0de5badc0de5badc0de5badc0de5badc0de5badc0de5badc0de5',
    )

  const sAID = calculateSAID(agreement)
  agreement.id = toHex(sAID)

  for (let i = 0; i < agreement.oracles.length; i++) {
    const oracle = agreement.oracles[i]
    const oracleSignature = await personalSign(oracle, sAID)
    const requestDigestAddr = recoverPersonalSignature(sAID, oracleSignature)
    assert.equal(oracle.toLowerCase(), toHex(requestDigestAddr))
    agreement.oracleSignatures[i] = oracleSignature
  }
  return agreement
}

export function sixMonthsFromNow(): number {
  return Math.round(Date.now() / 1000.0) + 6 * 30 * 24 * 60 * 60
}

export const fulfillOracleRequest = async (
  oracle: any,
  request: any,
  response: any,
  options: any,
): Promise<any> => {
  if (!options) {
    options = { value: 0 }
  }

  return oracle.fulfillOracleRequest(
    request.id,
    request.payment,
    request.callbackAddr,
    request.callbackFunc,
    request.expiration,
    toHex(response),
    options,
  )
}

export const cancelOracleRequest = async (
  oracle: any,
  request: any,
  options: any,
): Promise<any> => {
  if (!options) {
    options = { value: 0 }
  }

  return oracle.cancelOracleRequest(
    request.id,
    request.payment,
    request.callbackFunc,
    request.expiration,
    options,
  )
}
