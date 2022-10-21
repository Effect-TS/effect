/**
 * @tsplus type effect/core/stm/STM/TxnId
 */
export type TxnId = number

/**
 * @tsplus type effect/core/stm/STM/TxnId.Ops
 */
export interface TxnIdOps {}
export const TxnId: TxnIdOps = {}

/**
 * @tsplus static effect/core/stm/STM/TxnId.Ops txnCounter
 */
export const txnCounter = new AtomicNumber(0)

/**
 * @tsplus static effect/core/stm/STM/TxnId.Ops __call
 */
export function makeTxnId(): TxnId {
  return txnCounter.incrementAndGet()
}
