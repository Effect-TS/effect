import { HasURI, HKTFull, KindFull, URIS } from "../HKT"

/**
 * `AssociativeFlatten` describes a type that can be "flattened" in an
 * associative way. For example, if we have a list of lists of lists, we can
 * flatten it by either flattening the two inner lists and then flattening the
 * resulting lists, or flattening the two outer lists and then flattening that
 * resulting list. Because the operation is associative, the resulting list is
 * the same either way.
 */

export interface AssociativeFlattenF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
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
    fb: HKTFull<
      F,
      TL0,
      TL1,
      TL2,
      TL3,
      K,
      NK,
      SI,
      SO,
      X,
      In,
      S,
      Env,
      Err,
      HKTFull<F, TL0, TL1, TL2, TL3, K1, NK1, SO, SO1, X1, In1, S, Env1, Err1, A>
    >
  ) => HKTFull<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
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
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends HasURI<F, TL0, TL1, TL2, TL3> {
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
    fb: KindFull<
      F,
      TL0,
      TL1,
      TL2,
      TL3,
      K,
      NK,
      SI,
      SO,
      X,
      In,
      S,
      Env,
      Err,
      KindFull<F, TL0, TL1, TL2, TL3, K1, NK1, SO, SO1, X1, In1, S, Env1, Err1, A>
    >
  ) => KindFull<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
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
