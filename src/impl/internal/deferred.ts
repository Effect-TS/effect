import type * as Deferred from "../Deferred.js"
import type * as Effect from "../Effect.js"
import * as OpCodes from "./opCodes/deferred.js"

/** @internal */
const DeferredSymbolKey = "effect/Deferred"

/** @internal */
export const DeferredTypeId: Deferred.DeferredTypeId = Symbol.for(
  DeferredSymbolKey
) as Deferred.DeferredTypeId

/** @internal */
export const deferredVariance = {
  _E: (_: never) => _,
  _A: (_: never) => _
}

/** @internal */
export type State<E, A> = Pending<E, A> | Done<E, A>

/** @internal */
export interface Pending<E, A> {
  readonly _tag: "Pending"
  readonly joiners: Array<(effect: Effect.Effect<never, E, A>) => void>
}

/** @internal */
export interface Done<E, A> {
  readonly _tag: "Done"
  readonly effect: Effect.Effect<never, E, A>
}

/** @internal */
export const pending = <E, A>(
  joiners: Array<(effect: Effect.Effect<never, E, A>) => void>
): State<E, A> => {
  return { _tag: OpCodes.OP_STATE_PENDING, joiners }
}

/** @internal */
export const done = <E, A>(effect: Effect.Effect<never, E, A>): State<E, A> => {
  return { _tag: OpCodes.OP_STATE_DONE, effect }
}
