import * as E from "../../../../Either"
import { HasURI, HKT8, KindEx, URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[Either[A, B]]`.
 */
export interface AssociativeEitherF<F> extends HasURI<F> {
  readonly AssociativeEither: "AssociativeEither"
  readonly either: <SI2, SO2, X2, In2, S, Env2, Err2, B>(
    fb: HKT8<F, SI2, SO2, X2, In2, S, Env2, Err2, B>
  ) => <SI, SO, X, In, Env, Err, A>(
    fa: HKT8<F, SI, SO, X, In, S, Env, Err, A>
  ) => HKT8<
    F,
    SI & SI2,
    SO | SO2,
    X2 | X,
    In2 & In,
    S,
    Env2 & Env,
    Err2 | Err,
    E.Either<A, B>
  >
}

export interface AssociativeEitherK<F extends URIS> extends HasURI<F> {
  readonly AssociativeEither: "AssociativeEither"
  readonly either: <SI2, SO2, X2, In2, S, Env2, Err2, B>(
    fb: KindEx<F, SI2, SO2, X2, In2, S, Env2, Err2, B>
  ) => <I, O, X, In, Env, Err, A>(
    fa: KindEx<F, I, O, X, In, S, Env, Err, A>
  ) => KindEx<
    F,
    I & SI2,
    O | SO2,
    X2 | X,
    In2 & In,
    S,
    Env2 & Env,
    Err2 | Err,
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
