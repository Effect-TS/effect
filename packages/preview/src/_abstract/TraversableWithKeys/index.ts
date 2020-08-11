import { CovariantF, CovariantFE, CovariantK, CovariantKE } from "../Covariant"
import { HKT10, KeyFor, Kind, URIS } from "../HKT"
import {
  IdentityBothF,
  IdentityBothFE,
  IdentityBothK,
  IdentityBothKE
} from "../IdentityBoth"

export interface ForeachWithKeysF<F> {
  <G>(G: IdentityBothF<G> & CovariantF<G>): <
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
      k: KeyFor<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
    ) => HKT10<G, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
  ) => (
    fa: HKT10<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => HKT10<
    G,
    GK,
    GKN,
    unknown,
    unknown,
    GX,
    GI,
    GS,
    GR,
    GE,
    HKT10<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
  <G, GE>(G: IdentityBothFE<G, GE> & CovariantFE<G, GE>): <
    GK,
    GKN extends string,
    GX,
    GI,
    GS,
    GR,
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
      k: KeyFor<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
    ) => HKT10<G, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
  ) => (
    fa: HKT10<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => HKT10<
    G,
    GK,
    GKN,
    unknown,
    unknown,
    GX,
    GI,
    GS,
    GR,
    GE,
    HKT10<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
  <G extends URIS>(G: IdentityBothK<G> & CovariantK<G>): <
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
      k: KeyFor<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
    ) => Kind<G, GK, GKN, unknown, unknown, X, In, S, Env, Err, B>
  ) => (
    fa: HKT10<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => Kind<
    G,
    GK,
    GKN,
    unknown,
    unknown,
    X,
    In,
    S,
    Env,
    Err,
    HKT10<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
  <G extends URIS, Err>(G: IdentityBothKE<G, Err> & CovariantKE<G, Err>): <
    GK,
    GKN extends string,
    X,
    In,
    S,
    Env,
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
      k: KeyFor<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
    ) => Kind<G, GK, GKN, unknown, unknown, X, In, S, Env, Err, B>
  ) => (
    fa: HKT10<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => Kind<
    G,
    GK,
    GKN,
    unknown,
    unknown,
    X,
    In,
    S,
    Env,
    Err,
    HKT10<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
}

export interface TraversableWithKeysF<F> extends CovariantF<F> {
  readonly TraversableWithKeys: "TraversableWithKeys"
  readonly foreachWithKeysF: ForeachWithKeysF<F>
}

export interface ForeachWithKeysK<F extends URIS> {
  <G>(G: IdentityBothF<G> & CovariantF<G>): <
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
      k: KeyFor<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
    ) => HKT10<G, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
  ) => (
    fa: Kind<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => HKT10<
    G,
    GK,
    GKN,
    unknown,
    unknown,
    GX,
    GI,
    GS,
    GR,
    GE,
    Kind<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
  <G, GE>(G: IdentityBothFE<G, GE> & CovariantFE<G, GE>): <
    GK,
    GKN extends string,
    GX,
    GI,
    GS,
    GR,
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
      k: KeyFor<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
    ) => HKT10<G, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
  ) => (
    fa: Kind<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => HKT10<
    G,
    GK,
    GKN,
    unknown,
    unknown,
    GX,
    GI,
    GS,
    GR,
    GE,
    Kind<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
  <G extends URIS>(G: IdentityBothK<G> & CovariantK<G>): <
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
      k: KeyFor<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
    ) => Kind<G, GK, GKN, unknown, unknown, X, In, S, Env, Err, B>
  ) => (
    fa: Kind<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => Kind<
    G,
    GK,
    GKN,
    unknown,
    unknown,
    X,
    In,
    S,
    Env,
    Err,
    Kind<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
  <G extends URIS, Err>(G: IdentityBothKE<G, Err> & CovariantKE<G, Err>): <
    GK,
    GKN extends string,
    X,
    In,
    S,
    Env,
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
      k: KeyFor<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
    ) => Kind<G, GK, GKN, unknown, unknown, X, In, S, Env, Err, B>
  ) => (
    fa: Kind<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => Kind<
    G,
    GK,
    GKN,
    unknown,
    unknown,
    X,
    In,
    S,
    Env,
    Err,
    Kind<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
}

export interface TraversableWithKeysK<F extends URIS> extends CovariantK<F> {
  readonly TraversableWithKeys: "TraversableWithKeys"
  readonly foreachWithKeysF: ForeachWithKeysK<F>
}

export interface ForeachWithKeysFE<F, E> {
  <G>(G: IdentityBothF<G> & CovariantF<G>): <
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
    FEnv
  >(
    f: (
      a: A,
      k: KeyFor<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
    ) => HKT10<G, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
  ) => (
    fa: HKT10<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
  ) => HKT10<
    G,
    GK,
    GKN,
    unknown,
    unknown,
    GX,
    GI,
    GS,
    GR,
    GE,
    HKT10<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, B>
  >
  <G, GE>(G: IdentityBothFE<G, GE> & CovariantFE<G, GE>): <
    GK,
    GKN extends string,
    GX,
    GI,
    GS,
    GR,
    A,
    B,
    FK,
    FKN extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv
  >(
    f: (
      a: A,
      k: KeyFor<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
    ) => HKT10<G, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
  ) => (
    fa: HKT10<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
  ) => HKT10<
    G,
    GK,
    GKN,
    unknown,
    unknown,
    GX,
    GI,
    GS,
    GR,
    GE,
    HKT10<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, B>
  >
  <G extends URIS>(G: IdentityBothK<G> & CovariantK<G>): <
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
    FEnv
  >(
    f: (
      a: A,
      k: KeyFor<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
    ) => Kind<G, GK, GKN, unknown, unknown, X, In, S, Env, Err, B>
  ) => (
    fa: HKT10<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
  ) => Kind<
    G,
    GK,
    GKN,
    unknown,
    unknown,
    X,
    In,
    S,
    Env,
    Err,
    HKT10<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, B>
  >
  <G extends URIS, Err>(G: IdentityBothKE<G, Err> & CovariantKE<G, Err>): <
    GK,
    GKN extends string,
    X,
    In,
    S,
    Env,
    A,
    B,
    FK,
    FKN extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv
  >(
    f: (
      a: A,
      k: KeyFor<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
    ) => Kind<G, GK, GKN, unknown, unknown, X, In, S, Env, Err, B>
  ) => (
    fa: HKT10<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
  ) => Kind<
    G,
    GK,
    GKN,
    unknown,
    unknown,
    X,
    In,
    S,
    Env,
    Err,
    HKT10<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, B>
  >
}

export interface TraversableWithKeysFE<F, E> extends CovariantFE<F, E> {
  readonly TraversableWithKeys: "TraversableWithKeys"
  readonly foreachWithKeysF: ForeachWithKeysFE<F, E>
}

export interface ForeachWithKeysKE<F extends URIS, E> {
  <G>(G: IdentityBothF<G> & CovariantF<G>): <
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
    E
  >(
    f: (
      a: A,
      k: KeyFor<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
    ) => HKT10<G, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
  ) => (
    fa: Kind<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
  ) => HKT10<
    G,
    GK,
    GKN,
    unknown,
    unknown,
    GX,
    GI,
    GS,
    GR,
    GE,
    Kind<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, B>
  >
  <G, GE>(G: IdentityBothFE<G, GE> & CovariantFE<G, GE>): <
    GK,
    GKN extends string,
    GX,
    GI,
    GS,
    GR,
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
    E
  >(
    f: (
      a: A,
      k: KeyFor<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
    ) => HKT10<G, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
  ) => (
    fa: Kind<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
  ) => HKT10<
    G,
    GK,
    GKN,
    unknown,
    unknown,
    GX,
    GI,
    GS,
    GR,
    GE,
    Kind<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, B>
  >
  <G extends URIS>(G: IdentityBothK<G> & CovariantK<G>): <
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
    E
  >(
    f: (
      a: A,
      k: KeyFor<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
    ) => Kind<G, GK, GKN, unknown, unknown, X, In, S, Env, Err, B>
  ) => (
    fa: Kind<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
  ) => Kind<
    G,
    GK,
    GKN,
    unknown,
    unknown,
    X,
    In,
    S,
    Env,
    Err,
    Kind<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, B>
  >
  <G extends URIS, Err>(G: IdentityBothKE<G, Err> & CovariantKE<G, Err>): <
    GK,
    GKN extends string,
    X,
    In,
    S,
    Env,
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
    E
  >(
    f: (
      a: A,
      k: KeyFor<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
    ) => Kind<G, GK, GKN, unknown, unknown, X, In, S, Env, Err, B>
  ) => (
    fa: Kind<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
  ) => Kind<
    G,
    GK,
    GKN,
    unknown,
    unknown,
    X,
    In,
    S,
    Env,
    Err,
    Kind<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, B>
  >
}

export interface TraversableWithKeysKE<F extends URIS, E> extends CovariantKE<F, E> {
  readonly TraversableWithKeys: "TraversableWithKeys"
  readonly foreachWithKeysF: ForeachWithKeysKE<F, E>
}

export function makeTraversableWithKeys<URI extends URIS>(
  C: CovariantK<URI>
): (
  _: Omit<
    TraversableWithKeysK<URI>,
    "URI" | "TraversableWithKeys" | keyof CovariantK<URI>
  >
) => TraversableWithKeysK<URI>
export function makeTraversableWithKeys<URI>(
  C: CovariantF<URI>
): (
  _: Omit<
    TraversableWithKeysF<URI>,
    "URI" | "TraversableWithKeys" | keyof CovariantF<URI>
  >
) => TraversableWithKeysF<URI>
export function makeTraversableWithKeys<URI>(
  C: CovariantF<URI>
): (
  _: Omit<TraversableWithKeysF<URI>, "URI" | "TraversableWithKeys">
) => TraversableWithKeysF<URI> {
  return (_) => ({
    TraversableWithKeys: "TraversableWithKeys",
    ..._,
    ...C
  })
}

export function makeTraversableWithKeysE<URI extends URIS>(
  C: CovariantK<URI>
): <E>() => (
  _: Omit<
    TraversableWithKeysKE<URI, E>,
    "URI" | "TraversableWithKeys" | keyof CovariantKE<URI, E>
  >
) => TraversableWithKeysKE<URI, E>
export function makeTraversableWithKeysE<URI>(
  C: CovariantF<URI>
): <E>() => (
  _: Omit<
    TraversableWithKeysFE<URI, E>,
    "URI" | "TraversableWithKeys" | keyof CovariantFE<URI, E>
  >
) => TraversableWithKeysFE<URI, E>
export function makeTraversableWithKeysE<URI>(
  C: CovariantF<URI>
): <E>() => (
  _: Omit<
    TraversableWithKeysFE<URI, E>,
    "URI" | "TraversableWithKeys" | keyof CovariantFE<URI, E>
  >
) => TraversableWithKeysFE<URI, E> {
  return () => (_) => ({
    TraversableWithKeys: "TraversableWithKeys",
    E: undefined as any,
    ..._,
    ...C
  })
}

export function implementForeachWithKeysF<F extends URIS>(F: F) {
  return (
    i: <
      FErr,
      FK,
      FKN extends string,
      A,
      G,
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
        k: KeyFor<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
      ) => HKT10<G, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
    ) => (
      fa: Kind<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
    ) => HKT10<
      G,
      GK,
      GKN,
      unknown,
      unknown,
      GX,
      GI,
      GS,
      GR,
      GE,
      Kind<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
    >
  ): ForeachWithKeysK<F> =>
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

export function implementForeachWithKeysFE<F extends URIS>(F: F) {
  return <E>() => (
    i: <
      FK,
      FKN extends string,
      GK,
      GKN extends string,
      G,
      GX,
      GI,
      GS,
      GR,
      GE,
      A,
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
      _a: A
    }) => (
      G: IdentityBothF<G> & CovariantF<G>
    ) => (
      f: (
        a: A,
        k: KeyFor<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
      ) => HKT10<G, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
    ) => (
      fa: Kind<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
    ) => HKT10<
      G,
      GK,
      GKN,
      unknown,
      unknown,
      GX,
      GI,
      GS,
      GR,
      GE,
      Kind<F, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, B>
    >
  ): ForeachWithKeysK<F> =>
    i({ _b: {}, _ge: {}, _gi: {}, _gr: {}, _gs: {}, _gx: {}, _g: {}, _a: {} }) as any
}
