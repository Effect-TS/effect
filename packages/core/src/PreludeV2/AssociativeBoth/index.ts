import type * as Tp from "@effect-ts/system/Collections/Immutable/Tuple"

import type * as HKT from "../HKT"

export interface AssociativeBoth<F extends HKT.HKT> extends HKT.Typeclass<F> {
  both: <X, I2, R2, E2, B>(
    fb: HKT.Kind<F, X, I2, R2, E2, B>
  ) => <I, R, E, A>(
    fa: HKT.Kind<F, X, I, R, E, A>
  ) => HKT.Kind<F, X, I & I2, R2 & R, E2 | E, Tp.Tuple<[A, B]>>
}
