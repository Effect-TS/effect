import { HasConstrainedE, HasURI, HKT9, Kind, URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface ReduceRightF<F> extends HasURI<F> {
  readonly ReduceRight: "ReduceRight"
  readonly reduce: <A, B>(
    b: B,
    f: (a: A, b: B) => B
  ) => <K extends string, SI, SO, X, In, S, Env, Err>(
    fa: HKT9<F, K, SI, SO, X, In, S, Env, Err, A>
  ) => B
}

export interface ReduceRightK<F extends URIS> extends HasURI<F> {
  readonly ReduceRight: "ReduceRight"
  readonly reduce: <A, B>(
    b: B,
    f: (a: A, b: B) => B
  ) => <K extends string, SI, SO, X, In, S, Env, Err>(
    fa: Kind<F, K, SI, SO, X, In, S, Env, Err, A>
  ) => B
}

export interface ReduceRightFE<F, E> extends HasConstrainedE<F, E> {
  readonly ReduceRight: "ReduceRight"
  readonly reduce: <A, B>(
    b: B,
    f: (a: A, b: B) => B
  ) => <K extends string, SI, SO, X, In, S, Env>(
    fa: HKT9<F, K, SI, SO, X, In, S, Env, E, A>
  ) => B
}

export interface ReduceRightKE<F extends URIS, E> extends HasConstrainedE<F, E> {
  readonly ReduceRight: "ReduceRight"
  readonly reduce: <A, B>(
    b: B,
    f: (a: A, b: B) => B
  ) => <K extends string, SI, SO, X, In, S, Env>(
    fa: Kind<F, K, SI, SO, X, In, S, Env, E, A>
  ) => B
}

export function makeReduceRight<URI extends URIS>(
  _: URI
): (_: Omit<ReduceRightK<URI>, "URI" | "ReduceRight">) => ReduceRightK<URI>
export function makeReduceRight<URI>(
  URI: URI
): (_: Omit<ReduceRightF<URI>, "URI" | "ReduceRight">) => ReduceRightF<URI>
export function makeReduceRight<URI>(
  URI: URI
): (_: Omit<ReduceRightF<URI>, "URI" | "ReduceRight">) => ReduceRightF<URI> {
  return (_) => ({
    URI,
    ReduceRight: "ReduceRight",
    ..._
  })
}

export function makeReduceRightE<URI extends URIS>(
  _: URI
): <E>() => (
  _: Omit<ReduceRightKE<URI, E>, "URI" | "ReduceRight" | "E">
) => ReduceRightKE<URI, E>
export function makeReduceRightE<URI>(
  URI: URI
): <E>() => (
  _: Omit<ReduceRightFE<URI, E>, "URI" | "ReduceRight" | "E">
) => ReduceRightFE<URI, E>
export function makeReduceRightE<URI>(
  URI: URI
): <E>() => (
  _: Omit<ReduceRightFE<URI, E>, "URI" | "ReduceRight" | "E">
) => ReduceRightFE<URI, E> {
  return () => (_) => ({
    URI,
    ReduceRight: "ReduceRight",
    E: undefined as any,
    ..._
  })
}
