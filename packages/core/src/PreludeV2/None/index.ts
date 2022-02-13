// ets_tracing: off

import type * as HKT from "../HKT"

export interface None<F extends HKT.HKT> {
  readonly never: <X = any, I = unknown, R = unknown, E = never>() => HKT.Kind<
    F,
    X,
    I,
    R,
    E,
    never
  >
}
