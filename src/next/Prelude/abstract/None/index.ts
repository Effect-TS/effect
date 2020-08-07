import {
  HasURI,
  HKT,
  Kind,
  Kind2,
  Kind3,
  Kind4,
  Kind5,
  Kind6,
  URIS,
  URIS2,
  URIS3,
  URIS4,
  URIS5,
  URIS6
} from "../HKT"

/**
 * The identity for combining two values of types `F[A]` and `F[B]`
 */
export interface NoneH<F> extends HasURI<F> {
  readonly None: "None"
  readonly none: () => HKT<F, never>
}

export interface None1<F extends URIS> extends HasURI<F> {
  readonly None: "None"
  readonly none: () => Kind<F, never>
}

export interface None2<F extends URIS2> extends HasURI<F> {
  readonly None: "None"
  readonly none: <E>() => Kind2<F, E, never>
}

export interface None3<F extends URIS3> extends HasURI<F> {
  readonly None: "None"
  readonly none: <R, E>() => Kind3<F, R, E, never>
}

export interface None4<F extends URIS4> extends HasURI<F> {
  readonly None: "None"
  readonly none: <S, R, E>() => Kind4<F, S, R, E, never>
}

export interface None5<F extends URIS5> extends HasURI<F> {
  readonly None: "None"
  readonly none: <X, S, R, E>() => Kind5<F, X, S, R, E, never>
}

export interface None6<F extends URIS6> extends HasURI<F> {
  readonly None: "None"
  readonly none: <Y, X, S, R, E>() => Kind6<F, Y, X, S, R, E, never>
}

export function makeNone<URI extends URIS>(
  _: URI
): (_: Omit<None1<URI>, "URI" | "None">) => None1<URI>
export function makeNone<URI extends URIS2>(
  _: URI
): (_: Omit<None2<URI>, "URI" | "None">) => None2<URI>
export function makeNone<URI extends URIS3>(
  _: URI
): (_: Omit<None3<URI>, "URI" | "None">) => None3<URI>
export function makeNone<URI extends URIS4>(
  _: URI
): (_: Omit<None4<URI>, "URI" | "None">) => None4<URI>
export function makeNone<URI extends URIS5>(
  _: URI
): (_: Omit<None5<URI>, "URI" | "None">) => None5<URI>
export function makeNone<URI extends URIS6>(
  _: URI
): (_: Omit<None6<URI>, "URI" | "None">) => None6<URI>
export function makeNone<URI>(
  URI: URI
): (_: Omit<NoneH<URI>, "URI" | "None">) => NoneH<URI> {
  return (_) => ({
    URI,
    None: "None",
    ..._
  })
}
