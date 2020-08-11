import { CovariantF, CovariantFE, CovariantK, CovariantKE } from "../Covariant"
import { HKT10, Kind, URIS } from "../HKT"
import {
  IdentityBothF,
  IdentityBothFE,
  IdentityBothK,
  IdentityBothKE
} from "../IdentityBoth"

export interface ForeachF<F> {
  <G>(G: IdentityBothF<G> & CovariantF<G>): <
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
    f: (a: A) => HKT10<G, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
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
    B
  >(
    f: (a: A) => HKT10<G, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
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
    B
  >(
    f: (a: A) => Kind<G, GK, GKN, unknown, unknown, X, In, S, Env, Err, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
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
    B
  >(
    f: (a: A) => Kind<G, GK, GKN, unknown, unknown, X, In, S, Env, Err, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
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

export interface TraversableF<F> extends CovariantF<F> {
  readonly Traversable: "Traversable"
  readonly foreachF: ForeachF<F>
}

export interface ForeachK<F extends URIS> {
  <G>(G: IdentityBothF<G> & CovariantF<G>): <
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
    f: (a: A) => HKT10<G, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
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
    B
  >(
    f: (a: A) => HKT10<G, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
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
    B
  >(
    f: (a: A) => Kind<G, GK, GKN, unknown, unknown, X, In, S, Env, Err, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
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
    B
  >(
    f: (a: A) => Kind<G, GK, GKN, unknown, unknown, X, In, S, Env, Err, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
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

export interface TraversableK<F extends URIS> extends CovariantK<F> {
  readonly Traversable: "Traversable"
  readonly foreachF: ForeachK<F>
}

export interface ForeachFE<F, E> {
  <G>(G: IdentityBothF<G> & CovariantF<G>): <
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
    f: (a: A) => HKT10<G, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv>(
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
    B
  >(
    f: (a: A) => HKT10<G, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv>(
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
    B
  >(
    f: (a: A) => Kind<G, GK, GKN, unknown, unknown, X, In, S, Env, Err, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv>(
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
    B
  >(
    f: (a: A) => Kind<G, GK, GKN, unknown, unknown, X, In, S, Env, Err, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv>(
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

export interface TraversableFE<F, E> extends CovariantFE<F, E> {
  readonly Traversable: "Traversable"
  readonly foreachF: ForeachFE<F, E>
}

export interface ForeachKE<F extends URIS, E> {
  <G>(G: IdentityBothF<G> & CovariantF<G>): <
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
    f: (a: A) => HKT10<G, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv>(
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
    B
  >(
    f: (a: A) => HKT10<G, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv>(
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
    B
  >(
    f: (a: A) => Kind<G, GK, GKN, unknown, unknown, X, In, S, Env, Err, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv>(
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
    B
  >(
    f: (a: A) => Kind<G, GK, GKN, unknown, unknown, X, In, S, Env, Err, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FIn, FSt, FEnv>(
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

export interface TraversableKE<F extends URIS, E> extends CovariantKE<F, E> {
  readonly Traversable: "Traversable"
  readonly foreachF: ForeachKE<F, E>
}

export function makeTraversable<URI extends URIS>(
  C: CovariantK<URI>
): (
  _: Omit<TraversableK<URI>, "URI" | "Traversable" | keyof CovariantK<URI>>
) => TraversableK<URI>
export function makeTraversable<URI>(
  C: CovariantF<URI>
): (
  _: Omit<TraversableF<URI>, "URI" | "Traversable" | keyof CovariantF<URI>>
) => TraversableF<URI>
export function makeTraversable<URI>(
  C: CovariantF<URI>
): (_: Omit<TraversableF<URI>, "URI" | "Traversable">) => TraversableF<URI> {
  return (_) => ({
    Traversable: "Traversable",
    ..._,
    ...C
  })
}

export function makeTraversableE<URI extends URIS, E>(
  C: CovariantKE<URI, E>
): (
  _: Omit<TraversableKE<URI, E>, "URI" | "Traversable" | keyof CovariantKE<URI, E>>
) => TraversableKE<URI, E>
export function makeTraversableE<URI, E>(
  C: CovariantFE<URI, E>
): (
  _: Omit<TraversableFE<URI, E>, "URI" | "Traversable" | keyof CovariantFE<URI, E>>
) => TraversableFE<URI, E>
export function makeTraversableE<URI, E>(
  C: CovariantFE<URI, E>
): (
  _: Omit<TraversableFE<URI, E>, "URI" | "Traversable" | keyof CovariantFE<URI, E>>
) => TraversableFE<URI, E> {
  return (_) => ({
    Traversable: "Traversable",
    ..._,
    ...C
  })
}

export function implementForeachF<F extends URIS>(F: F) {
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
      f: (a: A) => HKT10<G, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
    ) => <FSI, FSO, FX, FIn, FSt, FEnv>(
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
  ): ForeachK<F> =>
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

export function implementForeachFE<F extends URIS>(F: F) {
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
      B
    >(_: {
      _g: G
      _b: B
      _ge: GE
      _gi: GI
      _gs: GS
      _gr: GR
      _gx: GX
      _a: A
      _fk: FK
      _fkn: FKN
    }) => (
      G: IdentityBothF<G> & CovariantF<G>
    ) => (
      f: (a: A) => HKT10<G, GK, GKN, unknown, unknown, GX, GI, GS, GR, GE, B>
    ) => <FSI, FSO, FX, FIn, FSt, FEnv>(
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
  ): ForeachK<F> =>
    i({
      _b: {},
      _ge: {},
      _gi: {},
      _gr: {},
      _gs: {},
      _gx: {},
      _g: {},
      _a: {},
      _fk: {},
      _fkn: undefined as any
    }) as any
}
