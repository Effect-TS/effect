/**
 * @tsplus type ets/TxnId
 */
export type TxnId = number;

/**
 * @tsplus type ets/TxnId/Ops
 */
export interface TxnIdOps {}
export const TxnId: TxnIdOps = {};

/**
 * @tsplus static ets/TxnId/Ops txnCounter
 */
export const txnCounter = new AtomicNumber(0);

/**
 * @tsplus static ets/TxnId/Ops __call
 */
export function makeTxnId(): TxnId {
  return txnCounter.incrementAndGet();
}
