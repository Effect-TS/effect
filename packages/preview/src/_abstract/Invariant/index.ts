import { HasURI, HKTFix, KindFix, URIS } from "../HKT"

export interface InvariantF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>
  extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: <K, NK extends string, SI, SO, X, In, S, Env, Err>(
      ma: HKTFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, S, Env, Err, A>
    ) => HKTFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, S, Env, Err, B>
    g: <K, NK extends string, SI, SO, X, In, S, Env, Err>(
      mb: HKTFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, S, Env, Err, B>
    ) => HKTFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, S, Env, Err, A>
  }
}

export interface InvariantK<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: <K, NK extends string, SI, SO, X, In, S, Env, Err>(
      ma: KindFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, S, Env, Err, A>
    ) => KindFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, S, Env, Err, B>
    g: <K, NK extends string, SI, SO, X, In, S, Env, Err>(
      mb: KindFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, S, Env, Err, B>
    ) => KindFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, S, Env, Err, A>
  }
}

export function makeInvariant<
  URI extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  _: URI
): (
  _: Omit<
    InvariantK<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => InvariantK<URI, Fix0, Fix1, Fix2, Fix3>
export function makeInvariant<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (
  _: Omit<
    InvariantF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => InvariantF<URI, Fix0, Fix1, Fix2, Fix3>
export function makeInvariant<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (
  _: Omit<
    InvariantF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => InvariantF<URI, Fix0, Fix1, Fix2, Fix3> {
  return (_) => ({
    URI,
    Fix0: undefined as any,
    Fix1: undefined as any,
    Fix2: undefined as any,
    Fix3: undefined as any,
    ..._
  })
}
