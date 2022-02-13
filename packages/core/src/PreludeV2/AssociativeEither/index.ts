// ets_tracing: off

import type { Either } from "@effect-ts/system/Either"

import type * as HKT from "../HKT"

export interface AssociativeEither<F extends HKT.HKT> {
  readonly orElseEither: <X, I2, R2, E2, B>(
    fb: () => HKT.Kind<F, X, I2, R2, E2, B>
  ) => <I, R, E, A>(
    fa: HKT.Kind<F, X, I, R, E, A>
  ) => HKT.Kind<F, X, I & I2, R2 & R, E2 | E, Either<A, B>>
}
