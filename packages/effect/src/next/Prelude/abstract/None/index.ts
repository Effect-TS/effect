import { HasURI, HKT, Kind6, URIS6 } from "../HKT"

/**
 * The identity for combining two values of types `F[A]` and `F[B]`
 */
export interface NoneF<F> extends HasURI<F> {
  readonly None: "None"
  readonly none: () => HKT<F, never>
}

export interface None6<F extends URIS6> extends HasURI<F> {
  readonly None: "None"
  readonly none: <In, S = In>() => Kind6<F, never, In, S, unknown, never, never>
}

export function makeNone<URI extends URIS6>(
  _: URI
): (_: Omit<None6<URI>, "URI" | "None">) => None6<URI>
export function makeNone<URI>(
  URI: URI
): (_: Omit<NoneF<URI>, "URI" | "None">) => NoneF<URI> {
  return (_) => ({
    URI,
    None: "None",
    ..._
  })
}
