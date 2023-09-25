import type * as Effect from "../Effect"
import type * as Equal from "../Equal"

/** @internal */
export const EffectTypeId: Effect.EffectTypeId = Symbol.for("effect/Effect") as Effect.EffectTypeId

/** @internal */
export type EffectTypeId = Effect.EffectTypeId

/** @internal */
export interface Effectable extends Equal.Equal {
  readonly [EffectTypeId]: typeof effectVariance
}

/** @internal */
export const effectVariance = {
  _R: (_: never) => _,
  _E: (_: never) => _,
  _A: (_: never) => _
}
