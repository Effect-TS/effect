import { CovariantF, CovariantK } from "../Covariant"
import { HKTFix, KeyFor, KindFix, URIS } from "../HKT"
import { IdentityBothF, IdentityBothK } from "../IdentityBoth"

export interface ForeachWithKeysF<F, Fix = any> {
  <G, GFix = any>(G: IdentityBothF<G, GFix> & CovariantF<G, GFix>): <
    GK,
    GKN extends string,
    GX,
    GI,
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
      k: KeyFor<F, Fix, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
    ) => HKTFix<G, GFix, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
  ) => (
    fa: HKTFix<F, Fix, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => HKTFix<
    G,
    GFix,
    GK,
    GKN,
    unknown,
    unknown,
    GX,
    GI,
    GS,
    GR,
    GE,
    HKTFix<F, Fix, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
  <G extends URIS, GFix = any>(G: IdentityBothK<G, GFix> & CovariantK<G, GFix>): <
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
      k: KeyFor<F, Fix, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
    ) => KindFix<G, GFix, GK, GKN, unknown, unknown, X, In, S, Env, Err, B>
  ) => (
    fa: HKTFix<F, Fix, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => KindFix<
    G,
    GFix,
    GK,
    GKN,
    unknown,
    unknown,
    X,
    In,
    S,
    Env,
    Err,
    HKTFix<F, Fix, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
}

export interface TraversableWithKeysF<F, Fix = any> extends CovariantF<F, Fix> {
  readonly TraversableWithKeys: "TraversableWithKeys"
  readonly foreachWithKeysF: ForeachWithKeysF<F, Fix>
}

export interface ForeachWithKeysK<F extends URIS, Fix = any> {
  <G, GFix = any>(G: IdentityBothF<G, GFix> & CovariantF<G, GFix>): <
    GK,
    GKN extends string,
    GX,
    GI,
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
      k: KeyFor<F, Fix, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
    ) => HKTFix<G, GFix, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
  ) => (
    fa: KindFix<F, Fix, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => HKTFix<
    G,
    GFix,
    GK,
    GKN,
    unknown,
    unknown,
    GX,
    GI,
    GS,
    GR,
    GE,
    KindFix<F, Fix, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
  <G extends URIS, GFix = any>(G: IdentityBothK<G, GFix> & CovariantK<G, GFix>): <
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
      k: KeyFor<F, Fix, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
    ) => KindFix<G, GFix, GK, GKN, unknown, unknown, X, In, S, Env, Err, B>
  ) => (
    fa: KindFix<F, Fix, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => KindFix<
    G,
    GFix,
    GK,
    GKN,
    unknown,
    unknown,
    X,
    In,
    S,
    Env,
    Err,
    KindFix<F, Fix, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
}

export interface TraversableWithKeysK<F extends URIS, Fix = any>
  extends CovariantK<F, Fix> {
  readonly TraversableWithKeys: "TraversableWithKeys"
  readonly foreachWithKeysF: ForeachWithKeysK<F, Fix>
}

export function makeTraversableWithKeys<URI extends URIS, Fix = any>(
  C: CovariantK<URI, Fix>
): (
  _: Omit<
    TraversableWithKeysK<URI, Fix>,
    "URI" | "Fix" | "TraversableWithKeys" | keyof CovariantK<URI, Fix>
  >
) => TraversableWithKeysK<URI, Fix>
export function makeTraversableWithKeys<URI, Fix = any>(
  C: CovariantF<URI, Fix>
): (
  _: Omit<
    TraversableWithKeysF<URI, Fix>,
    "URI" | "Fix" | "TraversableWithKeys" | keyof CovariantF<URI, Fix>
  >
) => TraversableWithKeysF<URI, Fix>
export function makeTraversableWithKeys<URI, Fix = any>(
  C: CovariantF<URI, Fix>
): (
  _: Omit<TraversableWithKeysF<URI, Fix>, "URI" | "Fix" | "TraversableWithKeys">
) => TraversableWithKeysF<URI, Fix> {
  return (_) => ({
    TraversableWithKeys: "TraversableWithKeys",
    ..._,
    ...C
  })
}

export function implementForeachWithKeysF<F extends URIS, Fix = any>(F: F) {
  return (
    i: <
      FErr,
      FK,
      FKN extends string,
      A,
      G,
      GFix,
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
      G: IdentityBothF<G> & CovariantF<G>
    ) => (
      f: (
        a: A,
        k: KeyFor<F, Fix, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
      ) => HKTFix<G, GFix, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
    ) => (
      fa: KindFix<F, Fix, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
    ) => HKTFix<
      G,
      GFix,
      GK,
      GKN,
      unknown,
      unknown,
      GX,
      GI,
      GS,
      GR,
      GE,
      KindFix<F, Fix, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
    >
  ): ForeachWithKeysK<F, Fix> =>
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
