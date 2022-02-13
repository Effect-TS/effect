import type * as HKT from "../HKT"

// () -> F<unknown>
export interface Any<F extends HKT.HKT> {
  readonly any: <X = any, I = any, R = unknown, E = never>() => HKT.Kind<
    F,
    X,
    I,
    R,
    E,
    unknown
  >
}
