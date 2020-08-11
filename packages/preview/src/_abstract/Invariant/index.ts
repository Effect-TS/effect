import { HasConstrainedE, HasURI, HKT10, Kind, URIS } from "../HKT"

export interface InvariantF<F> extends HasURI<F> {
  readonly Invariant: "Invariant"
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: <K, NK extends string, SI, SO, X, In, S, Env, Err>(
      ma: HKT10<F, K, NK, SI, SO, X, In, S, Env, Err, A>
    ) => HKT10<F, K, NK, SI, SO, X, In, S, Env, Err, B>
    g: <K, NK extends string, SI, SO, X, In, S, Env, Err>(
      mb: HKT10<F, K, NK, SI, SO, X, In, S, Env, Err, B>
    ) => HKT10<F, K, NK, SI, SO, X, In, S, Env, Err, A>
  }
}

export interface InvariantK<F extends URIS> extends HasURI<F> {
  readonly Invariant: "Invariant"
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: <K, NK extends string, SI, SO, X, In, S, Env, Err>(
      ma: Kind<F, K, NK, SI, SO, X, In, S, Env, Err, A>
    ) => Kind<F, K, NK, SI, SO, X, In, S, Env, Err, B>
    g: <K, NK extends string, SI, SO, X, In, S, Env, Err>(
      mb: Kind<F, K, NK, SI, SO, X, In, S, Env, Err, B>
    ) => Kind<F, K, NK, SI, SO, X, In, S, Env, Err, A>
  }
}

export interface InvariantFE<F, E> extends HasConstrainedE<F, E> {
  readonly Invariant: "Invariant"
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: <K, NK extends string, SI, SO, X, In, S, Env>(
      ma: HKT10<F, K, NK, SI, SO, X, In, S, Env, E, A>
    ) => HKT10<F, K, NK, SI, SO, X, In, S, Env, E, B>
    g: <K, NK extends string, SI, SO, X, In, S, Env>(
      mb: HKT10<F, K, NK, SI, SO, X, In, S, Env, E, B>
    ) => HKT10<F, K, NK, SI, SO, X, In, S, Env, E, A>
  }
}

export interface InvariantKE<F extends URIS, E> extends HasConstrainedE<F, E> {
  readonly Invariant: "Invariant"
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: <K, NK extends string, SI, SO, X, In, S, Env>(
      ma: Kind<F, K, NK, SI, SO, X, In, S, Env, E, A>
    ) => Kind<F, K, NK, SI, SO, X, In, S, Env, E, B>
    g: <K, NK extends string, SI, SO, X, In, S, Env>(
      mb: Kind<F, K, NK, SI, SO, X, In, S, Env, E, B>
    ) => Kind<F, K, NK, SI, SO, X, In, S, Env, E, A>
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

export function makeInvariantE<URI extends URIS>(
  _: URI
): <E>() => (
  _: Omit<InvariantKE<URI, E>, "URI" | "Invariant" | "E">
) => InvariantKE<URI, E>
export function makeInvariantE<URI>(
  URI: URI
): <E>() => (
  _: Omit<InvariantFE<URI, E>, "URI" | "Invariant" | "E">
) => InvariantFE<URI, E>
export function makeInvariantE<URI>(
  URI: URI
): <E>() => (
  _: Omit<InvariantFE<URI, E>, "URI" | "Invariant" | "E">
) => InvariantFE<URI, E> {
  return () => (_) => ({
    URI,
    Invariant: "Invariant",
    E: undefined as any,
    ..._
  })
}
