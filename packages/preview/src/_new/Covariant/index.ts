import {
  Auto,
  Base,
  HKT1,
  HKTURI,
  Kind,
  OrE,
  OrI,
  OrK,
  OrR,
  OrS,
  OrX,
  URIS
} from "../HKT"

export interface Covariant<F extends URIS, C = Auto> extends Base<F> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <K, SI, SO, X, I, S, R, E>(
    fa: Kind<
      F,
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
> extends Base<F> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <FK, FSI, FSO, FX, FI, FS, FR, FE, GK, GSI, GSO, GX, GI, GS, GR, GE>(
    fa: Kind<
      F,
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
export function getCovariantComposition<F extends URIS, CF = Auto>(
  F: Covariant<F, CF>,
  G: Covariant<HKTURI>
): CovariantComposition<F, HKTURI, CF> {
  return {
    URI: F.URI,
    map: <A, B>(
      f: (a: A) => B
    ): (<FK, FSI, FSO, FX, FI, FS, FR, FE>(
      fa: Kind<
        F,
        OrK<CF, FK>,
        FSI,
        FSO,
        OrX<CF, FX>,
        OrI<CF, FI>,
        OrS<CF, FS>,
        OrR<CF, FR>,
        OrE<CF, FE>,
        HKT1<A>
      >
    ) => Kind<
      F,
      OrK<CF, FK>,
      FSI,
      FSO,
      OrX<CF, FX>,
      OrI<CF, FI>,
      OrS<CF, FS>,
      OrR<CF, FR>,
      OrE<CF, FE>,
      HKT1<B>
    >) => F.map(G.map(f))
  }
}
