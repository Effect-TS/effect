import type * as HKT from "../HKT"

// () -> F<unknown>
export interface Any<F extends HKT.HKT> {
  readonly any: <X = any, I = any, S = any, R = unknown, E = never>() => HKT.Kind<
    F,
    X,
    I,
    S,
    R,
    E,
    unknown
  >
}
