import { HasURI, HKT8, Kind, URIS } from "../HKT"

/**
 * Model () => F[Any]
 */
export interface AnyF<F> extends HasURI<F> {
  readonly Any: "Any"
  readonly any: <S, SI, SO = SI>() => HKT8<
    F,
    SI,
    SO,
    never,
    unknown,
    S,
    unknown,
    never,
    unknown
  >
}

export interface AnyK<F extends URIS> extends HasURI<F> {
  readonly Any: "Any"
  readonly any: <S, SI, SO = SI>() => Kind<
    F,
    SI,
    SO,
    never,
    unknown,
    S,
    unknown,
    never,
    unknown
  >
}

export function makeAny<URI extends URIS>(
  _: URI
): (_: Omit<AnyK<URI>, "URI" | "Any">) => AnyK<URI>
export function makeAny<URI>(URI: URI): (_: Omit<AnyF<URI>, "URI" | "Any">) => AnyF<URI>
export function makeAny<URI>(
  URI: URI
): (_: Omit<AnyF<URI>, "URI" | "Any">) => AnyF<URI> {
  return (_) => ({
    URI,
    Any: "Any",
    ..._
  })
}
