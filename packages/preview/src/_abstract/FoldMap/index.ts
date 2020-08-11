import { HasURI, HKTFix, KindFix, URIS } from "../HKT"
import { Identity } from "../Identity"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface FoldMapF<F, Fix = any> extends HasURI<F, Fix> {
  readonly FoldMap: "FoldMap"
  readonly foldMap: <M>(
    I: Identity<M>
  ) => <A>(
    f: (a: A) => M
  ) => <K, NK extends string, SI, SO, X, In, S, Env, Err>(
    fa: HKTFix<F, Fix, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => M
}

export interface FoldMapK<F extends URIS, Fix = any> extends HasURI<F, Fix> {
  readonly FoldMap: "FoldMap"
  readonly foldMap: <M>(
    I: Identity<M>
  ) => <A>(
    f: (a: A) => M
  ) => <K, NK extends string, SI, SO, X, In, S, Env, Err>(
    fa: KindFix<F, Fix, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => M
}

export function makeFoldMap<URI extends URIS, Fix = any>(
  _: URI
): (_: Omit<FoldMapK<URI, Fix>, "URI" | "Fix" | "FoldMap">) => FoldMapK<URI, Fix>
export function makeFoldMap<URI, Fix = any>(
  URI: URI
): (_: Omit<FoldMapF<URI, Fix>, "URI" | "Fix" | "FoldMap">) => FoldMapF<URI, Fix>
export function makeFoldMap<URI, Fix = any>(
  URI: URI
): (_: Omit<FoldMapF<URI, Fix>, "URI" | "Fix" | "FoldMap">) => FoldMapF<URI, Fix> {
  return (_) => ({
    URI,
    Fix: undefined as any,
    FoldMap: "FoldMap",
    ..._
  })
}
