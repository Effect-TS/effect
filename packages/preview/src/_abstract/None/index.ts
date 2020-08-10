import { HasConstrainedE, HasURI, HKT8, Kind, URIS } from "../HKT"

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

export interface NoneFE<F, E> extends HasConstrainedE<F, E> {
  readonly None: "None"
  readonly none: <S, SI, SO = SI>() => HKT8<
    F,
    SI,
    SO,
    never,
    unknown,
    S,
    unknown,
    E,
    never
  >
}

export interface NoneKE<F extends URIS, E> extends HasConstrainedE<F, E> {
  readonly None: "None"
  readonly none: <S, SI, SO = SI>() => Kind<
    F,
    SI,
    SO,
    never,
    unknown,
    S,
    unknown,
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

export function makeNoneE<URI extends URIS>(
  _: URI
): <E>() => (_: Omit<NoneKE<URI, E>, "URI" | "None" | "E">) => NoneKE<URI, E>
export function makeNoneE<URI, E>(
  URI: URI
): <E>() => (_: Omit<NoneFE<URI, E>, "URI" | "None" | "E">) => NoneFE<URI, E>
export function makeNoneE<URI, E>(
  URI: URI
): <E>() => (_: Omit<NoneFE<URI, E>, "URI" | "None" | "E">) => NoneFE<URI, E> {
  return () => (_) => ({
    URI,
    None: "None",
    E: undefined as any,
    ..._
  })
}
