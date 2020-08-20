import type { IdentityBoth } from "../Combined"
import type { Covariant, CovariantComposition } from "../Covariant"
import { getCovariantComposition } from "../Covariant"
import type {
  Auto,
  Base,
  CompositionBase2,
  G_,
  Kind,
  OrFix,
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
      OrFix<"N", GC, GN>,
      OrFix<"K", GC, GK>,
      GSIO,
      GSIO,
      OrFix<"X", GC, GX>,
      OrFix<"I", GC, GI>,
      OrFix<"S", GC, GS>,
      OrFix<"R", GC, GR>,
      OrFix<"E", GC, GE>,
      B
    >
  ) => <FN extends string, FK, FSI, FSO, FX, FI, FS, FR, FE>(
    fa: Kind<
      F,
      OrFix<"N", C, FN>,
      OrFix<"K", C, FK>,
      FSI,
      FSO,
      OrFix<"X", C, FX>,
      OrFix<"I", C, FI>,
      OrFix<"S", C, FS>,
      OrFix<"R", C, FR>,
      OrFix<"E", C, FE>,
      A
    >
  ) => Kind<
    G,
    OrFix<"N", GC, GN>,
    OrFix<"K", GC, GK>,
    GSIO,
    GSIO,
    OrFix<"X", GC, GX>,
    OrFix<"I", GC, GI>,
    OrFix<"S", GC, GS>,
    OrFix<"R", GC, GR>,
    OrFix<"E", GC, GE>,
    Kind<
      F,
      OrFix<"N", C, FN>,
      OrFix<"K", C, FK>,
      FSI,
      FSO,
      OrFix<"X", C, FX>,
      OrFix<"I", C, FI>,
      OrFix<"S", C, FS>,
      OrFix<"R", C, FR>,
      OrFix<"E", C, FE>,
      B
    >
  >
}

export interface Traversable<F extends URIS, C = Auto>
  extends Base<F, C>,
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
    G: IdentityBoth<[UG_]> & Covariant<[UG_]>
  ) => (
    f: (a: A) => G_<B>
  ) => (
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
  ) => G_<
    Kind<
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
      OrFix<"N", CH, HN>,
      OrFix<"K", CH, HK>,
      HSIO,
      HSIO,
      OrFix<"X", CH, HX>,
      OrFix<"I", CH, HI>,
      OrFix<"S", CH, HS>,
      OrFix<"R", CH, HR>,
      OrFix<"E", CH, HE>,
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
    H,
    OrFix<"N", CH, HN>,
    OrFix<"K", CH, HK>,
    HSIO,
    HSIO,
    OrFix<"X", CH, HX>,
    OrFix<"I", CH, HI>,
    OrFix<"S", CH, HS>,
    OrFix<"R", CH, HR>,
    OrFix<"E", CH, HE>,
    Kind<
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
  >
}

export interface TraversableComposition<
  F extends URIS,
  G extends URIS,
  CF = Auto,
  CG = Auto
> extends CompositionBase2<F, G, CF, CG>, CovariantComposition<F, G, CF, CG> {
  readonly foreachF: ForeachComposition<F, G, CF, CG>
}

export function getTraversableComposition<
  F extends URIS,
  G extends URIS,
  CF = Auto,
  CG = Auto
>(F: Traversable<F, CF>, G: Traversable<G, CG>): TraversableComposition<F, G, CF, CG>
export function getTraversableComposition(
  F: Traversable<[UF_]>,
  G: Traversable<[UG_]>
): TraversableComposition<[UF_], [UG_]> {
  return {
    ...getCovariantComposition(F, G),
    foreachF: (H) => {
      const foreachF = F.foreachF(H)
      const foreachG = G.foreachF(H)
      return (f) => foreachF(foreachG(f))
    }
  }
}
