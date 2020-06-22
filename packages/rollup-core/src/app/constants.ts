import { ZERO_ADDRESS } from '@eth-optimism/core-utils'
import { EVMOpcode, Opcode } from '../types'

export const L1ToL2TransactionEventName = 'L1ToL2Transaction'
export const L1ToL2TransactionBatchEventName = 'NewTransactionBatchAdded'

export const CREATOR_CONTRACT_ADDRESS = ZERO_ADDRESS

export const TX_FLAT_GAS_FEE = 30_000
export const GAS_LIMIT = 1_000_000_000
export const GAS_RATE_LIMIT_EPOCH_LENGTH = 0
export const MAX_SEQUENCED_GAS_PER_EPOCH = 2_000_000_000
export const MAX_QUEUED_GAS_PER_EPOCH = 2_000_000_000
export const DEFAULT_CHAIN_PARAMS = [
  TX_FLAT_GAS_FEE,
  GAS_LIMIT,
  GAS_RATE_LIMIT_EPOCH_LENGTH,
  MAX_SEQUENCED_GAS_PER_EPOCH,
  MAX_QUEUED_GAS_PER_EPOCH
]
export const DEFAULT_ETHNODE_GAS_LIMIT = 10_000_000

export const CHAIN_ID = 108

export const DEFAULT_UNSAFE_OPCODES: EVMOpcode[] = [
  Opcode.ADDRESS,
  Opcode.BALANCE,
  Opcode.BLOCKHASH,
  Opcode.CALLCODE,
  Opcode.CALLER,
  Opcode.COINBASE,
  Opcode.CREATE,
  Opcode.CREATE2,
  Opcode.DELEGATECALL,
  Opcode.DIFFICULTY,
  Opcode.EXTCODESIZE,
  Opcode.EXTCODECOPY,
  Opcode.EXTCODEHASH,
  Opcode.GASLIMIT,
  Opcode.GASPRICE,
  Opcode.NUMBER,
  Opcode.ORIGIN,
  Opcode.SELFBALANCE,
  Opcode.SELFDESTRUCT,
  Opcode.SLOAD,
  Opcode.SSTORE,
  Opcode.STATICCALL,
  Opcode.TIMESTAMP,
]

// use whitelist-mask-generator.spec.ts to re-generate this
export const DEFAULT_OPCODE_WHITELIST_MASK =
  '0x600a0000000000000000001fffffffffffffffff0fcf004063f000013fff0fff'

export const L2_TO_L1_MESSAGE_PASSER_OVM_ADDRESS =
  '0x4200000000000000000000000000000000000000'
