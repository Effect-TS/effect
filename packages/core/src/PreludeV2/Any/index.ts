import type * as HKT from "../HKT/index.js"

export interface Any<F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly any: <X = any, I = unknown, R = unknown, E = never>() => HKT.Kind<
    F,
    X,
    I,
    R,
    E,
    unknown
  >
}
