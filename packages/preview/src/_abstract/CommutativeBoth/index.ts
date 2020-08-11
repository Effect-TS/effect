import { AssociativeBothK, AssociativeBothF } from "../AssociativeBoth"
import { URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface CommutativeBothF<F, Fix = any> extends AssociativeBothF<F, Fix> {
  readonly CommutativeBoth: "CommutativeBoth"
}

export interface CommutativeBothK<F extends URIS, Fix = any>
  extends AssociativeBothK<F, Fix> {
  readonly CommutativeBoth: "CommutativeBoth"
}

export function makeCommutativeBoth<URI extends URIS, Fix = any>(
  _: URI
): (
  _: Omit<CommutativeBothK<URI, Fix>, "URI" | "Fix" | "CommutativeBoth">
) => CommutativeBothK<URI, Fix>
export function makeCommutativeBoth<URI, Fix = any>(
  URI: URI
): (
  _: Omit<CommutativeBothF<URI, Fix>, "URI" | "Fix" | "CommutativeBoth">
) => CommutativeBothF<URI, Fix>
export function makeCommutativeBoth<URI, Fix = any>(
  URI: URI
): (
  _: Omit<CommutativeBothF<URI, Fix>, "URI" | "Fix" | "CommutativeBoth">
) => CommutativeBothF<URI, Fix> {
  return (_) => ({
    URI,
    Fix: undefined as any,
    CommutativeBoth: "CommutativeBoth",
    ..._
  })
}
