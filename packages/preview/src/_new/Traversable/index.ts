import { IdentityBoth } from "../Combined"
import { Covariant, CovariantComposition, getCovariantComposition } from "../Covariant"
import {
  Auto,
  Base,
  CompositionBase2,
  G_,
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

export interface Foreach<F extends URIS, C = Auto> {
  <G extends URIS, GC = Auto>(G: IdentityBoth<G, GC> & Covariant<G, GC>): <
    GSIO,
    GN extends string,
    GK,
    GX,
    GI,
    GS,
    GR,
    GE,
    A,
    B
  >(
    f: (
      a: A
    ) => Kind<
      G,
      OrN<GC, GN>,
      OrK<GC, GK>,
      GSIO,
      GSIO,
      OrX<GC, GX>,
      OrI<GC, GI>,
      OrS<GC, GS>,
      OrR<GC, GR>,
      OrE<GC, GE>,
      B
    >
  ) => <FN extends string, FK, FSI, FSO, FX, FI, FS, FR, FE>(
    fa: Kind<
      F,
      OrN<C, FN>,
      OrK<C, FK>,
      FSI,
      FSO,
      OrX<C, FX>,
      OrI<C, FI>,
      OrS<C, FS>,
      OrR<C, FR>,
      OrE<C, FE>,
      A
    >
  ) => Kind<
    G,
    OrN<GC, GN>,
    OrK<GC, GK>,
    GSIO,
    GSIO,
    OrX<GC, GX>,
    OrI<GC, GI>,
    OrS<GC, GS>,
    OrR<GC, GR>,
    OrE<GC, GE>,
    Kind<
      F,
      OrN<C, FN>,
      OrK<C, FK>,
      FSI,
      FSO,
      OrX<C, FX>,
      OrI<C, FI>,
      OrS<C, FS>,
      OrR<C, FR>,
      OrE<C, FE>,
      B
    >
  >
}

export interface Traversable<F extends URIS, C = Auto>
  extends Base<F>,
    Covariant<F, C> {
  readonly foreachF: Foreach<F, C>
}

export function implementForeachF<F extends URIS, C = Auto>(): (
  i: <N extends string, K, SI, SO, X, I, S, R, E, A, B>(_: {
    A: A
    B: B
    N: N
    K: K
    SI: SI
    SO: SO
    X: X
    I: I
    S: S
    R: R
    E: E
  }) => (
    G: IdentityBoth<UG_> & Covariant<UG_>
  ) => (
    f: (a: A) => G_<B>
  ) => (
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
  ) => G_<
    Kind<
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
  >
) => Foreach<F, C>
export function implementForeachF() {
  return (i: any) => i()
}

export interface ForeachComposition<
  F extends URIS,
  G extends URIS,
  CF = Auto,
  CG = Auto
> {
  <H extends URIS, CH = Auto>(H: IdentityBoth<H, CH> & Covariant<H, CH>): <
    HSIO,
    HN extends string,
    HK,
    HX,
    HI,
    HS,
    HR,
    HE,
    A,
    B
  >(
    f: (
      a: A
    ) => Kind<
      H,
      OrN<CH, HN>,
      OrK<CH, HK>,
      HSIO,
      HSIO,
      OrX<CH, HX>,
      OrI<CH, HI>,
      OrS<CH, HS>,
      OrR<CH, HR>,
      OrE<CH, HE>,
      B
    >
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
    H,
    OrN<CH, HN>,
    OrK<CH, HK>,
    HSIO,
    HSIO,
    OrX<CH, HX>,
    OrI<CH, HI>,
    OrS<CH, HS>,
    OrR<CH, HR>,
    OrE<CH, HE>,
    Kind<
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
  >
}

export interface TraversableComposition<
  F extends URIS,
  G extends URIS,
  CF = Auto,
  CG = Auto
> extends CompositionBase2<F, G>, CovariantComposition<F, G, CF, CG> {
  readonly foreachF: ForeachComposition<F, G, CF, CG>
}

export function getTraversableComposition<
  F extends URIS,
  G extends URIS,
  CF = Auto,
  CG = Auto
>(F: Traversable<F, CF>, G: Traversable<G, CG>): TraversableComposition<F, G, CF, CG>
export function getTraversableComposition(
  F: Traversable<UF_>,
  G: Traversable<UG_>
): TraversableComposition<UF_, UG_> {
  return {
    ...getCovariantComposition(F, G),
    foreachF: (H) => {
      const foreachF = F.foreachF(H)
      const foreachG = G.foreachF(H)
      return (f) => foreachF(foreachG(f))
    }
  }
}
