import { IdentityBoth } from "../Combined"
import { Covariant } from "../Covariant"
import {
  Auto,
  Base,
  G_,
  IndexFor,
  Kind,
  OrE,
  OrI,
  OrK,
  OrN,
  OrR,
  OrS,
  OrX,
  UG_,
  URIS
} from "../HKT"

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
      k: IndexFor<F, FN, FK>,
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
  ) => <FSI, FSO, FX, FI, FS, FR, FE>(
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

export interface TraversableWithIndex<F extends URIS, C = Auto>
  extends Base<F>,
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
    f: (k: IndexFor<F, N, K>, a: A) => G_<B>
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
) => ForeachWithIndex<F, C>
export function implementForeachWithIndexF() {
  return (i: any) => i()
}
