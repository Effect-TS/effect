import { HasURI, HKTFix, KindFix, URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface ReduceRightF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>
  extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly ReduceRight: "ReduceRight"
  readonly reduce: <A, B>(
    b: B,
    f: (a: A, b: B) => B
  ) => <K, NK extends string, SI, SO, X, In, S, Env, Err>(
    fa: HKTFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => B
}

export interface ReduceRightK<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly ReduceRight: "ReduceRight"
  readonly reduce: <A, B>(
    b: B,
    f: (a: A, b: B) => B
  ) => <K, NK extends string, SI, SO, X, In, S, Env, Err>(
    fa: KindFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => B
}

export function makeReduceRight<
  URI extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  _: URI
): (
  _: Omit<
    ReduceRightK<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3" | "ReduceRight"
  >
) => ReduceRightK<URI, Fix0, Fix1, Fix2, Fix3>
export function makeReduceRight<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (
  _: Omit<
    ReduceRightF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3" | "ReduceRight"
  >
) => ReduceRightF<URI, Fix0, Fix1, Fix2, Fix3>
export function makeReduceRight<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (
  _: Omit<
    ReduceRightF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3" | "ReduceRight"
  >
) => ReduceRightF<URI, Fix0, Fix1, Fix2, Fix3> {
  return (_) => ({
    URI,
    Fix0: undefined as any,
    Fix1: undefined as any,
    Fix2: undefined as any,
    Fix3: undefined as any,
    ReduceRight: "ReduceRight",
    ..._
  })
}
