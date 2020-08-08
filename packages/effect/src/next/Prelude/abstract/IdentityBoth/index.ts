import { Any6, AnyF } from "../Any"
import { AssociativeBoth6, AssociativeBothF } from "../AssociativeBoth"
import { URIS6 } from "../HKT"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[(A, B)]` with an identity.
 */
export type IdentityBothF<F> = AssociativeBothF<F> & AnyF<F>

export type IdentityBoth6<F extends URIS6> = AssociativeBoth6<F> & Any6<F>

export function makeIdentityBoth<URI extends URIS6>(
  _: URI
): (_: Omit<IdentityBoth6<URI>, "URI">) => IdentityBoth6<URI>
export function makeIdentityBoth<URI>(
  URI: URI
): (_: Omit<IdentityBothF<URI>, "URI">) => IdentityBothF<URI> {
  return (_) => ({
    URI,
    ..._
  })
}
