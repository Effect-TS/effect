import { HasURI, HKTFix, KindFix, URIS } from "../HKT"

/**
 * `AssociativeFlatten` describes a type that can be "flattened" in an
 * associative way. For example, if we have a list of lists of lists, we can
 * flatten it by either flattening the two inner lists and then flattening the
 * resulting lists, or flattening the two outer lists and then flattening that
 * resulting list. Because the operation is associative, the resulting list is
 * the same either way.
 */
export interface AssociativeFlattenF<F, Fix = any> extends HasURI<F, Fix> {
  readonly AssociativeFlatten: "AssociativeFlatten"
  readonly flatten: <
    K,
    NK extends string,
    SI,
    SO,
    X,
    In,
    S,
    Env,
    Err,
    K1,
    NK1 extends string,
    SO1,
    X1,
    In1,
    Env1,
    Err1,
    A
  >(
    fb: HKTFix<
      F,
      Fix,
      K,
      NK,
      SI,
      SO,
      X,
      In,
      S,
      Env,
      Err,
      HKTFix<F, Fix, K1, NK1, SO, SO1, X1, In1, S, Env1, Err1, A>
    >
  ) => HKTFix<F, Fix, K1, NK1, SI, SO1, X | X1, In & In1, S, Env & Env1, Err | Err1, A>
}

export interface AssociativeFlattenK<F extends URIS, Fix = any> extends HasURI<F, Fix> {
  readonly AssociativeFlatten: "AssociativeFlatten"
  readonly flatten: <
    K,
    NK extends string,
    SI,
    SO,
    X,
    In,
    S,
    Env,
    Err,
    K1,
    NK1 extends string,
    SO1,
    X1,
    In1,
    Env1,
    Err1,
    A
  >(
    fb: KindFix<
      F,
      Fix,
      K,
      NK,
      SI,
      SO,
      X,
      In,
      S,
      Env,
      Err,
      KindFix<F, Fix, K1, NK1, SO, SO1, X1, In1, S, Env1, Err1, A>
    >
  ) => KindFix<F, Fix, K1, NK1, SI, SO1, X | X1, In & In1, S, Env & Env1, Err | Err1, A>
}

export function makeAssociativeFlatten<URI extends URIS, Fix = any>(
  _: URI
): (
  _: Omit<AssociativeFlattenK<URI, Fix>, "URI" | "Fix" | "AssociativeFlatten">
) => AssociativeFlattenK<URI, Fix>
export function makeAssociativeFlatten<URI, Fix = any>(
  URI: URI
): (
  _: Omit<AssociativeFlattenF<URI, Fix>, "URI" | "Fix" | "AssociativeFlatten">
) => AssociativeFlattenF<URI, Fix>
export function makeAssociativeFlatten<URI, Fix = any>(
  URI: URI
): (
  _: Omit<AssociativeFlattenF<URI, Fix>, "URI" | "Fix" | "AssociativeFlatten">
) => AssociativeFlattenF<URI, Fix> {
  return (_) => ({
    URI,
    Fix: undefined as any,
    AssociativeFlatten: "AssociativeFlatten",
    ..._
  })
}
