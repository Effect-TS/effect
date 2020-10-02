import type { CovariantComposition } from "../Covariant"
import * as HKT from "../HKT"

export interface Contravariant<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C> {
  readonly contramap: <A, B>(
    f: (a: B) => A
  ) => <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
}

export function getContravariantComposition<
  F extends HKT.URIS,
  G extends HKT.URIS,
  CF = HKT.Auto,
  CG = HKT.Auto
>(F: Contravariant<F, CF>, G: Contravariant<G, CG>): CovariantComposition<F, G, CF, CG>
export function getContravariantComposition<F, G>(
  F: Contravariant<HKT.UHKT<F>>,
  G: Contravariant<HKT.UHKT<G>>
) {
  return HKT.instance<CovariantComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
    map: (f) => F.contramap(G.contramap(f))
  })
}
