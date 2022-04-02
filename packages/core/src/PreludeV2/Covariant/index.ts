import { pipe } from "../../Function/index.js"
import * as HKT from "../HKT/index.js"

export interface Covariant<F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <R, E>(fa: HKT.Kind<F, R, E, A>) => HKT.Kind<F, R, E, B>
}

export interface CovariantComposition<F extends HKT.HKT, G extends HKT.HKT> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <FR, FE, GR, GE>(
    fa: HKT.Kind<F, FR, FE, HKT.Kind<G, GR, GE, A>>
  ) => HKT.Kind<F, FR, FE, HKT.Kind<G, GR, GE, B>>
}

export function getCovariantComposition<F extends HKT.HKT, G extends HKT.HKT>(
  F_: Covariant<F>,
  G_: Covariant<G>
): CovariantComposition<F, G> {
  return HKT.instance<CovariantComposition<F, G>>({
    map: (f) => (fa) => pipe(fa, F_.map(G_.map(f)))
  })
}
