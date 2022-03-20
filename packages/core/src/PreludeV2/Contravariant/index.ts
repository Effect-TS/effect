// ets_tracing: off

import { pipe } from "@effect-ts/core/Function"

import type { CovariantComposition } from "../Covariant/index.js"
import * as HKT from "../HKT/index.js"

export interface Contravariant<F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly contramap: <A, B>(
    f: (b: B) => A
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
