// ets_tracing: off

import type * as HKT from "../HKT/index.js"

export interface None<F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly never: <R = unknown, E = never>() => HKT.Kind<F, R, E, never>
}
