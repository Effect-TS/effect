import { HasConstrainedE, HasURI, HKT9, Kind, URIS } from "../HKT"

/**
 * `AssociativeFlatten` describes a type that can be "flattened" in an
 * associative way. For example, if we have a list of lists of lists, we can
 * flatten it by either flattening the two inner lists and then flattening the
 * resulting lists, or flattening the two outer lists and then flattening that
 * resulting list. Because the operation is associative, the resulting list is
 * the same either way.
 */
export interface AssociativeFlattenF<F> extends HasURI<F> {
  readonly AssociativeFlatten: "AssociativeFlatten"
  readonly flatten: <
    K extends string,
    SI,
    SO,
    X,
    In,
    S,
    Env,
    Err,
    K1 extends string,
    SO1,
    X1,
    In1,
    Env1,
    Err1,
    A
  >(
    fb: HKT9<
      F,
      K,
      SI,
      SO,
      X,
      In,
      S,
      Env,
      Err,
      HKT9<F, K1, SO, SO1, X1, In1, S, Env1, Err1, A>
    >
  ) => HKT9<F, K1, SI, SO1, X | X1, In & In1, S, Env & Env1, Err | Err1, A>
}

export interface AssociativeFlattenK<F extends URIS> extends HasURI<F> {
  readonly AssociativeFlatten: "AssociativeFlatten"
  readonly flatten: <
    K extends string,
    SI,
    SO,
    X,
    In,
    S,
    Env,
    Err,
    K1 extends string,
    SO1,
    X1,
    In1,
    Env1,
    Err1,
    A
  >(
    fb: Kind<
      F,
      K,
      SI,
      SO,
      X,
      In,
      S,
      Env,
      Err,
      Kind<F, K1, SO, SO1, X1, In1, S, Env1, Err1, A>
    >
  ) => Kind<F, K1, SI, SO1, X | X1, In & In1, S, Env & Env1, Err | Err1, A>
}

export interface AssociativeFlattenFE<F, E> extends HasConstrainedE<F, E> {
  readonly AssociativeFlatten: "AssociativeFlatten"
  readonly flatten: <
    K extends string,
    SI,
    SO,
    X,
    In,
    S,
    Env,
    K1 extends string,
    SO1,
    X1,
    In1,
    Env1,
    A
  >(
    fb: HKT9<
      F,
      K,
      SI,
      SO,
      X,
      In,
      S,
      Env,
      E,
      HKT9<F, K1, SO, SO1, X1, In1, S, Env1, E, A>
    >
  ) => HKT9<F, K1, SI, SO1, X | X1, In & In1, S, Env & Env1, E, A>
}

export interface AssociativeFlattenKE<F extends URIS, E> extends HasConstrainedE<F, E> {
  readonly AssociativeFlatten: "AssociativeFlatten"
  readonly flatten: <
    K extends string,
    SI,
    SO,
    X,
    In,
    S,
    Env,
    K1 extends string,
    SO1,
    X1,
    In1,
    Env1,
    A
  >(
    fb: Kind<
      F,
      K,
      SI,
      SO,
      X,
      In,
      S,
      Env,
      E,
      Kind<F, K1, SO, SO1, X1, In1, S, Env1, E, A>
    >
  ) => Kind<F, K1, SI, SO1, X | X1, In & In1, S, Env & Env1, E, A>
}

export function makeAssociativeFlatten<URI extends URIS>(
  _: URI
): (
  _: Omit<AssociativeFlattenK<URI>, "URI" | "AssociativeFlatten">
) => AssociativeFlattenK<URI>
export function makeAssociativeFlatten<URI>(
  URI: URI
): (
  _: Omit<AssociativeFlattenF<URI>, "URI" | "AssociativeFlatten">
) => AssociativeFlattenF<URI>
export function makeAssociativeFlatten<URI>(
  URI: URI
): (
  _: Omit<AssociativeFlattenF<URI>, "URI" | "AssociativeFlatten">
) => AssociativeFlattenF<URI> {
  return (_) => ({
    URI,
    AssociativeFlatten: "AssociativeFlatten",
    ..._
  })
}

export function makeAssociativeFlattenE<URI extends URIS>(
  _: URI
): <E>() => (
  _: Omit<AssociativeFlattenKE<URI, E>, "URI" | "AssociativeFlatten" | "E">
) => AssociativeFlattenKE<URI, E>
export function makeAssociativeFlattenE<URI>(
  URI: URI
): <E>() => (
  _: Omit<AssociativeFlattenFE<URI, E>, "URI" | "AssociativeFlatten" | "E">
) => AssociativeFlattenFE<URI, E>
export function makeAssociativeFlattenE<URI>(
  URI: URI
): <E>() => (
  _: Omit<AssociativeFlattenFE<URI, E>, "URI" | "AssociativeFlatten" | "E">
) => AssociativeFlattenFE<URI, E> {
  return () => (_) => ({
    URI,
    AssociativeFlatten: "AssociativeFlatten",
    E: undefined as any,
    ..._
  })
}
