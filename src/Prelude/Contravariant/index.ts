import type { CovariantComposition } from "../Covariant"
import type { Auto, Base, Kind, OrFix, UF_, UG_, URIS } from "../HKT"
import { instance } from "../HKT"

export interface Contravariant<F extends URIS, C = Auto> extends Base<F, C> {
  readonly contramap: <A, B>(
    f: (a: B) => A
  ) => <N extends string, K, SI, SO, X, I, S, R, E>(
    fa: Kind<
      F,
      OrFix<"N", C, N>,
      OrFix<"K", C, K>,
      SI,
      SO,
      OrFix<"X", C, X>,
      OrFix<"I", C, I>,
      OrFix<"S", C, S>,
      OrFix<"R", C, R>,
      OrFix<"E", C, E>,
      A
    >
  ) => Kind<
    F,
    OrFix<"N", C, N>,
    OrFix<"K", C, K>,
    SI,
    SO,
    OrFix<"X", C, X>,
    OrFix<"I", C, I>,
    OrFix<"S", C, S>,
    OrFix<"R", C, R>,
    OrFix<"E", C, E>,
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
  F: Contravariant<[UF_]>,
  G: Contravariant<[UG_]>
) {
  return instance<CovariantComposition<[UF_], [UG_]>>({
    map: (f) => F.contramap(G.contramap(f))
  })
}
