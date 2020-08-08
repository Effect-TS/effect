import { HasURI, HKT6, Kind, URIS } from "../HKT"

/**
 * The identity for combining two values of types `F[A]` and `F[B]`
 */
export interface NoneF<F> extends HasURI<F> {
  readonly None: "None"
  readonly none: <In, S = In, X = never, R = unknown, E = never>() => HKT6<
    F,
    X,
    In,
    S,
    R,
    E,
    never
  >
}

export interface NoneK<F extends URIS> extends HasURI<F> {
  readonly None: "None"
  readonly none: <In, S = In, X = never, R = unknown, E = never>() => Kind<
    F,
    X,
    In,
    S,
    R,
    E,
    never
  >
}

export function makeNone<URI extends URIS>(
  _: URI
): (_: Omit<NoneK<URI>, "URI" | "None">) => NoneK<URI>
export function makeNone<URI>(
  URI: URI
): (_: Omit<NoneF<URI>, "URI" | "None">) => NoneF<URI>
export function makeNone<URI>(
  URI: URI
): (_: Omit<NoneF<URI>, "URI" | "None">) => NoneF<URI> {
  return (_) => ({
    URI,
    None: "None",
    ..._
  })
}
