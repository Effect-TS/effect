import type { IdentityBoth } from "../Combined"
import type { Covariant } from "../Covariant"
import type * as HKT from "../HKT"

export interface ForeachWithIndex<F extends HKT.URIS, C = HKT.Auto> {
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
    B,
    FN extends string,
    FK
  >(
    f: (
      k: HKT.IndexFor<F, HKT.OrFix<"N", C, FN>, HKT.OrFix<"K", C, FK>>,
      a: A
    ) => HKT.KindFix<G, GC, GN, GK, GSIO, GSIO, GX, GI, GS, GR, GE, B>
  ) => <FSI, FSO, FX, FI, FS, FR, FE>(
    fa: HKT.KindFix<F, GC, FN, FK, FSI, FSO, FX, FI, FS, FR, FE, A>
  ) => HKT.KindFix<
    G,
    GC,
    GN,
    GK,
    GSIO,
    GSIO,
    GX,
    GI,
    GS,
    GR,
    GE,
    HKT.KindFix<F, GC, FN, FK, FSI, FSO, FX, FI, FS, FR, FE, B>
  >
}

export interface TraversableWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C>,
    Covariant<F, C> {
  readonly foreachWithIndexF: ForeachWithIndex<F, C>
}

export function implementForeachWithIndexF<F extends HKT.URIS, C = HKT.Auto>(): (
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
    f: (
      k: HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>,
      a: A
    ) => HKT.G_<B>
  ) => (
    fa: HKT.KindFix<F, C, N, K, SI, SO, X, I, S, R, E, A>
  ) => HKT.G_<HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, B>>
) => ForeachWithIndex<F, C>
export function implementForeachWithIndexF() {
  return (i: any) => i()
}
