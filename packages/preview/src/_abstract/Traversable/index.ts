import { CovariantF, CovariantK } from "../Covariant"
import { HKTFix, KindFix, URIS } from "../HKT"
import { IdentityBothF, IdentityBothK } from "../IdentityBoth"

export interface ForeachF<F, Fix = any> {
  <G, GFix = any>(G: IdentityBothF<G, GFix> & CovariantF<G, GFix>): <
    GK,
    GKN extends string,
    GX,
    GI,
    GS,
    GR,
    GE,
    A,
    B
  >(
    f: (a: A) => HKTFix<G, GFix, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
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
    B
  >(
    f: (a: A) => KindFix<G, GFix, GK, GKN, unknown, unknown, X, In, S, Env, Err, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
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

export interface TraversableF<F, Fix = any> extends CovariantF<F, Fix> {
  readonly Traversable: "Traversable"
  readonly foreachF: ForeachF<F, Fix>
}

export interface ForeachK<F extends URIS, Fix = any> {
  <G, GFix = any>(G: IdentityBothF<G, GFix> & CovariantF<G, GFix>): <
    GK,
    GKN extends string,
    GX,
    GI,
    GS,
    GR,
    GE,
    A,
    B
  >(
    f: (a: A) => HKTFix<G, GFix, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
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
    B
  >(
    f: (a: A) => KindFix<G, GFix, GK, GKN, unknown, unknown, X, In, S, Env, Err, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
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

export interface TraversableK<F extends URIS, Fix = any> extends CovariantK<F, Fix> {
  readonly Traversable: "Traversable"
  readonly foreachF: ForeachK<F, Fix>
}

export function makeTraversable<URI extends URIS, Fix = any>(
  C: CovariantK<URI, Fix>
): (
  _: Omit<
    TraversableK<URI, Fix>,
    "URI" | "Fix" | "Traversable" | keyof CovariantK<URI, Fix>
  >
) => TraversableK<URI, Fix>
export function makeTraversable<URI, Fix = any>(
  C: CovariantF<URI, Fix>
): (
  _: Omit<
    TraversableF<URI, Fix>,
    "URI" | "Fix" | "Traversable" | keyof CovariantF<URI, Fix>
  >
) => TraversableF<URI, Fix>
export function makeTraversable<URI>(
  C: CovariantF<URI>
): (_: Omit<TraversableF<URI>, "URI" | "Fix" | "Traversable">) => TraversableF<URI> {
  return (_) => ({
    Traversable: "Traversable",
    ..._,
    ...C
  })
}

export function implementForeachF<F extends URIS, Fix = any>(F: F) {
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
      f: (a: A) => HKTFix<G, GFix, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
    ) => <FSI, FSO, FX, FIn, FSt, FEnv>(
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
  ): ForeachK<F, Fix> =>
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
