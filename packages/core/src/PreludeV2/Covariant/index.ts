import { pipe } from "@effect-ts/core/Function"

import * as HKT from "../HKT"

export interface Covariant<F extends HKT.HKT> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <X, I, R, E>(fa: HKT.Kind<F, X, I, R, E, A>) => HKT.Kind<F, X, I, R, E, B>
}

export interface CovariantComposition<F extends HKT.HKT, G extends HKT.HKT> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <FX, FI, FR, FE, GX, GI, GR, GE>(
    fa: HKT.Kind<F, FX, FI, FR, FE, HKT.Kind<G, GX, GI, GR, GE, A>>
  ) => HKT.Kind<F, FX, FI, FR, FE, HKT.Kind<G, GX, GI, GR, GE, B>>
}

export function getCovariantComposition<F extends HKT.HKT, G extends HKT.HKT>(
  F_: Covariant<F>,
  G_: Covariant<G>
): CovariantComposition<F, G> {
  return HKT.instance<CovariantComposition<F, G>>({
    map: (f) => (fa) => pipe(fa, F_.map(G_.map(f)))
  })
}
