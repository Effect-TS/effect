import { AssociativeBoth6, AssociativeBothF } from "../AssociativeBoth"
import { URIS6 } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface CommutativeBothF<F> extends AssociativeBothF<F> {
  readonly CommutativeBoth: "CommutativeBoth"
}

export interface CommutativeBoth6<F extends URIS6> extends AssociativeBoth6<F> {
  readonly CommutativeBoth: "CommutativeBoth"
}

export function makeCommutativeBoth<URI extends URIS6>(
  _: URI
): (_: Omit<CommutativeBoth6<URI>, "URI" | "CommutativeBoth">) => CommutativeBoth6<URI>
export function makeCommutativeBoth<URI>(
  URI: URI
): (
  _: Omit<CommutativeBothF<URI>, "URI" | "CommutativeBoth">
) => CommutativeBothF<URI> {
  return (_) => ({
    URI,
    CommutativeBoth: "CommutativeBoth",
    ..._
  })
}
