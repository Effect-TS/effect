import * as E from "../../Either"
import { HasURI, HKTFix, KindFix, URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[Either[A, B]]`.
 */
export interface AssociativeEitherF<F, Fix = any> extends HasURI<F, Fix> {
  readonly AssociativeEither: "AssociativeEither"
  readonly either: <K2, NK2 extends string, SI2, SO2, X2, In2, S, Env2, Err2, B>(
    fb: HKTFix<F, Fix, K2, NK2, SI2, SO2, X2, In2, S, Env2, Err2, B>
  ) => <K, NK extends string, SI, SO, X, In, Env, Err, A>(
    fa: HKTFix<F, Fix, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => HKTFix<
    F,
    Fix,
    K | K2,
    NK | NK2,
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

export interface AssociativeEitherK<F extends URIS, Fix = any> extends HasURI<F, Fix> {
  readonly AssociativeEither: "AssociativeEither"
  readonly either: <K2, NK2 extends string, SI2, SO2, X2, In2, S, Env2, Err2, B>(
    fb: KindFix<F, Fix, K2, NK2, SI2, SO2, X2, In2, S, Env2, Err2, B>
  ) => <K, NK extends string, SI, SO, X, In, Env, Err, A>(
    fa: KindFix<F, Fix, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => KindFix<
    F,
    Fix,
    K | K2,
    NK | NK2,
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

export function makeAssociativeEither<URI extends URIS, Fix = any>(
  _: URI
): (
  _: Omit<AssociativeEitherK<URI, Fix>, "URI" | "Fix" | "AssociativeEither">
) => AssociativeEitherK<URI, Fix>
export function makeAssociativeEither<URI, Fix = any>(
  URI: URI
): (
  _: Omit<AssociativeEitherF<URI, Fix>, "URI" | "Fix" | "AssociativeEither">
) => AssociativeEitherF<URI, Fix>
export function makeAssociativeEither<URI, Fix = any>(
  URI: URI
): (
  _: Omit<AssociativeEitherF<URI, Fix>, "URI" | "Fix" | "AssociativeEither">
) => AssociativeEitherF<URI, Fix> {
  return (_) => ({
    URI,
    Fix: undefined as any,
    AssociativeEither: "AssociativeEither",
    ..._
  })
}
