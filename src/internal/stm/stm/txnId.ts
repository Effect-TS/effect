export * as TxnId from "./txnId.js"

declare module "./txnId.js" {
  /** @internal */
  export type TxnId = number & {
    readonly TransactioId: unique symbol
  }
}

/** @internal */
const txnCounter = { ref: 0 }

/** @internal */
export const make = (): TxnId => {
  const newId = txnCounter.ref + 1
  txnCounter.ref = newId
  return newId as TxnId
}
