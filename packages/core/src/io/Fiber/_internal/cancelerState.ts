import type { Effect } from "../../Effect"

/**
 * @tsplus type ets/CancelerState
 */
export type CancelerState = Empty | Pending | Registered

/**
 * @tsplus type ets/CancelerStateOps
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
 * @tsplus static ets/CancelerStateOps Empty
 */
export const empty: CancelerState = {
  _tag: "Empty"
}

/**
 * @tsplus static ets/CancelerStateOps Pending
 */
export const pending: CancelerState = {
  _tag: "Pending"
}

/**
 * @tsplus static ets/CancelerStateOps Registered
 */
export function registered(asyncCanceler: Effect<any, any, any>): CancelerState {
  return {
    _tag: "Registered",
    asyncCanceler
  }
}
