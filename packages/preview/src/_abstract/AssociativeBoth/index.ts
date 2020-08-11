import { HasURI, HKTFix, KindFix, URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface AssociativeBothF<F, Fix = any> extends HasURI<F, Fix> {
  readonly AssociativeBoth: "AssociativeBoth"
  readonly both: <K2, NK2 extends string, SO, SO2, X2, In2, S, Env2, Err2, B>(
    fb: HKTFix<F, Fix, K2, NK2, SO, SO2, X2, In2, S, Env2, Err2, B>
  ) => <K, NK extends string, SI, X, In, Env, Err, A>(
    fa: HKTFix<F, Fix, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => HKTFix<
    F,
    Fix,
    K | K2,
    NK2 | NK,
    SI,
    SO2,
    X2 | X,
    In2 & In,
    S,
    Env2 & Env,
    Err2 | Err,
    readonly [A, B]
  >
}

export interface AssociativeBothK<F extends URIS, Fix = any> extends HasURI<F, Fix> {
  readonly AssociativeBoth: "AssociativeBoth"
  readonly both: <K2, NK2 extends string, SO, SO2, X2, In2, S, Env2, Err2, B>(
    fb: KindFix<F, Fix, K2, NK2, SO, SO2, X2, In2, S, Env2, Err2, B>
  ) => <K, NK extends string, SI, X, In, Env, Err, A>(
    fa: KindFix<F, Fix, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => KindFix<
    F,
    Fix,
    K | K2,
    NK2 | NK,
    SI,
    SO2,
    X2 | X,
    In2 & In,
    S,
    Env2 & Env,
    Err2 | Err,
    readonly [A, B]
  >
}

export function makeAssociativeBoth<URI extends URIS, Fix = any>(
  _: URI
): (
  _: Omit<AssociativeBothK<URI, Fix>, "URI" | "Fix" | "AssociativeBoth">
) => AssociativeBothK<URI, Fix>
export function makeAssociativeBoth<URI, Fix = any>(
  URI: URI
): (
  _: Omit<AssociativeBothF<URI, Fix>, "URI" | "Fix" | "AssociativeBoth">
) => AssociativeBothF<URI, Fix>
export function makeAssociativeBoth<URI, Fix = any>(
  URI: URI
): (
  _: Omit<AssociativeBothF<URI, Fix>, "URI" | "Fix" | "AssociativeBoth">
) => AssociativeBothF<URI, Fix> {
  return (_) => ({
    URI,
    Fix: undefined as any,
    AssociativeBoth: "AssociativeBoth",
    ..._
  })
}
