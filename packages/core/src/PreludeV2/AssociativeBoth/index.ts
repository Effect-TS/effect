import type * as Tp from "@effect-ts/system/Collections/Immutable/Tuple"

import type * as HKT from "../HKT"

// F<B> -> F<A> -> F<[A, B]>
export interface AssociativeBoth<F extends HKT.HKT> {
  both: <X2, I2, S2, R2, E2, B>(
    fb: HKT.Kind<F, X2, I2, S2, R2, E2, B>
  ) => <X, I, S, R, E, A>(
    fa: HKT.Kind<F, X, I, S, R, E, A>
  ) => HKT.Kind<F, X2, I2, S2, R2 & R, E2 | E, Tp.Tuple<[A, B]>>
}
