import { HasURI, HKTFix, KindFix, URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface ReduceF<F, Fix = any> extends HasURI<F, Fix> {
  readonly Reduce: "Reduce"
  readonly reduce: <A, B>(
    b: B,
    f: (b: B, a: A) => B
  ) => <K, NK extends string, SI, SO, X, In, S, Env, Err>(
    fa: HKTFix<F, Fix, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => B
}

export interface ReduceK<F extends URIS, Fix = any> extends HasURI<F, Fix> {
  readonly Reduce: "Reduce"
  readonly reduce: <A, B>(
    b: B,
    f: (b: B, a: A) => B
  ) => <K, NK extends string, SI, SO, X, In, S, Env, Err>(
    fa: KindFix<F, Fix, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => B
}

export function makeReduce<URI extends URIS, Fix = any>(
  _: URI
): (_: Omit<ReduceK<URI, Fix>, "URI" | "Fix" | "Reduce">) => ReduceK<URI, Fix>
export function makeReduce<URI, Fix = any>(
  URI: URI
): (_: Omit<ReduceF<URI, Fix>, "URI" | "Fix" | "Reduce">) => ReduceF<URI, Fix>
export function makeReduce<URI, Fix = any>(
  URI: URI
): (_: Omit<ReduceF<URI, Fix>, "URI" | "Fix" | "Reduce">) => ReduceF<URI, Fix> {
  return (_) => ({
    URI,
    Fix: undefined as any,
    Reduce: "Reduce",
    ..._
  })
}
