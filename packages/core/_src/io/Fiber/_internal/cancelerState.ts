/**
 * @tsplus type ets/CancelerState
 */
export type CancelerState = Empty | Pending | Registered

/**
 * @tsplus type ets/CancelerState/Ops
 */
export interface CancelerStateOps {}
export const CancelerState: CancelerStateOps = {}

export interface Empty {
  readonly _tag: "Empty"
}

export interface Pending {
  readonly _tag: "Pending"
}

export interface Registered {
  readonly _tag: "Registered"
  readonly asyncCanceler: Effect<any, any, any>
}

/**
 * @tsplus static ets/CancelerState/Ops Empty
 */
export const empty: CancelerState = {
  _tag: "Empty"
}

/**
 * @tsplus static ets/CancelerState/Ops Pending
 */
export const pending: CancelerState = {
  _tag: "Pending"
}

/**
 * @tsplus static ets/CancelerState/Ops Registered
 */
export function registered(asyncCanceler: Effect<any, any, any>): CancelerState {
  return {
    _tag: "Registered",
    asyncCanceler
  }
}
