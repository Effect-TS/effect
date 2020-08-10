import { HasConstrainedE, HasURI, HKT9, Kind, URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface ReduceF<F> extends HasURI<F> {
  readonly Reduce: "Reduce"
  readonly reduce: <A, B>(
    b: B,
    f: (b: B, a: A) => B
  ) => <K extends string, SI, SO, X, In, S, Env, Err>(
    fa: HKT9<F, K, SI, SO, X, In, S, Env, Err, A>
  ) => B
}

export interface ReduceK<F extends URIS> extends HasURI<F> {
  readonly Reduce: "Reduce"
  readonly reduce: <A, B>(
    b: B,
    f: (b: B, a: A) => B
  ) => <K extends string, SI, SO, X, In, S, Env, Err>(
    fa: Kind<F, K, SI, SO, X, In, S, Env, Err, A>
  ) => B
}

export interface ReduceFE<F, E> extends HasConstrainedE<F, E> {
  readonly Reduce: "Reduce"
  readonly reduce: <A, B>(
    b: B,
    f: (b: B, a: A) => B
  ) => <K extends string, SI, SO, X, In, S, Env>(
    fa: HKT9<F, K, SI, SO, X, In, S, Env, E, A>
  ) => B
}

export interface ReduceKE<F extends URIS, E> extends HasConstrainedE<F, E> {
  readonly Reduce: "Reduce"
  readonly reduce: <A, B>(
    b: B,
    f: (b: B, a: A) => B
  ) => <K extends string, SI, SO, X, In, S, Env>(
    fa: Kind<F, K, SI, SO, X, In, S, Env, E, A>
  ) => B
}

export function makeReduce<URI extends URIS>(
  _: URI
): (_: Omit<ReduceK<URI>, "URI" | "Reduce">) => ReduceK<URI>
export function makeReduce<URI>(
  URI: URI
): (_: Omit<ReduceF<URI>, "URI" | "Reduce">) => ReduceF<URI>
export function makeReduce<URI>(
  URI: URI
): (_: Omit<ReduceF<URI>, "URI" | "Reduce">) => ReduceF<URI> {
  return (_) => ({
    URI,
    Reduce: "Reduce",
    ..._
  })
}

export function makeReduceE<URI extends URIS>(
  _: URI
): <E>() => (_: Omit<ReduceKE<URI, E>, "URI" | "Reduce" | "E">) => ReduceKE<URI, E>
export function makeReduceE<URI>(
  URI: URI
): <E>() => (_: Omit<ReduceFE<URI, E>, "URI" | "Reduce" | "E">) => ReduceFE<URI, E>
export function makeReduceE<URI>(
  URI: URI
): <E>() => (_: Omit<ReduceFE<URI, E>, "URI" | "Reduce" | "E">) => ReduceFE<URI, E> {
  return () => (_) => ({
    URI,
    Reduce: "Reduce",
    E: undefined as any,
    ..._
  })
}
