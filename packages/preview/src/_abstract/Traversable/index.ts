import { CovariantF, CovariantK } from "../Covariant"
import { HKTFix, KindFix, URIS } from "../HKT"
import { IdentityBothF, IdentityBothK } from "../IdentityBoth"

export interface ForeachF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any> {
  <G, GFix0 = any, GFix1 = any, GFix2 = any, GFix3 = any>(
    G: IdentityBothF<G, GFix0, GFix1, GFix2, GFix3> &
      CovariantF<G, GFix0, GFix1, GFix2, GFix3>
  ): <GK, GKN extends string, GX, GI, GS, GR, GE, A, B>(
    f: (
      a: A
    ) => HKTFix<
      G,
      GFix0,
      GFix1,
      GFix2,
      GFix3,
      GK,
      GKN,
      unknown,
      unknown,
      GX,
      GI,
      GS,
      GR,
      GE,
      B
    >
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
    fa: HKTFix<
      F,
      Fix0,
      Fix1,
      Fix2,
      Fix3,
      FK,
      FKN,
      FSI,
      FSO,
      FX,
      FIn,
      FSt,
      FEnv,
      FErr,
      A
    >
  ) => HKTFix<
    G,
    GFix0,
    GFix1,
    GFix2,
    GFix3,
    GK,
    GKN,
    unknown,
    unknown,
    GX,
    GI,
    GS,
    GR,
    GE,
    HKTFix<F, Fix0, Fix1, Fix2, Fix3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
  <G extends URIS, GFix0 = any, GFix1 = any, GFix2 = any, GFix3 = any>(
    G: IdentityBothK<G, GFix0, GFix1, GFix2, GFix3> &
      CovariantK<G, GFix0, GFix1, GFix2, GFix3>
  ): <GK, GKN extends string, X, In, S, Env, Err, A, B>(
    f: (
      a: A
    ) => KindFix<
      G,
      GFix0,
      GFix1,
      GFix2,
      GFix3,
      GK,
      GKN,
      unknown,
      unknown,
      X,
      In,
      S,
      Env,
      Err,
      B
    >
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
    fa: HKTFix<
      F,
      Fix0,
      Fix1,
      Fix2,
      Fix3,
      FK,
      FKN,
      FSI,
      FSO,
      FX,
      FIn,
      FSt,
      FEnv,
      FErr,
      A
    >
  ) => KindFix<
    G,
    GFix0,
    GFix1,
    GFix2,
    GFix3,
    GK,
    GKN,
    unknown,
    unknown,
    X,
    In,
    S,
    Env,
    Err,
    HKTFix<F, Fix0, Fix1, Fix2, Fix3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
}

export interface TraversableF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>
  extends CovariantF<F, Fix0, Fix1, Fix2, Fix3> {
  readonly Traversable: "Traversable"
  readonly foreachF: ForeachF<F, Fix0, Fix1, Fix2, Fix3>
}

export interface ForeachK<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> {
  <G, GFix0 = any, GFix1 = any, GFix2 = any, GFix3 = any>(
    G: IdentityBothF<G, GFix0, GFix1, GFix2, GFix3> &
      CovariantF<G, GFix0, GFix1, GFix2, GFix3>
  ): <GK, GKN extends string, GX, GI, GS, GR, GE, A, B>(
    f: (
      a: A
    ) => HKTFix<
      G,
      GFix0,
      GFix1,
      GFix2,
      GFix3,
      GK,
      GKN,
      unknown,
      unknown,
      GX,
      GI,
      GS,
      GR,
      GE,
      B
    >
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
    fa: KindFix<
      F,
      Fix0,
      Fix1,
      Fix2,
      Fix3,
      FK,
      FKN,
      FSI,
      FSO,
      FX,
      FIn,
      FSt,
      FEnv,
      FErr,
      A
    >
  ) => HKTFix<
    G,
    GFix0,
    GFix1,
    GFix2,
    GFix3,
    GK,
    GKN,
    unknown,
    unknown,
    GX,
    GI,
    GS,
    GR,
    GE,
    KindFix<F, Fix0, Fix1, Fix2, Fix3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
  <G extends URIS, GFix0 = any, GFix1 = any, GFix2 = any, GFix3 = any>(
    G: IdentityBothK<G, GFix0, GFix1, GFix2, GFix3> &
      CovariantK<G, GFix0, GFix1, GFix2, GFix3>
  ): <GK, GKN extends string, X, In, S, Env, Err, A, B>(
    f: (
      a: A
    ) => KindFix<
      G,
      GFix0,
      GFix1,
      GFix2,
      GFix3,
      GK,
      GKN,
      unknown,
      unknown,
      X,
      In,
      S,
      Env,
      Err,
      B
    >
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
    fa: KindFix<
      F,
      Fix0,
      Fix1,
      Fix2,
      Fix3,
      FK,
      FKN,
      FSI,
      FSO,
      FX,
      FIn,
      FSt,
      FEnv,
      FErr,
      A
    >
  ) => KindFix<
    G,
    GFix0,
    GFix1,
    GFix2,
    GFix3,
    GK,
    GKN,
    unknown,
    unknown,
    X,
    In,
    S,
    Env,
    Err,
    KindFix<F, Fix0, Fix1, Fix2, Fix3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
}

export interface TraversableK<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> extends CovariantK<F, Fix0, Fix1, Fix2, Fix3> {
  readonly Traversable: "Traversable"
  readonly foreachF: ForeachK<F, Fix0, Fix1, Fix2, Fix3>
}

export function makeTraversable<
  URI extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  C: CovariantK<URI, Fix0, Fix1, Fix2, Fix3>
): (
  _: Omit<
    TraversableK<URI, Fix0, Fix1, Fix2, Fix3>,
    | "URI"
    | "Fix0"
    | "Fix1"
    | "Fix2"
    | "Fix3"
    | "Traversable"
    | keyof CovariantK<URI, Fix0, Fix1, Fix2, Fix3>
  >
) => TraversableK<URI, Fix0, Fix1, Fix2, Fix3>
export function makeTraversable<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  C: CovariantF<URI, Fix0, Fix1, Fix2, Fix3>
): (
  _: Omit<
    TraversableF<URI, Fix0, Fix1, Fix2, Fix3>,
    | "URI"
    | "Fix0"
    | "Fix1"
    | "Fix2"
    | "Fix3"
    | "Traversable"
    | keyof CovariantF<URI, Fix0, Fix1, Fix2, Fix3>
  >
) => TraversableF<URI, Fix0, Fix1, Fix2, Fix3>
export function makeTraversable<URI>(
  C: CovariantF<URI>
): (
  _: Omit<TraversableF<URI>, "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3" | "Traversable">
) => TraversableF<URI> {
  return (_) => ({
    Traversable: "Traversable",
    ..._,
    ...C
  })
}

export function implementForeachF<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(F: F) {
  return (
    i: <
      FErr,
      FK,
      FKN extends string,
      A,
      G,
      GFix0,
      GFix1,
      GFix2,
      GFix3,
      GK,
      GKN extends string,
      GX,
      GI,
      GS,
      GR,
      GE,
      B
    >(_: {
      _g: G
      _b: B
      _ge: GE
      _gi: GI
      _gs: GS
      _gr: GR
      _gx: GX
      _ferr: FErr
      _a: A
      _fkn: FKN
      _fk: FK
    }) => (
      G: IdentityBothF<G> & CovariantF<G>
    ) => (
      f: (
        a: A
      ) => HKTFix<
        G,
        GFix0,
        GFix1,
        GFix2,
        GFix3,
        GK,
        GKN,
        unknown,
        unknown,
        GX,
        GI,
        GS,
        GR,
        GE,
        B
      >
    ) => <FSI, FSO, FX, FIn, FSt, FEnv>(
      fa: KindFix<
        F,
        Fix0,
        Fix1,
        Fix2,
        Fix3,
        FK,
        FKN,
        FSI,
        FSO,
        FX,
        FIn,
        FSt,
        FEnv,
        FErr,
        A
      >
    ) => HKTFix<
      G,
      GFix0,
      GFix1,
      GFix2,
      GFix3,
      GK,
      GKN,
      unknown,
      unknown,
      GX,
      GI,
      GS,
      GR,
      GE,
      KindFix<F, Fix0, Fix1, Fix2, Fix3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
    >
  ): ForeachK<F, Fix0, Fix1, Fix2, Fix3> =>
    i({
      _b: {},
      _ge: {},
      _gi: {},
      _gr: {},
      _gs: {},
      _gx: {},
      _g: {},
      _a: {},
      _ferr: {},
      _fkn: undefined as any,
      _fk: {}
    }) as any
}
