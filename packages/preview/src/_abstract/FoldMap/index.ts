import { HasURI, HKTFix, KindFix, URIS } from "../HKT"
import { Identity } from "../Identity"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface FoldMapF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>
  extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly foldMap: <M>(
    I: Identity<M>
  ) => <A>(
    f: (a: A) => M
  ) => <K, NK extends string, SI, SO, X, In, S, Env, Err>(
    fa: HKTFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => M
}

export interface FoldMapK<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly foldMap: <M>(
    I: Identity<M>
  ) => <A>(
    f: (a: A) => M
  ) => <K, NK extends string, SI, SO, X, In, S, Env, Err>(
    fa: KindFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => M
}

export function makeFoldMap<
  URI extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  _: URI
): (
  _: Omit<
    FoldMapK<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => FoldMapK<URI, Fix0, Fix1, Fix2, Fix3>
export function makeFoldMap<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (
  _: Omit<
    FoldMapF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => FoldMapF<URI, Fix0, Fix1, Fix2, Fix3>
export function makeFoldMap<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (
  _: Omit<
    FoldMapF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => FoldMapF<URI, Fix0, Fix1, Fix2, Fix3> {
  return (_) => ({
    URI,
    Fix0: undefined as any,
    Fix1: undefined as any,
    Fix2: undefined as any,
    Fix3: undefined as any,
    FoldMap: "FoldMap",
    ..._
  })
}
