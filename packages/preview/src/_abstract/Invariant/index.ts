import { HasURI, HKTFix, KindFix, URIS } from "../HKT"

export interface InvariantF<F, Fix = any> extends HasURI<F, Fix> {
  readonly Invariant: "Invariant"
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: <K, NK extends string, SI, SO, X, In, S, Env, Err>(
      ma: HKTFix<F, Fix, K, NK, SI, SO, X, In, S, Env, Err, A>
    ) => HKTFix<F, Fix, K, NK, SI, SO, X, In, S, Env, Err, B>
    g: <K, NK extends string, SI, SO, X, In, S, Env, Err>(
      mb: HKTFix<F, Fix, K, NK, SI, SO, X, In, S, Env, Err, B>
    ) => HKTFix<F, Fix, K, NK, SI, SO, X, In, S, Env, Err, A>
  }
}

export interface InvariantK<F extends URIS, Fix = any> extends HasURI<F, Fix> {
  readonly Invariant: "Invariant"
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: <K, NK extends string, SI, SO, X, In, S, Env, Err>(
      ma: KindFix<F, Fix, K, NK, SI, SO, X, In, S, Env, Err, A>
    ) => KindFix<F, Fix, K, NK, SI, SO, X, In, S, Env, Err, B>
    g: <K, NK extends string, SI, SO, X, In, S, Env, Err>(
      mb: KindFix<F, Fix, K, NK, SI, SO, X, In, S, Env, Err, B>
    ) => KindFix<F, Fix, K, NK, SI, SO, X, In, S, Env, Err, A>
  }
}

export function makeInvariant<URI extends URIS, Fix = any>(
  _: URI
): (_: Omit<InvariantK<URI, Fix>, "URI" | "Fix" | "Invariant">) => InvariantK<URI, Fix>
export function makeInvariant<URI, Fix = any>(
  URI: URI
): (_: Omit<InvariantF<URI, Fix>, "URI" | "Fix" | "Invariant">) => InvariantF<URI, Fix>
export function makeInvariant<URI, Fix = any>(
  URI: URI
): (
  _: Omit<InvariantF<URI, Fix>, "URI" | "Fix" | "Invariant">
) => InvariantF<URI, Fix> {
  return (_) => ({
    URI,
    Fix: undefined as any,
    Invariant: "Invariant",
    ..._
  })
}
