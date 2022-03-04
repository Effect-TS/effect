import { AtomicNumber } from "../../support/AtomicNumber"

/**
 * @tsplus type ets/TxnId
 */
export type TxnId = number

/**
 * @tsplus type ets/TxnIdOps
 */
export interface TxnIdOps {}
export const TxnId: TxnIdOps = {}

/**
 * @tsplus static ets/TxnIdOps txnCounter
 */
export const txnCounter = new AtomicNumber(0)

/**
 * @tsplus static ets/TxnIdOps __call
 */
export function makeTxnId(): TxnId {
  return txnCounter.incrementAndGet()
}
