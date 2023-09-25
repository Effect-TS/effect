import type * as Equal from "../Equal"

/** @internal */
export const EffectTypeId = Symbol.for("@effect/io/Effect")

/** @internal */
export type EffectTypeId = typeof EffectTypeId

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
