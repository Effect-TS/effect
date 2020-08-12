import { HasURI, HKTFix, KindFix, URIS } from "../HKT"

/**
 * `AssociativeFlatten` describes a type that can be "flattened" in an
 * associative way. For example, if we have a list of lists of lists, we can
 * flatten it by either flattening the two inner lists and then flattening the
 * resulting lists, or flattening the two outer lists and then flattening that
 * resulting list. Because the operation is associative, the resulting list is
 * the same either way.
 */
export interface AssociativeFlattenF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>
  extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
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
      Fix0,
      Fix1,
      Fix2,
      Fix3,
      K,
      NK,
      SI,
      SO,
      X,
      In,
      S,
      Env,
      Err,
      HKTFix<F, Fix0, Fix1, Fix2, Fix3, K1, NK1, SO, SO1, X1, In1, S, Env1, Err1, A>
    >
  ) => HKTFix<
    F,
    Fix0,
    Fix1,
    Fix2,
    Fix3,
    K1,
    NK1,
    SI,
    SO1,
    X | X1,
    In & In1,
    S,
    Env & Env1,
    Err | Err1,
    A
  >
}

export interface AssociativeFlattenK<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
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
      Fix0,
      Fix1,
      Fix2,
      Fix3,
      K,
      NK,
      SI,
      SO,
      X,
      In,
      S,
      Env,
      Err,
      KindFix<F, Fix0, Fix1, Fix2, Fix3, K1, NK1, SO, SO1, X1, In1, S, Env1, Err1, A>
    >
  ) => KindFix<
    F,
    Fix0,
    Fix1,
    Fix2,
    Fix3,
    K1,
    NK1,
    SI,
    SO1,
    X | X1,
    In & In1,
    S,
    Env & Env1,
    Err | Err1,
    A
  >
}

export function makeAssociativeFlatten<
  URI extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  _: URI
): (
  _: Omit<
    AssociativeFlattenK<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => AssociativeFlattenK<URI, Fix0, Fix1, Fix2, Fix3>
export function makeAssociativeFlatten<
  URI,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  URI: URI
): (
  _: Omit<
    AssociativeFlattenF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => AssociativeFlattenF<URI, Fix0, Fix1, Fix2, Fix3>
export function makeAssociativeFlatten<
  URI,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  URI: URI
): (
  _: Omit<
    AssociativeFlattenF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => AssociativeFlattenF<URI, Fix0, Fix1, Fix2, Fix3> {
  return (_) => ({
    URI,
    Fix0: undefined as any,
    Fix1: undefined as any,
    Fix2: undefined as any,
    Fix3: undefined as any,
    ..._
  })
}
