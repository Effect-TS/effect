import { HasConstrainedE, HasURI, HKT8, HKT9, Kind, URIS } from "../HKT"

/**
 * Model () => F[Any]
 */
export interface AnyF<F> extends HasURI<F> {
  readonly Any: "Any"
  readonly any: <S, SI, SO = SI>() => HKT9<
    F,
    never,
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
    never,
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

export interface AnyFE<F, E> extends HasConstrainedE<F, E> {
  readonly Any: "Any"
  readonly any: <S, SI, SO = SI>() => HKT8<
    F,
    SI,
    SO,
    never,
    unknown,
    S,
    unknown,
    E,
    unknown
  >
}

export interface AnyKE<F extends URIS, E> extends HasConstrainedE<F, E> {
  readonly Any: "Any"
  readonly any: <S, SI, SO = SI>() => Kind<
    F,
    never,
    SI,
    SO,
    never,
    unknown,
    S,
    unknown,
    E,
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

export function makeAnyE<URI extends URIS>(
  _: URI
): <E>() => (_: Omit<AnyKE<URI, E>, "URI" | "Any" | "E">) => AnyKE<URI, E>
export function makeAnyE<URI>(
  URI: URI
): <E>() => (_: Omit<AnyFE<URI, E>, "URI" | "Any" | "E">) => AnyFE<URI, E> {
  return () => (_) => ({
    URI,
    Any: "Any",
    E: undefined as any,
    ..._
  })
}
