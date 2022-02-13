// ets_tracing: off

import { pipe } from "@effect-ts/core/Function"

import type { CovariantComposition } from "../Covariant"
import * as HKT from "../HKT"

export interface Contravariant<F extends HKT.HKT> {
  readonly contramap: <A, B>(
    f: (a: B) => A
  ) => <X, I, R, E>(fa: HKT.Kind<F, X, I, R, E, A>) => HKT.Kind<F, X, I, R, E, B>
}

export function getContravariantComposition<F extends HKT.HKT, G extends HKT.HKT>(
  F_: Contravariant<F>,
  G_: Contravariant<G>
): CovariantComposition<F, G> {
  return HKT.instance<CovariantComposition<F, G>>({
    map: (f) => (fa) => pipe(fa, F_.contramap(G_.contramap(f)))
  })
}
