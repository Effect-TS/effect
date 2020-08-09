import { AssociativeBothK, AssociativeBothF } from "../AssociativeBoth"
import { URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface CommutativeBothF<F> extends AssociativeBothF<F> {
  readonly CommutativeBoth: "CommutativeBoth"
}

export interface CommutativeBothK<F extends URIS> extends AssociativeBothK<F> {
  readonly CommutativeBoth: "CommutativeBoth"
}

export function makeCommutativeBoth<URI extends URIS>(
  _: URI
): (_: Omit<CommutativeBothK<URI>, "URI" | "CommutativeBoth">) => CommutativeBothK<URI>
export function makeCommutativeBoth<URI>(
  URI: URI
): (_: Omit<CommutativeBothF<URI>, "URI" | "CommutativeBoth">) => CommutativeBothF<URI>
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
