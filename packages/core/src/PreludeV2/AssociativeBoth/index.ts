// ets_tracing: off

import type * as Tp from "@effect-ts/system/Collections/Immutable/Tuple"

import type * as HKT from "../HKT/index.js"

export interface AssociativeBoth<F extends HKT.HKT> extends HKT.Typeclass<F> {
  both: <R2, E2, B>(
    fb: HKT.Kind<F, R2, E2, B>
  ) => <R, E, A>(
    fa: HKT.Kind<F, R, E, A>
  ) => HKT.Kind<F, R2 & R, E2 | E, Tp.Tuple<[A, B]>>
}
