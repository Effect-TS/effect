/**
 * @tsplus type effect/core/io/Fiber/CancelerState
 * @internal
 */
export type CancelerState = Empty | Pending | Registered

/**
 * @tsplus type effect/core/io/Fiber/CancelerState.Ops
 * @internal
 */
export interface CancelerStateOps {}

/** @internal */
export const CancelerState: CancelerStateOps = {}

/** @internal */
export interface Empty {
  readonly _tag: "Empty"
}

/** @internal */
export interface Pending {
  readonly _tag: "Pending"
}

/** @internal */
export interface Registered {
  readonly _tag: "Registered"
  readonly asyncCanceler: Effect<any, any, any>
}

/**
 * @tsplus static effect/core/io/Fiber/CancelerState.Ops Empty
 * @internal
 */
export const empty: CancelerState = {
  _tag: "Empty"
}

/**
 * @tsplus static effect/core/io/Fiber/CancelerState.Ops Pending
 * @internal
 */
export const pending: CancelerState = {
  _tag: "Pending"
}

/**
 * @tsplus static effect/core/io/Fiber/CancelerState.Ops Registered
 * @internal
 */
export function registered(asyncCanceler: Effect<any, any, any>): CancelerState {
  return {
    _tag: "Registered",
    asyncCanceler
  }
}
