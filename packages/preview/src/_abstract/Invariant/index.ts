import { HasURI, HKT8, Kind, URIS } from "../HKT"

export interface InvariantF<F> extends HasURI<F> {
  readonly Invariant: "Invariant"
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: <SI, SO, X, In, S, Env, Err>(
      ma: HKT8<F, SI, SO, X, In, S, Env, Err, A>
    ) => HKT8<F, SI, SO, X, In, S, Env, Err, B>
    g: <SI, SO, X, In, S, Env, Err>(
      mb: HKT8<F, SI, SO, X, In, S, Env, Err, B>
    ) => HKT8<F, SI, SO, X, In, S, Env, Err, A>
  }
}

export interface InvariantK<F extends URIS> extends HasURI<F> {
  readonly Invariant: "Invariant"
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: <SI, SO, X, In, S, Env, Err>(
      ma: Kind<F, SI, SO, X, In, S, Env, Err, A>
    ) => Kind<F, SI, SO, X, In, S, Env, Err, B>
    g: <SI, SO, X, In, S, Env, Err>(
      mb: Kind<F, SI, SO, X, In, S, Env, Err, B>
    ) => Kind<F, SI, SO, X, In, S, Env, Err, A>
  }
}

export function makeInvariant<URI extends URIS>(
  _: URI
): (_: Omit<InvariantK<URI>, "URI" | "Invariant">) => InvariantK<URI>
export function makeInvariant<URI>(
  URI: URI
): (_: Omit<InvariantF<URI>, "URI" | "Invariant">) => InvariantF<URI>
export function makeInvariant<URI>(
  URI: URI
): (_: Omit<InvariantF<URI>, "URI" | "Invariant">) => InvariantF<URI> {
  return (_) => ({
    URI,
    Invariant: "Invariant",
    ..._
  })
}
