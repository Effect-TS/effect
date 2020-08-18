import { IdentityBoth } from "../Combined"
import { Covariant } from "../Covariant"
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
    G: IdentityBoth<HKTURI> & Covariant<HKTURI>
  ) => (
    f: (a: A) => HKT1<B>
  ) => <K, SI, SO, X, I, S, R, E>(
    fa: Kind<F, K, SI, SO, X, I, S, R, E, A>
  ) => HKT1<Kind<F, K, SI, SO, X, I, S, R, E, B>>
) => Foreach<F, C>
export function implementForeachF() {
  return (i: any) => i()
}
