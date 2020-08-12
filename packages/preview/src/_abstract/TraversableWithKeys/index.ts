import { CovariantF, CovariantK } from "../Covariant"
import { HKTFix, KeyFor, KindFix, URIS } from "../HKT"
import { IdentityBothF, IdentityBothK } from "../IdentityBoth"

export interface ForeachWithKeysF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any> {
  <G, GFix0 = any, GFix1 = any, GFix2 = any, GFix3 = any>(
    G: IdentityBothF<G, GFix0, GFix1, GFix2, GFix3> &
      CovariantF<G, GFix0, GFix1, GFix2, GFix3>
  ): <
    GK,
    GKN extends string,
    GX,
    GI,
    GSIO,
    GS,
    GR,
    GE,
    A,
    B,
    FK,
    FKN extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    FErr
  >(
    f: (
      a: A,
      k: KeyFor<
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
      GSIO,
      GSIO,
      GX,
      GI,
      GS,
      GR,
      GE,
      B
    >
  ) => (
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
    GSIO,
    GSIO,
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
  ): <
    GK,
    GSIO,
    GKN extends string,
    X,
    In,
    S,
    Env,
    Err,
    A,
    B,
    FK,
    FKN extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    FErr
  >(
    f: (
      a: A,
      k: KeyFor<
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
      GSIO,
      GSIO,
      X,
      In,
      S,
      Env,
      Err,
      B
    >
  ) => (
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
    GSIO,
    GSIO,
    X,
    In,
    S,
    Env,
    Err,
    HKTFix<F, Fix0, Fix1, Fix2, Fix3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
}

export interface TraversableWithKeysF<
  F,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> extends CovariantF<F, Fix0, Fix1, Fix2, Fix3> {
  readonly foreachWithKeysF: ForeachWithKeysF<F, Fix0, Fix1, Fix2, Fix3>
}

export interface ForeachWithKeysK<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> {
  <G, GFix0 = any, GFix1 = any, GFix2 = any, GFix3 = any>(
    G: IdentityBothF<G, GFix0, GFix1, GFix2, GFix3> &
      CovariantF<G, GFix0, GFix1, GFix2, GFix3>
  ): <
    GK,
    GKN extends string,
    GX,
    GI,
    GS,
    GSIO,
    GR,
    GE,
    A,
    B,
    FK,
    FKN extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    FErr
  >(
    f: (
      a: A,
      k: KeyFor<
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
      GSIO,
      GSIO,
      GX,
      GI,
      GS,
      GR,
      GE,
      B
    >
  ) => (
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
    GSIO,
    GSIO,
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
  ): <
    GSIO,
    GK,
    GKN extends string,
    X,
    In,
    S,
    Env,
    Err,
    A,
    B,
    FK,
    FKN extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    FErr
  >(
    f: (
      a: A,
      k: KeyFor<
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
      GSIO,
      GSIO,
      X,
      In,
      S,
      Env,
      Err,
      B
    >
  ) => (
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
    GSIO,
    GSIO,
    X,
    In,
    S,
    Env,
    Err,
    KindFix<F, Fix0, Fix1, Fix2, Fix3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
}

export interface TraversableWithKeysK<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> extends CovariantK<F, Fix0, Fix1, Fix2, Fix3> {
  readonly TraversableWithKeys: "TraversableWithKeys"
  readonly foreachWithKeysF: ForeachWithKeysK<F, Fix0, Fix1, Fix2, Fix3>
}

export function makeTraversableWithKeys<
  URI extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  C: CovariantK<URI, Fix0, Fix1, Fix2, Fix3>
): (
  _: Omit<
    TraversableWithKeysK<URI, Fix0, Fix1, Fix2, Fix3>,
    | "URI"
    | "Fix0"
    | "Fix1"
    | "Fix2"
    | "Fix3"
    | "TraversableWithKeys"
    | keyof CovariantK<URI, Fix0, Fix1, Fix2, Fix3>
  >
) => TraversableWithKeysK<URI, Fix0, Fix1, Fix2, Fix3>
export function makeTraversableWithKeys<
  URI,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  C: CovariantF<URI, Fix0, Fix1, Fix2, Fix3>
): (
  _: Omit<
    TraversableWithKeysF<URI, Fix0, Fix1, Fix2, Fix3>,
    | "URI"
    | "Fix0"
    | "Fix1"
    | "Fix2"
    | "Fix3"
    | keyof CovariantF<URI, Fix0, Fix1, Fix2, Fix3>
  >
) => TraversableWithKeysF<URI, Fix0, Fix1, Fix2, Fix3>
export function makeTraversableWithKeys<
  URI,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  C: CovariantF<URI, Fix0, Fix1, Fix2, Fix3>
): (
  _: Omit<
    TraversableWithKeysF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => TraversableWithKeysF<URI, Fix0, Fix1, Fix2, Fix3> {
  return (_) => ({
    ..._,
    ...C
  })
}

export function implementForeachWithKeysF<
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
      GSIO,
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
      B,
      FSI,
      FSO,
      FX,
      FIn,
      FSt,
      FEnv
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
      G: IdentityBothF<G, GFix0, GFix1, GFix2, GFix3> &
        CovariantF<G, GFix0, GFix1, GFix2, GFix3>
    ) => (
      f: (
        a: A,
        k: KeyFor<
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
        GSIO,
        GSIO,
        GX,
        GI,
        GS,
        GR,
        GE,
        B
      >
    ) => (
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
      GSIO,
      GSIO,
      GX,
      GI,
      GS,
      GR,
      GE,
      KindFix<F, Fix0, Fix1, Fix2, Fix3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
    >
  ): ForeachWithKeysK<F, Fix0, Fix1, Fix2, Fix3> =>
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
