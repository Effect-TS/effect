import { HasURI, HKT8, Kind, URIS } from "../HKT"

/**
 * The identity for combining two values of types `F[A]` and `F[B]`
 */
export interface NoneF<F> extends HasURI<F> {
  readonly None: "None"
  readonly none: <S, SI, SO = SI>() => HKT8<
    F,
    SI,
    SO,
    never,
    unknown,
    S,
    unknown,
    never,
    never
  >
}

export interface NoneK<F extends URIS> extends HasURI<F> {
  readonly None: "None"
  readonly none: <S, SI, SO = SI>() => Kind<
    F,
    SI,
    SO,
    never,
    unknown,
    S,
    unknown,
    never,
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
