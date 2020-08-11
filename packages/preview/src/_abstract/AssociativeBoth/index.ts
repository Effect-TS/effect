import { HasConstrainedE, HasURI, HKT10, Kind, URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface AssociativeBothF<F> extends HasURI<F> {
  readonly AssociativeBoth: "AssociativeBoth"
  readonly both: <K2, NK2 extends string, SO, SO2, X2, In2, S, Env2, Err2, B>(
    fb: HKT10<F, K2, NK2, SO, SO2, X2, In2, S, Env2, Err2, B>
  ) => <K, NK extends string, SI, X, In, Env, Err, A>(
    fa: HKT10<F, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => HKT10<
    F,
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

export interface AssociativeBothK<F extends URIS> extends HasURI<F> {
  readonly AssociativeBoth: "AssociativeBoth"
  readonly both: <K2, NK2 extends string, SO, SO2, X2, In2, S, Env2, Err2, B>(
    fb: Kind<F, K2, NK2, SO, SO2, X2, In2, S, Env2, Err2, B>
  ) => <K, NK extends string, SI, X, In, Env, Err, A>(
    fa: Kind<F, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => Kind<
    F,
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

export interface AssociativeBothFE<F, E> extends HasConstrainedE<F, E> {
  readonly AssociativeBoth: "AssociativeBoth"
  readonly both: <K2, NK2 extends string, SO, SO2, X2, In2, S, Env2, B>(
    fb: HKT10<F, K2, NK2, SO, SO2, X2, In2, S, Env2, E, B>
  ) => <K, NK extends string, SI, X, In, Env, A>(
    fa: HKT10<F, K, NK, SI, SO, X, In, S, Env, E, A>
  ) => HKT10<
    F,
    K | K2,
    NK2 | NK,
    SI,
    SO2,
    X2 | X,
    In2 & In,
    S,
    Env2 & Env,
    E,
    readonly [A, B]
  >
}

export interface AssociativeBothKE<F extends URIS, E> extends HasConstrainedE<F, E> {
  readonly AssociativeBoth: "AssociativeBoth"
  readonly both: <K2, NK2 extends string, SO, SO2, X2, In2, S, Env2, B>(
    fb: Kind<F, K2, NK2, SO, SO2, X2, In2, S, Env2, E, B>
  ) => <K, NK extends string, SI, X, In, Env, A>(
    fa: Kind<F, K, NK, SI, SO, X, In, S, Env, E, A>
  ) => Kind<
    F,
    K | K2,
    NK2 | NK,
    SI,
    SO2,
    X2 | X,
    In2 & In,
    S,
    Env2 & Env,
    E,
    readonly [A, B]
  >
}

export function makeAssociativeBoth<URI extends URIS>(
  _: URI
): (_: Omit<AssociativeBothK<URI>, "URI" | "AssociativeBoth">) => AssociativeBothK<URI>
export function makeAssociativeBoth<URI>(
  URI: URI
): (_: Omit<AssociativeBothF<URI>, "URI" | "AssociativeBoth">) => AssociativeBothF<URI>
export function makeAssociativeBoth<URI>(
  URI: URI
): (
  _: Omit<AssociativeBothF<URI>, "URI" | "AssociativeBoth">
) => AssociativeBothF<URI> {
  return (_) => ({
    URI,
    AssociativeBoth: "AssociativeBoth",
    ..._
  })
}

export function makeAssociativeBothE<URI extends URIS>(
  _: URI
): <E>() => (
  _: Omit<AssociativeBothKE<URI, E>, "URI" | "AssociativeBoth" | "E">
) => AssociativeBothKE<URI, E>
export function makeAssociativeBothE<URI>(
  URI: URI
): <E>() => (
  _: Omit<AssociativeBothFE<URI, E>, "URI" | "AssociativeBoth" | "E">
) => AssociativeBothFE<URI, E>
export function makeAssociativeBothE<URI>(
  URI: URI
): <E>() => (
  _: Omit<AssociativeBothFE<URI, E>, "URI" | "AssociativeBoth" | "E">
) => AssociativeBothFE<URI, E> {
  return () => (_) => ({
    URI,
    AssociativeBoth: "AssociativeBoth",
    E: undefined as any,
    ..._
  })
}
