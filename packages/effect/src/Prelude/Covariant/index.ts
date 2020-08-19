import {
  Auto,
  Base,
  CompositionBase2,
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

export interface Covariant<F extends URIS, C = Auto> extends Base<F> {
  readonly map: <A, B>(
    f: (a: A) => B
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

export interface CovariantComposition<
  F extends URIS,
  G extends URIS,
  CF = Auto,
  CG = Auto
> extends CompositionBase2<F, G> {
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
      OrN<CF, FN>,
      OrK<CF, FK>,
      FSI,
      FSO,
      OrX<CF, FX>,
      OrI<CF, FI>,
      OrS<CF, FS>,
      OrR<CF, FR>,
      OrE<CF, FE>,
      Kind<
        G,
        OrN<CG, GN>,
        OrK<CG, GK>,
        GSI,
        GSO,
        OrX<CG, GX>,
        OrI<CG, GI>,
        OrS<CG, GS>,
        OrR<CG, GR>,
        OrE<CG, GE>,
        A
      >
    >
  ) => Kind<
    F,
    OrN<CF, FN>,
    OrK<CF, FK>,
    FSI,
    FSO,
    OrX<CF, FX>,
    OrI<CF, FI>,
    OrS<CF, FS>,
    OrR<CF, FR>,
    OrE<CF, FE>,
    Kind<
      G,
      OrN<CG, GN>,
      OrK<CG, GK>,
      GSI,
      GSO,
      OrX<CG, GX>,
      OrI<CG, GI>,
      OrS<CG, GS>,
      OrR<CG, GR>,
      OrE<CG, GE>,
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
