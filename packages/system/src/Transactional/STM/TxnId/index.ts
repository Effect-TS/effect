// ets_tracing: off

import "../../../Operator/index.js"

import { AtomicNumber } from "../../../Support/AtomicNumber/index.js"

export type TxnId = number

export const txnCounter = new AtomicNumber(0)

export function makeTxnId(): TxnId {
  return txnCounter.incrementAndGet()
}
