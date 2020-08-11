import { HasURI, HKTFix, KindFix, URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface AssociativeBothF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>
  extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly AssociativeBoth: "AssociativeBoth"
  readonly both: <K2, NK2 extends string, SO, SO2, X2, In2, S, Env2, Err2, B>(
    fb: HKTFix<F, Fix0, Fix1, Fix2, Fix3, K2, NK2, SO, SO2, X2, In2, S, Env2, Err2, B>
  ) => <K, NK extends string, SI, X, In, Env, Err, A>(
    fa: HKTFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => HKTFix<
    F,
    Fix0,
    Fix1,
    Fix2,
    Fix3,
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

export interface AssociativeBothK<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly AssociativeBoth: "AssociativeBoth"
  readonly both: <K2, NK2 extends string, SO, SO2, X2, In2, S, Env2, Err2, B>(
    fb: KindFix<F, Fix0, Fix1, Fix2, Fix3, K2, NK2, SO, SO2, X2, In2, S, Env2, Err2, B>
  ) => <K, NK extends string, SI, X, In, Env, Err, A>(
    fa: KindFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => KindFix<
    F,
    Fix0,
    Fix1,
    Fix2,
    Fix3,
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

export function makeAssociativeBoth<
  URI extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  _: URI
): (
  _: Omit<
    AssociativeBothK<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3" | "AssociativeBoth"
  >
) => AssociativeBothK<URI, Fix0, Fix1, Fix2, Fix3>
export function makeAssociativeBoth<
  URI,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  URI: URI
): (
  _: Omit<
    AssociativeBothF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3" | "AssociativeBoth"
  >
) => AssociativeBothF<URI, Fix0, Fix1, Fix2, Fix3>
export function makeAssociativeBoth<
  URI,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  URI: URI
): (
  _: Omit<
    AssociativeBothF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3" | "AssociativeBoth"
  >
) => AssociativeBothF<URI, Fix0, Fix1, Fix2, Fix3> {
  return (_) => ({
    URI,
    Fix0: undefined as any,
    Fix1: undefined as any,
    Fix2: undefined as any,
    Fix3: undefined as any,
    AssociativeBoth: "AssociativeBoth",
    ..._
  })
}
