import type * as HKT from "../HKT/index.js"

export interface Any<F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly any: <R = unknown, E = never>() => HKT.Kind<F, R, E, unknown>
}
