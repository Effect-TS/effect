import * as E from "../../Either"
import { HasURI, HKTFull, KindFull, URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[Either[A, B]]`.
 */
export interface AssociativeEitherF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly either: <K2, NK2 extends string, SI2, SO2, X2, In2, S, Env2, Err2, B>(
    fb: HKTFull<F, TL0, TL1, TL2, TL3, K2, NK2, SI2, SO2, X2, In2, S, Env2, Err2, B>
  ) => <K, NK extends string, SI, SO, X, In, Env, Err, A>(
    fa: HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => HKTFull<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
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
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly either: <K2, NK2 extends string, SI2, SO2, X2, In2, S, Env2, Err2, B>(
    fb: KindFull<F, TL0, TL1, TL2, TL3, K2, NK2, SI2, SO2, X2, In2, S, Env2, Err2, B>
  ) => <K, NK extends string, SI, SO, X, In, Env, Err, A>(
    fa: KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => KindFull<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
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
