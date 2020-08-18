import { IdentityBoth } from "../Combined"
import { Covariant, CovariantComposition, getCovariantComposition } from "../Covariant"
import {
  Auto,
  Base,
  F_,
  UF_,
  Kind,
  OrE,
  OrI,
  OrK,
  OrR,
  OrS,
  OrX,
  URIS,
  UG_,
  CompositionBase2
} from "../HKT"

export interface Foreach<F extends URIS, C = Auto> extends Base<F> {
  <G extends URIS, GC = Auto>(G: IdentityBoth<G, GC> & Covariant<G, GC>): <
    GSIO,
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
  ) => <FK, FSI, FSO, FX, FI, FS, FR, FE>(
    fa: Kind<
      F,
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
  i: <A, B>(_: {
    A: A
    B: B
  }) => (
    G: IdentityBoth<UF_> & Covariant<UF_>
  ) => (
    f: (a: A) => F_<B>
  ) => <K, SI, SO, X, I, S, R, E>(
    fa: Kind<F, K, SI, SO, X, I, S, R, E, A>
  ) => F_<Kind<F, K, SI, SO, X, I, S, R, E, B>>
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
    H,
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
