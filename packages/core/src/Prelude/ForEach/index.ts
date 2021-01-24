import { flow, identity } from "../../Function"
import type { Covariant, CovariantComposition } from "../Covariant"
import { getCovariantComposition } from "../Covariant"
import * as HKT from "../HKT"
import type { IdentityBoth } from "../IdentityBoth"

export interface ForeachFn<F extends HKT.URIS, C = HKT.Auto> {
  <G extends HKT.URIS, GC = HKT.Auto>(G: IdentityBoth<G, GC> & Covariant<G, GC>): <
    GN extends string,
    GK,
    GQ,
    GW,
    GX,
    GI,
    GS,
    GR,
    GE,
    A,
    B
  >(
    f: (a: A) => HKT.Kind<G, GC, GN, GK, GQ, GW, GX, GI, GS, GR, GE, B>
  ) => <FN extends string, FK, FQ, FW, FX, FI, FS, FR, FE>(
    fa: HKT.Kind<F, C, FN, FK, FQ, FW, FX, FI, FS, FR, FE, A>
  ) => HKT.Kind<
    G,
    GC,
    GN,
    GK,
    GQ,
    GW,
    GX,
    GI,
    GS,
    GR,
    GE,
    HKT.Kind<F, C, FN, FK, FQ, FW, FX, FI, FS, FR, FE, B>
  >
}

export interface ForEach<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C>,
    Covariant<F, C> {
  readonly _ForEach: "ForEach"
  readonly forEachF: ForeachFn<F, C>
}

export function implementForEachF<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <N extends string, K, SI, SO, X, I, S, R, E, A, B, G>(_: {
    A: A
    B: B
    G: G
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
    G: IdentityBoth<HKT.UHKT<G>> & Covariant<HKT.UHKT<G>>
  ) => (
    f: (a: A) => HKT.HKT<G, B>
  ) => (
    fa: HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, A>
  ) => HKT.HKT<G, HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, B>>
) => ForeachFn<F, C>
export function implementForEachF() {
  return (i: any) => i()
}

export interface ForEachCompositionFn<
  F extends HKT.URIS,
  G extends HKT.URIS,
  CF = HKT.Auto,
  CG = HKT.Auto
> {
  <H extends HKT.URIS, CH = HKT.Auto>(H: IdentityBoth<H, CH> & Covariant<H, CH>): <
    HN extends string,
    HK,
    HQ,
    HW,
    HX,
    HI,
    HS,
    HR,
    HE,
    A,
    B
  >(
    f: (a: A) => HKT.Kind<H, CH, HN, HK, HQ, HW, HX, HI, HS, HR, HE, B>
  ) => <
    FN extends string,
    FK,
    FQ,
    FW,
    FX,
    FI,
    FS,
    FR,
    FE,
    GN extends string,
    GK,
    GQ,
    GW,
    GX,
    GI,
    GS,
    GR,
    GE
  >(
    fa: HKT.Kind<
      F,
      CF,
      FN,
      FK,
      FQ,
      FW,
      FX,
      FI,
      FS,
      FR,
      FE,
      HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, A>
    >
  ) => HKT.Kind<
    H,
    CH,
    HN,
    HK,
    HQ,
    HW,
    HX,
    HI,
    HS,
    HR,
    HE,
    HKT.Kind<
      F,
      CF,
      FN,
      FK,
      FQ,
      FW,
      FX,
      FI,
      FS,
      FR,
      FE,
      HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, B>
    >
  >
}

export interface ForEachComposition<
  F extends HKT.URIS,
  G extends HKT.URIS,
  CF = HKT.Auto,
  CG = HKT.Auto
> extends HKT.CompositionBase2<F, G, CF, CG>,
    CovariantComposition<F, G, CF, CG> {
  readonly _ForEachComposition: "ForEachComposition"
  readonly forEachF: ForEachCompositionFn<F, G, CF, CG>
}

export function getForEachComposition<
  F extends HKT.URIS,
  G extends HKT.URIS,
  CF = HKT.Auto,
  CG = HKT.Auto
>(F: ForEach<F, CF>, G: ForEach<G, CG>): ForEachComposition<F, G, CF, CG>
export function getForEachComposition<F, G>(
  F: ForEach<HKT.UHKT<F>>,
  G: ForEach<HKT.UHKT<G>>
) {
  return HKT.instance<ForEachComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
    ...getCovariantComposition(F, G),
    forEachF: (H) => flow(G.forEachF(H), F.forEachF(H))
  })
}

export function sequenceF<T extends HKT.URIS, C>(
  T: ForEach<T, C>
): <F extends HKT.URIS, FC>(
  App: Covariant<F, FC> & IdentityBoth<F, FC>
) => <
  N extends string,
  K,
  Q,
  W,
  X,
  I,
  S,
  R,
  E,
  FN extends string,
  FK,
  FQ,
  FW,
  FX,
  FI,
  FS,
  FR,
  FE,
  A
>(
  _: HKT.Kind<
    T,
    C,
    N,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    HKT.Kind<F, FC, FN, FK, FQ, FW, FX, FI, FS, FR, FE, A>
  >
) => HKT.Kind<
  F,
  FC,
  FN,
  FK,
  FQ,
  FW,
  FX,
  FI,
  FS,
  FR,
  FE,
  HKT.Kind<T, C, N, K, Q, W, X, I, S, R, E, A>
>
export function sequenceF<F>(
  T: ForEach<HKT.UHKT<F>>
): <G>(
  App: Covariant<HKT.UHKT<G>> & IdentityBoth<HKT.UHKT<G>>
) => <A>(_: HKT.HKT<F, HKT.HKT<G, A>>) => HKT.HKT<G, HKT.HKT<F, A>> {
  return (App) => {
    const traverse = T.forEachF(App)

    return traverse(identity)
  }
}
