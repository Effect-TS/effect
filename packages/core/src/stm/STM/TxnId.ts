import { pipe } from "@fp-ts/data/Function"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"

/**
 * @tsplus type effect/core/stm/STM/TxnId
 * @category model
 * @since 1.0.0
 */
export type TxnId = number

/**
 * @tsplus type effect/core/stm/STM/TxnId.Ops
 * @category model
 * @since 1.0.0
 */
export interface TxnIdOps {}
export const TxnId: TxnIdOps = {}

/**
 * @tsplus static effect/core/stm/STM/TxnId.Ops txnCounter
 * @category constructors
 * @since 1.0.0
 */
export const txnCounter = MutableRef.make(0)

/**
 * @tsplus static effect/core/stm/STM/TxnId.Ops __call
 * @category constructors
 * @since 1.0.0
 */
export function makeTxnId(): TxnId {
  const value = MutableRef.get(txnCounter)
  pipe(txnCounter, MutableRef.set(value + 1))
  return value
}
