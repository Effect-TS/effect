import { HasE, HasURI, HKTFull, KindFull, URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface ReduceF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly reduce: <A, B>(
    b: B,
    f: (b: B, a: A) => B
  ) => <K, NK extends string, SI, SO, X, In, S, Env, Err>(
    fa: HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => B
}

export interface ReduceK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly reduce: <A, B>(
    b: B,
    f: (b: B, a: A) => B
  ) => <K, NK extends string, SI, SO, X, In, S, Env, Err>(
    fa: KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => B
}

export interface ReduceKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends HasURI<F, TL0, TL1, TL2, TL3>, HasE<E> {
  readonly reduce: <A, B>(
    b: B,
    f: (b: B, a: A) => B
  ) => <K, NK extends string, SI, SO, X, In, S, Env>(
    fa: KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, E, A>
  ) => B
}

export function makeReduce<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    ReduceKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "_E"
  >
) => ReduceKE<URI, E, TL0, TL1, TL2, TL3>
export function makeReduce<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<ReduceK<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => ReduceK<URI, TL0, TL1, TL2, TL3>
export function makeReduce<URI>(): <TL0 = any, TL1 = any, TL2 = any, TL3 = any>() => (
  _: Omit<ReduceF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => ReduceF<URI, TL0, TL1, TL2, TL3>
export function makeReduce<URI>(): <TL0 = any, TL1 = any, TL2 = any, TL3 = any>() => (
  _: Omit<ReduceF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => ReduceF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    Reduce: "Reduce",
    ..._
  })
}
