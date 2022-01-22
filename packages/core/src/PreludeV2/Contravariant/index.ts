// ets_tracing: off

import { pipe } from "../../Function/index.js"
import type { CovariantComposition } from "../Covariant/index.js"
import * as HKT from "../HKT/index.js"

export interface Contravariant<F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly contramap: <A, B>(
    f: (b: B) => A
  ) => <R, E>(fa: HKT.Kind<F, R, E, A>) => HKT.Kind<F, R, E, B>
}

export function getContravariantComposition<F extends HKT.HKT, G extends HKT.HKT>(
  F_: Contravariant<F>,
  G_: Contravariant<G>
): CovariantComposition<F, G> {
  return HKT.instance<CovariantComposition<F, G>>({
    map: (f) => (fa) => pipe(fa, F_.contramap(G_.contramap(f)))
  })
}
