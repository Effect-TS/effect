import { HasURI, HKT6, Kind, URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface AssociativeFlattenF<F> extends HasURI<F> {
  readonly AssociativeFlatten: "AssociativeFlatten"
  readonly flatten: <X, I, S, R, E, X1, I1, R1, E1, A>(
    fb: HKT6<F, X, I, S, R, E, HKT6<F, X1, I1, S, R1, E1, A>>
  ) => HKT6<F, X | X1, I & I1, S, R & R1, E | E1, A>
}

export interface AssociativeFlattenK<F extends URIS> extends HasURI<F> {
  readonly AssociativeFlatten: "AssociativeFlatten"
  readonly flatten: <X, I, S, R, E, X1, I1, R1, E1, A>(
    fb: Kind<F, X, I, S, R, E, Kind<F, X1, I1, S, R1, E1, A>>
  ) => Kind<F, X | X1, I & I1, S, R & R1, E | E1, A>
}

export function makeAssociativeFlatten<URI extends URIS>(
  _: URI
): (
  _: Omit<AssociativeFlattenK<URI>, "URI" | "AssociativeFlatten">
) => AssociativeFlattenK<URI>
export function makeAssociativeFlatten<URI>(
  URI: URI
): (
  _: Omit<AssociativeFlattenF<URI>, "URI" | "AssociativeFlatten">
) => AssociativeFlattenF<URI>
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
