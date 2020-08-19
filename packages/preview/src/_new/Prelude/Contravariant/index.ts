import { CovariantComposition } from "../Covariant"
import {
  Auto,
  Base,
  instance,
  Kind,
  OrE,
  OrI,
  OrK,
  OrN,
  OrR,
  OrS,
  OrX,
  UF_,
  UG_,
  URIS
} from "../HKT"

export interface Contravariant<F extends URIS, C = Auto> extends Base<F> {
  readonly contramap: <A, B>(
    f: (a: B) => A
  ) => <N extends string, K, SI, SO, X, I, S, R, E>(
    fa: Kind<
      F,
      OrN<C, N>,
      OrK<C, K>,
      SI,
      SO,
      OrX<C, X>,
      OrI<C, I>,
      OrS<C, S>,
      OrR<C, R>,
      OrE<C, E>,
      A
    >
  ) => Kind<
    F,
    OrN<C, N>,
    OrK<C, K>,
    SI,
    SO,
    OrX<C, X>,
    OrI<C, I>,
    OrS<C, S>,
    OrR<C, R>,
    OrE<C, E>,
    B
  >
}

export function getContravariantComposition<
  F extends URIS,
  G extends URIS,
  CF = Auto,
  CG = Auto
>(F: Contravariant<F, CF>, G: Contravariant<G, CG>): CovariantComposition<F, G, CF, CG>
export function getContravariantComposition(
  F: Contravariant<UF_>,
  G: Contravariant<UG_>
) {
  return instance<CovariantComposition<UF_, UG_>>({
    map: (f) => F.contramap(G.contramap(f))
  })
}
