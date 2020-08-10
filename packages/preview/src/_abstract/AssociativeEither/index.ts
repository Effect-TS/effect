import * as E from "../../Either"
import { HasConstrainedE, HasURI, HKT9, Kind, URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[Either[A, B]]`.
 */
export interface AssociativeEitherF<F> extends HasURI<F> {
  readonly AssociativeEither: "AssociativeEither"
  readonly either: <K2 extends string, SI2, SO2, X2, In2, S, Env2, Err2, B>(
    fb: HKT9<F, K2, SI2, SO2, X2, In2, S, Env2, Err2, B>
  ) => <K extends string, SI, SO, X, In, Env, Err, A>(
    fa: HKT9<F, K, SI, SO, X, In, S, Env, Err, A>
  ) => HKT9<
    F,
    K | K2,
    SI & SI2,
    SO | SO2,
    X2 | X,
    In2 & In,
    S,
    Env2 & Env,
    Err2,
    E.Either<A, B>
  >
}

export interface AssociativeEitherK<F extends URIS> extends HasURI<F> {
  readonly AssociativeEither: "AssociativeEither"
  readonly either: <K2 extends string, SI2, SO2, X2, In2, S, Env2, Err2, B>(
    fb: Kind<F, K2, SI2, SO2, X2, In2, S, Env2, Err2, B>
  ) => <K extends string, SI, SO, X, In, Env, Err, A>(
    fa: Kind<F, K, SI, SO, X, In, S, Env, Err, A>
  ) => Kind<
    F,
    K | K2,
    SI & SI2,
    SO | SO2,
    X2 | X,
    In2 & In,
    S,
    Env2 & Env,
    Err2,
    E.Either<A, B>
  >
}

export interface AssociativeEitherFE<F, E> extends HasConstrainedE<F, E> {
  readonly AssociativeEither: "AssociativeEither"
  readonly either: <K2 extends string, SI2, SO2, X2, In2, S, Env2, B>(
    fb: HKT9<F, K2, SI2, SO2, X2, In2, S, Env2, E, B>
  ) => <K extends string, SI, SO, X, In, Env, A>(
    fa: HKT9<F, K, SI, SO, X, In, S, Env, E, A>
  ) => HKT9<
    F,
    K | K2,
    SI & SI2,
    SO | SO2,
    X2 | X,
    In2 & In,
    S,
    Env2 & Env,
    E,
    E.Either<A, B>
  >
}

export interface AssociativeEitherKE<F extends URIS, E> extends HasConstrainedE<F, E> {
  readonly AssociativeEither: "AssociativeEither"
  readonly either: <K2 extends string, SI2, SO2, X2, In2, S, Env2, B>(
    fb: Kind<F, K2, SI2, SO2, X2, In2, S, Env2, E, B>
  ) => <K extends string, SI, SO, X, In, Env, A>(
    fa: Kind<F, K, SI, SO, X, In, S, Env, E, A>
  ) => Kind<
    F,
    K | K2,
    SI & SI2,
    SO | SO2,
    X2 | X,
    In2 & In,
    S,
    Env2 & Env,
    E,
    E.Either<A, B>
  >
}

export function makeAssociativeEither<URI extends URIS>(
  _: URI
): (
  _: Omit<AssociativeEitherK<URI>, "URI" | "AssociativeEither">
) => AssociativeEitherK<URI>
export function makeAssociativeEither<URI>(
  URI: URI
): (
  _: Omit<AssociativeEitherF<URI>, "URI" | "AssociativeEither">
) => AssociativeEitherF<URI>
export function makeAssociativeEither<URI>(
  URI: URI
): (
  _: Omit<AssociativeEitherF<URI>, "URI" | "AssociativeEither">
) => AssociativeEitherF<URI> {
  return (_) => ({
    URI,
    AssociativeEither: "AssociativeEither",
    ..._
  })
}

export function makeAssociativeEitherE<URI extends URIS>(
  _: URI
): <E>() => (
  _: Omit<AssociativeEitherKE<URI, E>, "URI" | "AssociativeEither" | "E">
) => AssociativeEitherKE<URI, E>
export function makeAssociativeEitherE<URI>(
  URI: URI
): <E>() => (
  _: Omit<AssociativeEitherFE<URI, E>, "URI" | "AssociativeEither" | "E">
) => AssociativeEitherFE<URI, E>
export function makeAssociativeEitherE<URI>(
  URI: URI
): <E>() => (
  _: Omit<AssociativeEitherFE<URI, E>, "URI" | "AssociativeEither" | "E">
) => AssociativeEitherFE<URI, E> {
  return () => (_) => ({
    URI,
    AssociativeEither: "AssociativeEither",
    E: undefined as any,
    ..._
  })
}
