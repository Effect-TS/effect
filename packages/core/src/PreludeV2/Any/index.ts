import type * as HKT from "../HKT"

export interface Any<F extends HKT.HKT> {
  readonly any: <X = any, I = unknown, R = unknown, E = never>() => HKT.Kind<
    F,
    X,
    I,
    R,
    E,
    unknown
  >
}
