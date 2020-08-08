import { HasURI, HKT3, Kind6, URIS6 } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface AssociativeFlattenF<F> extends HasURI<F> {
  readonly AssociativeFlatten: "AssociativeFlatten"
  readonly flatten: <R, E, R1, E1, A>(
    fb: HKT3<F, R, E, HKT3<F, R1, E1, A>>
  ) => HKT3<F, R & R1, E | E1, A>
}

export interface AssociativeFlatten6<F extends URIS6> extends HasURI<F> {
  readonly AssociativeFlatten: "AssociativeFlatten"
  readonly flatten: <X, I, S, R, E, I1, S1, R1, E1, A>(
    fb: Kind6<F, X, I, S, R, E, Kind6<F, X, I1, S1, R1, E1, A>>
  ) => Kind6<F, X, I & I1, S | S1, R & R1, E | E1, A>
}

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
