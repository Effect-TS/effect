import { HasConstrainedE, HasURI, HKT9, Kind, URIS } from "../HKT"
import { Identity } from "../Identity"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface FoldMapF<F> extends HasURI<F> {
  readonly FoldMap: "FoldMap"
  readonly foldMap: <M>(
    I: Identity<M>
  ) => <A>(
    f: (a: A) => M
  ) => <K extends string, SI, SO, X, In, S, Env, Err>(
    fa: HKT9<F, K, SI, SO, X, In, S, Env, Err, A>
  ) => M
}

export interface FoldMapK<F extends URIS> extends HasURI<F> {
  readonly FoldMap: "FoldMap"
  readonly foldMap: <M>(
    I: Identity<M>
  ) => <A>(
    f: (a: A) => M
  ) => <K extends string, SI, SO, X, In, S, Env, Err>(
    fa: Kind<F, K, SI, SO, X, In, S, Env, Err, A>
  ) => M
}

export interface FoldMapFE<F, E> extends HasConstrainedE<F, E> {
  readonly FoldMap: "FoldMap"
  readonly foldMap: <M>(
    I: Identity<M>
  ) => <A>(
    f: (a: A) => M
  ) => <K extends string, SI, SO, X, In, S, Env>(
    fa: HKT9<F, K, SI, SO, X, In, S, Env, E, A>
  ) => M
}

export interface FoldMapKE<F extends URIS, E> extends HasConstrainedE<F, E> {
  readonly FoldMap: "FoldMap"
  readonly foldMap: <M>(
    I: Identity<M>
  ) => <A>(
    f: (a: A) => M
  ) => <K extends string, SI, SO, X, In, S, Env>(
    fa: Kind<F, K, SI, SO, X, In, S, Env, E, A>
  ) => M
}

export function makeFoldMap<URI extends URIS>(
  _: URI
): (_: Omit<FoldMapK<URI>, "URI" | "FoldMap">) => FoldMapK<URI>
export function makeFoldMap<URI>(
  URI: URI
): (_: Omit<FoldMapF<URI>, "URI" | "FoldMap">) => FoldMapF<URI>
export function makeFoldMap<URI>(
  URI: URI
): (_: Omit<FoldMapF<URI>, "URI" | "FoldMap">) => FoldMapF<URI> {
  return (_) => ({
    URI,
    FoldMap: "FoldMap",
    ..._
  })
}

export function makeFoldMapE<URI extends URIS>(
  _: URI
): <E>() => (_: Omit<FoldMapKE<URI, E>, "URI" | "FoldMap" | "E">) => FoldMapKE<URI, E>
export function makeFoldMapE<URI>(
  URI: URI
): <E>() => (_: Omit<FoldMapFE<URI, E>, "URI" | "FoldMap" | "E">) => FoldMapFE<URI, E>
export function makeFoldMapE<URI>(
  URI: URI
): <E>() => (_: Omit<FoldMapFE<URI, E>, "URI" | "FoldMap" | "E">) => FoldMapFE<URI, E> {
  return () => (_) => ({
    URI,
    FoldMap: "FoldMap",
    E: undefined as any,
    ..._
  })
}
