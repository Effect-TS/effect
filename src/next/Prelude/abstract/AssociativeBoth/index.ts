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
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface AssociativeBoth<F> extends HasURI<F> {
  readonly AssociativeBoth: "AssociativeBoth"
  readonly both: <B>(fb: HKT<F, B>) => <A>(fa: HKT<F, A>) => HKT<F, readonly [A, B]>
}

export interface AssociativeBoth1<F extends URIS> extends HasURI<F> {
  readonly AssociativeBoth: "AssociativeBoth"
  readonly both: <B>(fb: Kind<F, B>) => <A>(fa: Kind<F, A>) => Kind<F, readonly [A, B]>
}

export interface AssociativeBoth2<F extends URIS2> extends HasURI<F> {
  readonly AssociativeBoth: "AssociativeBoth"
  readonly both: <E, B>(
    fb: Kind2<F, E, B>
  ) => <A>(fa: Kind2<F, E, A>) => Kind2<F, E, readonly [A, B]>
}

export interface AssociativeBoth3<F extends URIS3> extends HasURI<F> {
  readonly AssociativeBoth: "AssociativeBoth"
  readonly both: <R, E, B>(
    fb: Kind3<F, R, E, B>
  ) => <A>(fa: Kind3<F, R, E, A>) => Kind3<F, R, E, readonly [A, B]>
}

export interface AssociativeBoth4<F extends URIS4> extends HasURI<F> {
  readonly AssociativeBoth: "AssociativeBoth"
  readonly both: <S, R, E, B>(
    fb: Kind4<F, S, R, E, B>
  ) => <A>(fa: Kind4<F, S, R, E, A>) => Kind4<F, S, R, E, readonly [A, B]>
}

export interface AssociativeBoth5<F extends URIS5> extends HasURI<F> {
  readonly AssociativeBoth: "AssociativeBoth"
  readonly both: <X, S, R, E, B>(
    fb: Kind5<F, X, S, R, E, B>
  ) => <A>(fa: Kind5<F, X, S, R, E, A>) => Kind5<F, X, S, R, E, readonly [A, B]>
}

export interface AssociativeBoth6<F extends URIS6> extends HasURI<F> {
  readonly AssociativeBoth: "AssociativeBoth"
  readonly both: <Y, X, S, R, E, B>(
    fb: Kind6<F, Y, X, S, R, E, B>
  ) => <A>(fa: Kind6<F, Y, X, S, R, E, A>) => Kind6<F, Y, X, S, R, E, readonly [A, B]>
}

export function makeAssociativeBoth<URI extends URIS>(
  _: URI
): (_: Omit<AssociativeBoth1<URI>, "URI" | "AssociativeBoth">) => AssociativeBoth1<URI>
export function makeAssociativeBoth<URI extends URIS2>(
  _: URI
): (_: Omit<AssociativeBoth2<URI>, "URI" | "AssociativeBoth">) => AssociativeBoth2<URI>
export function makeAssociativeBoth<URI extends URIS3>(
  _: URI
): (_: Omit<AssociativeBoth3<URI>, "URI" | "AssociativeBoth">) => AssociativeBoth3<URI>
export function makeAssociativeBoth<URI extends URIS4>(
  _: URI
): (_: Omit<AssociativeBoth4<URI>, "URI" | "AssociativeBoth">) => AssociativeBoth4<URI>
export function makeAssociativeBoth<URI extends URIS5>(
  _: URI
): (_: Omit<AssociativeBoth5<URI>, "URI" | "AssociativeBoth">) => AssociativeBoth5<URI>
export function makeAssociativeBoth<URI extends URIS6>(
  _: URI
): (_: Omit<AssociativeBoth6<URI>, "URI" | "AssociativeBoth">) => AssociativeBoth6<URI>
export function makeAssociativeBoth<URI>(
  URI: URI
): (_: Omit<AssociativeBoth<URI>, "URI" | "AssociativeBoth">) => AssociativeBoth<URI> {
  return (_) => ({
    URI,
    AssociativeBoth: "AssociativeBoth",
    ..._
  })
}
