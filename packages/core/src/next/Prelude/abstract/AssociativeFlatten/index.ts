import {
  HasURI,
  HKT,
  HKT3,
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
export interface AssociativeFlattenF<F> extends HasURI<F> {
  readonly AssociativeFlatten: "AssociativeFlatten"
  readonly flatten: <A>(fb: HKT<F, HKT<F, A>>) => HKT<F, A>
}

export interface AssociativeFlattenF3<F> extends HasURI<F> {
  readonly AssociativeFlatten: "AssociativeFlatten"
  readonly flatten: <R, E, R1, E1, A>(
    fb: HKT3<F, R, E, HKT3<F, R1, E1, A>>
  ) => HKT3<F, R & R1, E | E1, A>
}

export interface AssociativeFlatten1<F extends URIS> extends HasURI<F> {
  readonly AssociativeFlatten: "AssociativeFlatten"
  readonly flatten: <A>(fb: Kind<F, Kind<F, A>>) => Kind<F, A>
}

export interface AssociativeFlatten2<F extends URIS2> extends HasURI<F> {
  readonly AssociativeFlatten: "AssociativeFlatten"
  readonly flatten: <E, E1, A>(fb: Kind2<F, E, Kind2<F, E1, A>>) => Kind2<F, E | E1, A>
}

export interface AssociativeFlatten3<F extends URIS3> extends HasURI<F> {
  readonly AssociativeFlatten: "AssociativeFlatten"
  readonly flatten: <R, E, R1, E1, A>(
    fb: Kind3<F, R, E, Kind3<F, R1, E1, A>>
  ) => Kind3<F, R & R1, E | E1, A>
}

export interface AssociativeFlatten4<F extends URIS4> extends HasURI<F> {
  readonly AssociativeFlatten: "AssociativeFlatten"
  readonly flatten: <S, R, E, R1, E1, A>(
    fb: Kind4<F, S, R, E, Kind4<F, S, R1, E1, A>>
  ) => Kind4<F, S, R & R1, E | E1, A>
}

export interface AssociativeFlatten5<F extends URIS5> extends HasURI<F> {
  readonly AssociativeFlatten: "AssociativeFlatten"
  readonly flatten: <I, S, R, E, I1, R1, E1, A>(
    fb: Kind5<F, I, S, R, E, Kind5<F, I1, S, R1, E1, A>>
  ) => Kind5<F, I & I1, S, R & R1, E | E1, A>
}

export interface AssociativeFlatten6<F extends URIS6> extends HasURI<F> {
  readonly AssociativeFlatten: "AssociativeFlatten"
  readonly flatten: <X, I, S, R, E, I1, S1, R1, E1, A>(
    fb: Kind6<F, X, I, S, R, E, Kind6<F, X, I1, S1, R1, E1, A>>
  ) => Kind6<F, X, I & I1, S | S1, R & R1, E | E1, A>
}

export function makeAssociativeFlatten<URI extends URIS>(
  _: URI
): (
  _: Omit<AssociativeFlatten1<URI>, "URI" | "AssociativeFlatten">
) => AssociativeFlatten1<URI>
export function makeAssociativeFlatten<URI extends URIS2>(
  _: URI
): (
  _: Omit<AssociativeFlatten2<URI>, "URI" | "AssociativeFlatten">
) => AssociativeFlatten2<URI>
export function makeAssociativeFlatten<URI extends URIS3>(
  _: URI
): (
  _: Omit<AssociativeFlatten3<URI>, "URI" | "AssociativeFlatten">
) => AssociativeFlatten3<URI>
export function makeAssociativeFlatten<URI extends URIS4>(
  _: URI
): (
  _: Omit<AssociativeFlatten4<URI>, "URI" | "AssociativeFlatten">
) => AssociativeFlatten4<URI>
export function makeAssociativeFlatten<URI extends URIS5>(
  _: URI
): (
  _: Omit<AssociativeFlatten5<URI>, "URI" | "AssociativeFlatten">
) => AssociativeFlatten5<URI>
export function makeAssociativeFlatten<URI extends URIS6>(
  _: URI
): (
  _: Omit<AssociativeFlatten6<URI>, "URI" | "AssociativeFlatten">
) => AssociativeFlatten6<URI>
export function makeAssociativeFlatten<URI>(
  URI: URI
): (
  _: Omit<AssociativeFlattenF<URI>, "URI" | "AssociativeFlatten">
) => AssociativeFlattenF<URI> {
  return (_) => ({
    URI,
    AssociativeFlatten: "AssociativeFlatten",
    ..._
  })
}
