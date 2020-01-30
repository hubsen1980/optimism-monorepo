import '../setup'

/* External Imports */
import { Address } from '@pigi/rollup-core'
import {
  getLogger,
  BigNumber,
  remove0x,
  add0x,
  TestUtils,
} from '@pigi/core-utils'

import { Contract, ContractFactory, ethers } from 'ethers'
import { createMockProvider, deployContract, getWallets } from 'ethereum-waffle'
import * as ethereumjsAbi from 'ethereumjs-abi'

/* Contract Imports */
import * as ExecutionManager from '../../build/contracts/ExecutionManager.json'
import * as DummyContract from '../../build/contracts/DummyContract.json'
import * as PurityChecker from '../../build/contracts/PurityChecker.json'
import * as SimpleCall from '../../build/contracts/SimpleCall.json'

/* Internal Imports */
import { manuallyDeployOvmContract, addressToBytes32Address } from '../helpers'

export const abi = new ethers.utils.AbiCoder()

const log = getLogger('execution-manager-calls', true)

/*********
 * TESTS *
 *********/

const executeCallMethodId: string = ethereumjsAbi
  .methodID('executeCall', [])
  .toString('hex')

const sstoreMethodId: string = ethereumjsAbi
  .methodID('notStaticFriendlySSTORE', [])
  .toString('hex')

const createMethodId: string = ethereumjsAbi
  .methodID('notStaticFriendlyCREATE', [])
  .toString('hex')

const create2MethodId: string = ethereumjsAbi
  .methodID('notStaticFriendlyCREATE2', [])
  .toString('hex')

const sloadMethodId: string = ethereumjsAbi
  .methodID('staticFriendlySLOAD', [])
  .toString('hex')

const staticCallThenCallMethodId: string = ethereumjsAbi
  .methodID('makeStaticCallThenCall', [])
  .toString('hex')

const sloadKey: string = '11'.repeat(32)
const unpopultedSLOADResult: string = '00'.repeat(32)
const populatedSLOADResult: string = '22'.repeat(32)

const sstoreMethodIdAndParams: string = `${sstoreMethodId}${sloadKey}${populatedSLOADResult}`
const sloadMethodIdAndParams: string = `${sloadMethodId}${sloadKey}`

const timestampAndQueueOrigin: string = '00'.repeat(64)

describe('Execution Manager -- Call opcodes', () => {
  const provider = createMockProvider()
  const [wallet] = getWallets(provider)
  // Useful constant
  const ONE_FILLED_BYTES_32 = '0x' + '11'.repeat(32)
  // Create pointers to our execution manager & simple copier contract
  let executionManager: Contract
  let purityChecker: Contract
  let callContract: ContractFactory
  let callContractAddress: Address
  let callContract2Address: Address
  let callContract3Address: Address
  let callContractAddress32: string
  let callContract2Address32: string
  let callContract3Address32: string
  let executeCallToCallContractData: string

  let createMethodIdAndData: string
  let create2MethodIdAndData: string

  /* Link libraries before tests */
  before(async () => {
    purityChecker = await deployContract(
      wallet,
      PurityChecker,
      [ONE_FILLED_BYTES_32],
      { gasLimit: 6700000 }
    )

    const deployTx = new ContractFactory(
      SimpleCall.abi,
      SimpleCall.bytecode
    ).getDeployTransaction(purityChecker.address)

    createMethodIdAndData = `${createMethodId}${remove0x(deployTx.data)}`
    create2MethodIdAndData = `${create2MethodId}${'00'.repeat(32)}${remove0x(
      deployTx.data
    )}`
  })
  beforeEach(async () => {
    // Before each test let's deploy a fresh ExecutionManager and DummyContract

    // Deploy ExecutionManager the normal way
    executionManager = await deployContract(
      wallet,
      ExecutionManager,
      [purityChecker.address, '0x' + '00'.repeat(20)],
      {
        gasLimit: 6700000,
      }
    )

    // Deploy SimpleCall with the ExecutionManager
    callContractAddress = await manuallyDeployOvmContract(
      wallet,
      provider,
      executionManager,
      SimpleCall,
      [executionManager.address]
    )

    // Deploy second SimpleCall contract
    callContract2Address = await manuallyDeployOvmContract(
      wallet,
      provider,
      executionManager,
      SimpleCall,
      [executionManager.address]
    )

    // Deploy third SimpleCall contract
    callContract3Address = await manuallyDeployOvmContract(
      wallet,
      provider,
      executionManager,
      SimpleCall,
      [executionManager.address]
    )

    log.debug(`Contract address: [${callContractAddress}]`)

    // Also set our simple copier Ethers contract so we can generate unsigned transactions
    callContract = new ContractFactory(
      SimpleCall.abi as any,
      SimpleCall.bytecode
    )

    callContractAddress32 = remove0x(
      addressToBytes32Address(callContractAddress)
    )
    callContract2Address32 = remove0x(
      addressToBytes32Address(callContract2Address)
    )
    callContract3Address32 = remove0x(
      addressToBytes32Address(callContract2Address)
    )
    const encodedParams = `${timestampAndQueueOrigin}${callContractAddress32}`
    executeCallToCallContractData = `0x${executeCallMethodId}${encodedParams}`
  })

  describe('ovmCALL', async () => {
    const callMethodId: string = ethereumjsAbi
      .methodID('makeCall', [])
      .toString('hex')

    it('properly executes ovmCALL to SLOAD', async () => {
      const data: string = `${executeCallToCallContractData}${callMethodId}${callContract2Address32}${sloadMethodIdAndParams}`

      const result = await executionManager.provider.call({
        to: executionManager.address,
        data,
        gasLimit: 6_700_000,
      })

      log.debug(`Result: [${result}]`)

      remove0x(result).should.equal(unpopultedSLOADResult, 'Result mismatch!')
    })

    it('properly executes ovmCALL to SSTORE', async () => {
      const data: string = `${executeCallToCallContractData}${callMethodId}${callContract2Address32}${sstoreMethodIdAndParams}`

      // Note: Send transaction vs call so it is persisted
      await wallet.sendTransaction({
        to: executionManager.address,
        data,
        gasLimit: 6_700_000,
      })

      const fetchData: string = `${executeCallToCallContractData}${callMethodId}${callContract2Address32}${sloadMethodIdAndParams}`

      const result = await executionManager.provider.call({
        to: executionManager.address,
        data: fetchData,
        gasLimit: 6_700_000,
      })

      log.debug(`Result: [${result}]`)

      // Stored in contract 2, matches contract 2
      remove0x(result).should.equal(populatedSLOADResult, 'SLOAD mismatch!')
    })

    it('properly executes ovmCALL to CREATE', async () => {
      const data: string = `${executeCallToCallContractData}${callMethodId}${callContract2Address32}${createMethodIdAndData}`

      const result = await executionManager.provider.call({
        to: executionManager.address,
        data,
        gasLimit: 6_700_000,
      })

      log.debug(`RESULT: ${result}`)

      result
        .substr(2)
        .length.should.equal(64, 'Should have got a bytes32 address back')
    })

    it('properly executes ovmCALL to CREATE2', async () => {
      const data: string = `${executeCallToCallContractData}${callMethodId}${callContract2Address32}${create2MethodIdAndData}`

      const result = await executionManager.provider.call({
        to: executionManager.address,
        data,
        gasLimit: 6_700_000,
      })

      log.debug(`RESULT: ${result}`)

      result
        .substr(2)
        .length.should.equal(64, 'Should have got a bytes32 address back')
    })
  })

  describe('ovmDELEGATECALL', async () => {
    const delegateCallMethodId: string = ethereumjsAbi
      .methodID('makeDelegateCall', [])
      .toString('hex')

    const callMethodId: string = ethereumjsAbi
      .methodID('makeCall', [])
      .toString('hex')

    it('properly executes ovmDELEGATECALL to SSTORE', async () => {
      const data: string = `${executeCallToCallContractData}${delegateCallMethodId}${callContract2Address32}${sstoreMethodIdAndParams}`

      // Note: Send transaction vs call so it is persisted
      await wallet.sendTransaction({
        to: executionManager.address,
        data,
        gasLimit: 6_700_000,
      })

      // Stored in contract 2 via delegate call but accessed via contract 1
      const fetchData: string = `${executeCallToCallContractData}${callMethodId}${callContractAddress32}${sloadMethodIdAndParams}`

      const result = await executionManager.provider.call({
        to: executionManager.address,
        data: fetchData,
        gasLimit: 6_700_000,
      })

      log.debug(`Result: [${result}]`)
      // Should have stored result
      remove0x(result).should.equal(
        populatedSLOADResult,
        'SLOAD should yield stored result!'
      )

      const contract2FetchData: string = `${executeCallToCallContractData}${callMethodId}${callContract2Address32}${sloadMethodIdAndParams}`
      const contract2Result = await executionManager.provider.call({
        to: executionManager.address,
        data: contract2FetchData,
        gasLimit: 6_700_000,
      })

      log.debug(`Result: [${contract2Result}]`)

      // Should not be stored
      remove0x(contract2Result).should.equal(
        unpopultedSLOADResult,
        'SLOAD should not yield any data (0 x 32 bytes)!'
      )
    })

    it('properly executes nested ovmDELEGATECALLs to SSTORE', async () => {
      // contract 1 delegate calls contract 2 delegate calls contract 3
      const data: string = `${executeCallToCallContractData}${delegateCallMethodId}${callContract2Address32}${delegateCallMethodId}${callContract3Address32}${sstoreMethodIdAndParams}`

      // Note: Send transaction vs call so it is persisted
      await wallet.sendTransaction({
        to: executionManager.address,
        data,
        gasLimit: 6_700_000,
      })

      const contract1FetchData: string = `${executeCallToCallContractData}${callMethodId}${callContractAddress32}${sloadMethodIdAndParams}`
      const contract1Result = await executionManager.provider.call({
        to: executionManager.address,
        data: contract1FetchData,
        gasLimit: 6_700_000,
      })

      log.debug(`Result 1: [${contract1Result}]`)

      // Stored in contract 3 via delegate call but accessed via contract 1
      remove0x(contract1Result).should.equal(
        populatedSLOADResult,
        'SLOAD should yield stored data!'
      )

      const contract2FetchData: string = `${executeCallToCallContractData}${callMethodId}${callContract2Address32}${sloadMethodIdAndParams}`
      const contract2Result = await executionManager.provider.call({
        to: executionManager.address,
        data: contract2FetchData,
        gasLimit: 6_700_000,
      })

      log.debug(`Result 2: [${contract2Result}]`)

      // Should not be stored
      remove0x(contract2Result).should.equal(
        unpopultedSLOADResult,
        'SLOAD should not yield any data (0 x 32 bytes)!'
      )

      const contract3FetchData: string = `${executeCallToCallContractData}${callMethodId}${callContract3Address32}${sloadMethodIdAndParams}`
      const contract3Result = await executionManager.provider.call({
        to: executionManager.address,
        data: contract3FetchData,
        gasLimit: 6_700_000,
      })

      log.debug(`Result 3: [${contract3Result}]`)

      // Should not be stored
      remove0x(contract3Result).should.equal(
        unpopultedSLOADResult,
        'SLOAD should not yield any data (0 x 32 bytes)!'
      )
    })
  })

  describe('ovmSTATICCALL', async () => {
    const staticCallMethodId: string = ethereumjsAbi
      .methodID('makeStaticCall', [])
      .toString('hex')

    it('properly executes ovmSTATICCALL to SLOAD', async () => {
      const data: string = `${executeCallToCallContractData}${staticCallMethodId}${callContract2Address32}${sloadMethodIdAndParams}`

      const result = await executionManager.provider.call({
        to: executionManager.address,
        data,
        gasLimit: 6_700_000,
      })

      log.debug(`Result: [${result}]`)

      remove0x(result).should.equal(unpopultedSLOADResult, 'Result mismatch!')
    })

    it('properly executes nested ovmSTATICCALL to SLOAD', async () => {
      const data: string = `${executeCallToCallContractData}${staticCallMethodId}${callContract2Address32}${staticCallMethodId}${callContract2Address32}${sloadMethodIdAndParams}`

      const result = await executionManager.provider.call({
        to: executionManager.address,
        data,
        gasLimit: 6_700_000,
      })

      log.debug(`Result: [${result}]`)

      remove0x(result).should.equal(unpopultedSLOADResult, 'Result mismatch!')
    })

    it('successfully makes static call then call', async () => {
      const data: string = `${executeCallToCallContractData}${staticCallThenCallMethodId}${callContractAddress32}`

      // Should not throw
      await executionManager.provider.call({
        to: executionManager.address,
        data,
        gasLimit: 6_700_000,
      })
    })

    it('remains in static context when exiting nested static context', async () => {
      const data: string = `${executeCallToCallContractData}${staticCallMethodId}${callContractAddress32}${staticCallThenCallMethodId}${callContractAddress32}`

      await TestUtils.assertThrowsAsync(async () => {
        const res = await executionManager.provider.call({
          to: executionManager.address,
          data,
          gasLimit: 6_700_000,
        })
      })
    })

    it('fails on ovmSTATICCALL to SSTORE', async () => {
      const data: string = `${executeCallToCallContractData}${staticCallMethodId}${callContract2Address32}${sstoreMethodIdAndParams}`

      await TestUtils.assertThrowsAsync(async () => {
        // Note: Send transaction vs call so it is persisted
        await wallet.sendTransaction({
          to: executionManager.address,
          data,
          gasLimit: 6_700_000,
        })
      })
    })

    it('fails on ovmSTATICCALL to CREATE', async () => {
      const data: string = `${executeCallToCallContractData}${staticCallMethodId}${callContract2Address32}${createMethodIdAndData}`

      await TestUtils.assertThrowsAsync(async () => {
        // Note: Send transaction vs call so it is persisted
        await wallet.sendTransaction({
          to: executionManager.address,
          data,
          gasLimit: 6_700_000,
        })
      })
    })

    it('fails on ovmSTATICCALL to CREATE2', async () => {
      const data: string = `${executeCallToCallContractData}${staticCallMethodId}${callContract2Address32}${create2MethodIdAndData}`

      await TestUtils.assertThrowsAsync(async () => {
        // Note: Send transaction vs call so it is persisted
        await wallet.sendTransaction({
          to: executionManager.address,
          data,
          gasLimit: 6_700_000,
        })
      })
    })
  })
})