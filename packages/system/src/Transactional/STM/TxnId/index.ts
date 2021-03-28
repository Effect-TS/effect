// tracing: off

import "../../../Operator"

import { AtomicNumber } from "../../../Support/AtomicNumber"

export type TxnId = number

export const txnCounter = new AtomicNumber(0)

export function makeTxnId(): TxnId {
  return txnCounter.incrementAndGet()
}
