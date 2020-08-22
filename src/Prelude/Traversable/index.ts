import { flow } from "../../Function"
import type { IdentityBoth } from "../Combined"
import type { Covariant, CovariantComposition } from "../Covariant"
import { getCovariantComposition } from "../Covariant"
import type * as HKT from "../HKT"

export interface Foreach<F extends HKT.URIS, C = HKT.Auto> {
  <G extends HKT.URIS, GC = HKT.Auto>(G: IdentityBoth<G, GC> & Covariant<G, GC>): <
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
    f: (a: A) => HKT.KindFix<G, C, GN, GK, GSIO, GSIO, GX, GI, GS, GR, GE, B>
  ) => <FN extends string, FK, FSI, FSO, FX, FI, FS, FR, FE>(
    fa: HKT.KindFix<F, C, FN, FK, FSI, FSO, FX, FI, FS, FR, FE, A>
  ) => HKT.KindFix<
    G,
    C,
    GN,
    GK,
    GSIO,
    GSIO,
    GX,
    GI,
    GS,
    GR,
    GE,
    HKT.KindFix<F, C, FN, FK, FSI, FSO, FX, FI, FS, FR, FE, B>
  >
}

export interface Traversable<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C>,
    Covariant<F, C> {
  readonly foreachF: Foreach<F, C>
}

export function implementForeachF<F extends HKT.URIS, C = HKT.Auto>(): (
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
    G: IdentityBoth<[HKT.UG_]> & Covariant<[HKT.UG_]>
  ) => (
    f: (a: A) => HKT.G_<B>
  ) => (
    fa: HKT.KindFix<F, C, N, K, SI, SO, X, I, S, R, E, A>
  ) => HKT.G_<HKT.KindFix<F, C, N, K, SI, SO, X, I, S, R, E, B>>
) => Foreach<F, C>
export function implementForeachF() {
  return (i: any) => i()
}

export interface ForeachComposition<
  F extends HKT.URIS,
  G extends HKT.URIS,
  CF = HKT.Auto,
  CG = HKT.Auto
> {
  <H extends HKT.URIS, CH = HKT.Auto>(H: IdentityBoth<H, CH> & Covariant<H, CH>): <
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
    f: (a: A) => HKT.KindFix<H, CH, HN, HK, HSIO, HSIO, HX, HI, HS, HR, HE, B>
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
    fa: HKT.KindFix<
      F,
      CF,
      FN,
      FK,
      FSI,
      FSO,
      FX,
      FI,
      FS,
      FR,
      FE,
      HKT.KindFix<G, CG, GN, GK, GSI, GSO, GX, GI, GS, GR, GE, A>
    >
  ) => HKT.KindFix<
    H,
    CH,
    HN,
    HK,
    HSIO,
    HSIO,
    HX,
    HI,
    HS,
    HR,
    HE,
    HKT.KindFix<
      F,
      CF,
      FN,
      FK,
      FSI,
      FSO,
      FX,
      FI,
      FS,
      FR,
      FE,
      HKT.KindFix<G, CG, GN, GK, GSI, GSO, GX, GI, GS, GR, GE, B>
    >
  >
}

export interface TraversableComposition<
  F extends HKT.URIS,
  G extends HKT.URIS,
  CF = HKT.Auto,
  CG = HKT.Auto
> extends HKT.CompositionBase2<F, G, CF, CG>, CovariantComposition<F, G, CF, CG> {
  readonly foreachF: ForeachComposition<F, G, CF, CG>
}

export function getTraversableComposition<
  F extends HKT.URIS,
  G extends HKT.URIS,
  CF = HKT.Auto,
  CG = HKT.Auto
>(F: Traversable<F, CF>, G: Traversable<G, CG>): TraversableComposition<F, G, CF, CG>
export function getTraversableComposition(
  F: Traversable<[HKT.UF_]>,
  G: Traversable<[HKT.UG_]>
): TraversableComposition<[HKT.UF_], [HKT.UG_]> {
  return {
    ...getCovariantComposition(F, G),
    foreachF: (H) => flow(G.foreachF(H), F.foreachF(H))
  }
}
