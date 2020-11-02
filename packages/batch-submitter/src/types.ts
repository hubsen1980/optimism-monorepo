/* External Imports */
import {
  BlockWithTransactions,
  Provider,
  TransactionResponse,
} from '@ethersproject/abstract-provider'

/* Internal Imports */
import { EIP155TxData, CreateEOATxData, TxType } from './coders'

export enum QueueOrigin {
  Sequencer = 0,
  L1ToL2 = 1,
}

/**
 * Transaction & Blocks. These are the true data-types we expect
 * from running a batch submitter.
 */
export interface L2Transaction extends TransactionResponse {
  meta: {
    l1BlockNumber: number
    l1TxOrigin: string
    txType: number
    queueOrigin: number
  }
}

export interface L2Block extends BlockWithTransactions {
  stateRoot: string
  transactions: [L2Transaction]
}

/**
 * BatchElement & Batch. These are the data-types of the compressed / batched
 * block data we submit to L1.
 */
export interface BatchElement {
  stateRoot: string
  isSequencerTx: boolean
  sequencerTxType: undefined | TxType
  txData: undefined | EIP155TxData | CreateEOATxData
  timestamp: number
  blockNumber: number
}

export type Batch = BatchElement[]