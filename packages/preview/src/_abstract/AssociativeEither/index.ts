import * as E from "../../Either"
import { HasURI, HKTFix, KindFix, URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[Either[A, B]]`.
 */
export interface AssociativeEitherF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>
  extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly AssociativeEither: "AssociativeEither"
  readonly either: <K2, NK2 extends string, SI2, SO2, X2, In2, S, Env2, Err2, B>(
    fb: HKTFix<F, Fix0, Fix1, Fix2, Fix3, K2, NK2, SI2, SO2, X2, In2, S, Env2, Err2, B>
  ) => <K, NK extends string, SI, SO, X, In, Env, Err, A>(
    fa: HKTFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => HKTFix<
    F,
    Fix0,
    Fix1,
    Fix2,
    Fix3,
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

export interface AssociativeEitherK<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly AssociativeEither: "AssociativeEither"
  readonly either: <K2, NK2 extends string, SI2, SO2, X2, In2, S, Env2, Err2, B>(
    fb: KindFix<F, Fix0, Fix1, Fix2, Fix3, K2, NK2, SI2, SO2, X2, In2, S, Env2, Err2, B>
  ) => <K, NK extends string, SI, SO, X, In, Env, Err, A>(
    fa: KindFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => KindFix<
    F,
    Fix0,
    Fix1,
    Fix2,
    Fix3,
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

export function makeAssociativeEither<
  URI extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  _: URI
): (
  _: Omit<
    AssociativeEitherK<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3" | "AssociativeEither"
  >
) => AssociativeEitherK<URI, Fix0, Fix1, Fix2, Fix3>
export function makeAssociativeEither<
  URI,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  URI: URI
): (
  _: Omit<
    AssociativeEitherF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3" | "AssociativeEither"
  >
) => AssociativeEitherF<URI, Fix0, Fix1, Fix2, Fix3>
export function makeAssociativeEither<
  URI,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  URI: URI
): (
  _: Omit<
    AssociativeEitherF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3" | "AssociativeEither"
  >
) => AssociativeEitherF<URI, Fix0, Fix1, Fix2, Fix3> {
  return (_) => ({
    URI,
    Fix0: undefined as any,
    Fix1: undefined as any,
    Fix2: undefined as any,
    Fix3: undefined as any,
    AssociativeEither: "AssociativeEither",
    ..._
  })
}
