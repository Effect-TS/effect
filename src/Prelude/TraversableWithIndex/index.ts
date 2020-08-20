import { IdentityBoth } from "../Combined"
import { Covariant } from "../Covariant"
import { Auto, Base, G_, IndexFor, Kind, OrFix, UG_, URIS } from "../HKT"

export interface ForeachWithIndex<F extends URIS, C = Auto> {
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
    B,
    FN extends string,
    FK
  >(
    f: (
      k: IndexFor<F, OrFix<"N", C, FN>, OrFix<"K", C, FK>>,
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
  ) => <FSI, FSO, FX, FI, FS, FR, FE>(
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

export interface TraversableWithIndex<F extends URIS, C = Auto>
  extends Base<F, C>,
    Covariant<F, C> {
  readonly foreachWithIndexF: ForeachWithIndex<F, C>
}

export function implementForeachWithIndexF<F extends URIS, C = Auto>(): (
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
    f: (k: IndexFor<F, OrFix<"N", C, N>, OrFix<"K", C, K>>, a: A) => G_<B>
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
) => ForeachWithIndex<F, C>
export function implementForeachWithIndexF() {
  return (i: any) => i()
}
