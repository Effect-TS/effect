import { HasURI, HKTFix, KindFix, URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface ReduceRightF<F, Fix = any> extends HasURI<F, Fix> {
  readonly ReduceRight: "ReduceRight"
  readonly reduce: <A, B>(
    b: B,
    f: (a: A, b: B) => B
  ) => <K, NK extends string, SI, SO, X, In, S, Env, Err>(
    fa: HKTFix<F, Fix, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => B
}

export interface ReduceRightK<F extends URIS, Fix = any> extends HasURI<F, Fix> {
  readonly ReduceRight: "ReduceRight"
  readonly reduce: <A, B>(
    b: B,
    f: (a: A, b: B) => B
  ) => <K, NK extends string, SI, SO, X, In, S, Env, Err>(
    fa: KindFix<F, Fix, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => B
}

export function makeReduceRight<URI extends URIS, Fix = any>(
  _: URI
): (
  _: Omit<ReduceRightK<URI, Fix>, "URI" | "Fix" | "ReduceRight">
) => ReduceRightK<URI, Fix>
export function makeReduceRight<URI, Fix = any>(
  URI: URI
): (
  _: Omit<ReduceRightF<URI, Fix>, "URI" | "Fix" | "ReduceRight">
) => ReduceRightF<URI, Fix>
export function makeReduceRight<URI, Fix = any>(
  URI: URI
): (
  _: Omit<ReduceRightF<URI, Fix>, "URI" | "Fix" | "ReduceRight">
) => ReduceRightF<URI, Fix> {
  return (_) => ({
    URI,
    Fix: undefined as any,
    ReduceRight: "ReduceRight",
    ..._
  })
}
