import { CovariantF, CovariantFE, CovariantK, CovariantKE } from "../Covariant"
import { HKT8, Kind, URIS } from "../HKT"
import { IdentityBothF, IdentityBothK } from "../IdentityBoth"

export interface ForeachF<F> {
  <G>(G: IdentityBothF<G> & CovariantF<G>): <GSI, GSO, GX, GI, GS, GR, GE, A, B>(
    f: (a: A) => HKT8<G, GSI, GSO, GX, GI, GS, GR, GE, B>
  ) => <FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
    fa: HKT8<F, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => HKT8<
    G,
    GSI,
    GSO,
    GX,
    GI,
    GS,
    GR,
    GE,
    HKT8<F, GSI, GSO, FX, FIn, FSt, FEnv, FErr, B>
  >
  <G extends URIS>(G: IdentityBothK<G> & CovariantK<G>): <
    SI,
    SO,
    X,
    In,
    S,
    Env,
    Err,
    A,
    B
  >(
    f: (a: A) => Kind<G, SI, SO, X, In, S, Env, Err, B>
  ) => <FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
    fa: HKT8<F, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => Kind<
    G,
    SI,
    SO,
    X,
    In,
    S,
    Env,
    Err,
    HKT8<F, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
}

export interface TraversableF<F> extends CovariantF<F> {
  readonly Traversable: "Traversable"
  readonly foreachF: ForeachF<F>
}

export interface ForeachK<F extends URIS> {
  <G>(G: IdentityBothF<G> & CovariantF<G>): <GSI, GSO, GX, GI, GS, GR, GE, A, B>(
    f: (a: A) => HKT8<G, GSI, GSO, GX, GI, GS, GR, GE, B>
  ) => <FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
    fa: Kind<F, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => HKT8<
    G,
    GSI,
    GSO,
    GX,
    GI,
    GS,
    GR,
    GE,
    Kind<F, GSI, GSO, FX, FIn, FSt, FEnv, FErr, B>
  >
  <G extends URIS>(G: IdentityBothK<G> & CovariantK<G>): <
    SI,
    SO,
    X,
    In,
    S,
    Env,
    Err,
    A,
    B
  >(
    f: (a: A) => Kind<G, SI, SO, X, In, S, Env, Err, B>
  ) => <FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
    fa: Kind<F, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => Kind<
    G,
    SI,
    SO,
    X,
    In,
    S,
    Env,
    Err,
    Kind<F, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
}

export interface TraversableK<F extends URIS> extends CovariantK<F> {
  readonly Traversable: "Traversable"
  readonly foreachF: ForeachK<F>
}

export interface ForeachFE<F, E> {
  <G>(G: IdentityBothF<G> & CovariantF<G>): <GSI, GSO, GX, GI, GS, GR, GE, A, B>(
    f: (a: A) => HKT8<G, GSI, GSO, GX, GI, GS, GR, GE, B>
  ) => <FSI, FSO, FX, FIn, FSt, FEnv>(
    fa: HKT8<F, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
  ) => HKT8<
    G,
    GSI,
    GSO,
    GX,
    GI,
    GS,
    GR,
    GE,
    HKT8<F, GSI, GSO, FX, FIn, FSt, FEnv, E, B>
  >
  <G extends URIS>(G: IdentityBothK<G> & CovariantK<G>): <
    SI,
    SO,
    X,
    In,
    S,
    Env,
    Err,
    A,
    B
  >(
    f: (a: A) => Kind<G, SI, SO, X, In, S, Env, Err, B>
  ) => <FSI, FSO, FX, FIn, FSt, FEnv>(
    fa: HKT8<F, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
  ) => Kind<G, SI, SO, X, In, S, Env, Err, HKT8<F, FSI, FSO, FX, FIn, FSt, FEnv, E, B>>
}

export interface TraversableFE<F, E> extends CovariantFE<F, E> {
  readonly Traversable: "Traversable"
  readonly foreachF: ForeachFE<F, E>
}

export interface ForeachKE<F extends URIS, E> {
  <G>(G: IdentityBothF<G> & CovariantF<G>): <GSI, GSO, GX, GI, GS, GR, GE, A, B>(
    f: (a: A) => HKT8<G, GSI, GSO, GX, GI, GS, GR, GE, B>
  ) => <FSI, FSO, FX, FIn, FSt, FEnv>(
    fa: Kind<F, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
  ) => HKT8<
    G,
    GSI,
    GSO,
    GX,
    GI,
    GS,
    GR,
    GE,
    Kind<F, GSI, GSO, FX, FIn, FSt, FEnv, E, B>
  >
  <G extends URIS>(G: IdentityBothK<G> & CovariantK<G>): <
    SI,
    SO,
    X,
    In,
    S,
    Env,
    Err,
    A,
    B
  >(
    f: (a: A) => Kind<G, SI, SO, X, In, S, Env, Err, B>
  ) => <FSI, FSO, FX, FIn, FSt, FEnv>(
    fa: Kind<F, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
  ) => Kind<G, SI, SO, X, In, S, Env, Err, Kind<F, FSI, FSO, FX, FIn, FSt, FEnv, E, B>>
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

export function makeTraversableE<URI extends URIS>(
  C: CovariantK<URI>
): <E>() => (
  _: Omit<TraversableKE<URI, E>, "URI" | "Traversable" | keyof CovariantKE<URI, E>>
) => TraversableKE<URI, E>
export function makeTraversableE<URI>(
  C: CovariantF<URI>
): <E>() => (
  _: Omit<TraversableFE<URI, E>, "URI" | "Traversable" | keyof CovariantFE<URI, E>>
) => TraversableFE<URI, E>
export function makeTraversableE<URI>(
  C: CovariantF<URI>
): <E>() => (
  _: Omit<TraversableFE<URI, E>, "URI" | "Traversable" | keyof CovariantFE<URI, E>>
) => TraversableFE<URI, E> {
  return () => (_) => ({
    Traversable: "Traversable",
    E: undefined as any,
    ..._,
    ...C
  })
}

export function implementForeachF<F extends URIS>(F: F) {
  return (
    i: <GSI, GSO, G, GX, GI, GS, GR, GE, A, B>(_: {
      _g: G
      _b: B
      _ge: GE
      _gi: GI
      _gs: GS
      _gr: GR
      _gx: GX
    }) => (
      G: IdentityBothF<G> & CovariantF<G>
    ) => (
      f: (a: A) => HKT8<GSI, GSO, G, GX, GI, GS, GR, GE, B>
    ) => <FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
      fa: Kind<F, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
    ) => HKT8<
      GSI,
      GSO,
      G,
      GX,
      GI,
      GS,
      GR,
      GE,
      Kind<F, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
    >
  ): ForeachK<F> =>
    i({ _b: {}, _ge: {}, _gi: {}, _gr: {}, _gs: {}, _gx: {}, _g: {} }) as any
}

export function implementForeachFE<F extends URIS>(F: F) {
  return <E>() => (
    i: <GSI, GSO, G, GX, GI, GS, GR, GE, A, B>(_: {
      _g: G
      _b: B
      _ge: GE
      _gi: GI
      _gs: GS
      _gr: GR
      _gx: GX
    }) => (
      G: IdentityBothF<G> & CovariantF<G>
    ) => (
      f: (a: A) => HKT8<G, GSI, GSO, GX, GI, GS, GR, GE, B>
    ) => <FSI, FSO, FX, FIn, FSt, FEnv>(
      fa: Kind<F, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
    ) => HKT8<
      G,
      GSI,
      GSO,
      GX,
      GI,
      GS,
      GR,
      GE,
      Kind<F, FSI, FSO, FX, FIn, FSt, FEnv, E, B>
    >
  ): ForeachK<F> =>
    i({ _b: {}, _ge: {}, _gi: {}, _gr: {}, _gs: {}, _gx: {}, _g: {} }) as any
}
