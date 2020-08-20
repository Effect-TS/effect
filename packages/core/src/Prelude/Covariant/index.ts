import type { Auto, Base, CompositionBase2, Kind, OrFix, UF_, UG_, URIS } from "../HKT"
import { instance } from "../HKT"

export interface Covariant<F extends URIS, C = Auto> extends Base<F, C> {
  readonly map: <A, B>(
    f: (a: A) => B
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

export interface CovariantComposition<
  F extends URIS,
  G extends URIS,
  CF = Auto,
  CG = Auto
> extends CompositionBase2<F, G, CF, CG> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <
    FN extends string,
    FK,
    FSI,
    FSO,
    FX,
    FI,
    FS,
    FR,
    FE,
    GN extends string,
    GK,
    GSI,
    GSO,
    GX,
    GI,
    GS,
    GR,
    GE
  >(
    fa: Kind<
      F,
      OrFix<"N", CF, FN>,
      OrFix<"K", CF, FK>,
      FSI,
      FSO,
      OrFix<"X", CF, FX>,
      OrFix<"I", CF, FI>,
      OrFix<"S", CF, FS>,
      OrFix<"R", CF, FR>,
      OrFix<"E", CF, FE>,
      Kind<
        G,
        OrFix<"N", CG, GN>,
        OrFix<"K", CG, GK>,
        GSI,
        GSO,
        OrFix<"X", CG, GX>,
        OrFix<"I", CG, GI>,
        OrFix<"S", CG, GS>,
        OrFix<"R", CG, GR>,
        OrFix<"E", CG, GE>,
        A
      >
    >
  ) => Kind<
    F,
    OrFix<"N", CF, FN>,
    OrFix<"K", CF, FK>,
    FSI,
    FSO,
    OrFix<"X", CF, FX>,
    OrFix<"I", CF, FI>,
    OrFix<"S", CF, FS>,
    OrFix<"R", CF, FR>,
    OrFix<"E", CF, FE>,
    Kind<
      G,
      OrFix<"N", CG, GN>,
      OrFix<"K", CG, GK>,
      GSI,
      GSO,
      OrFix<"X", CG, GX>,
      OrFix<"I", CG, GI>,
      OrFix<"S", CG, GS>,
      OrFix<"R", CG, GR>,
      OrFix<"E", CG, GE>,
      B
    >
  >
}

export function getCovariantComposition<
  F extends URIS,
  G extends URIS,
  CF = Auto,
  CG = Auto
>(F: Covariant<F, CF>, G: Covariant<G, CG>): CovariantComposition<F, G, CF, CG>
export function getCovariantComposition(F: Covariant<UF_>, G: Covariant<UG_>) {
  return instance<CovariantComposition<UF_, UG_>>({
    map: (f) => F.map(G.map(f))
  })
}
