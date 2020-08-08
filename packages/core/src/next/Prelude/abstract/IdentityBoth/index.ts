import { AnyK, AnyF } from "../Any"
import { AssociativeBothK, AssociativeBothF } from "../AssociativeBoth"
import { URIS } from "../HKT"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[(A, B)]` with an identity.
 */
export type IdentityBothF<F> = AssociativeBothF<F> & AnyF<F>

export type IdentityBothK<F extends URIS> = AssociativeBothK<F> & AnyK<F>

export function makeIdentityBoth<URI extends URIS>(
  _: URI
): (_: Omit<IdentityBothK<URI>, "URI">) => IdentityBothK<URI>
export function makeIdentityBoth<URI>(
  URI: URI
): (_: Omit<IdentityBothF<URI>, "URI">) => IdentityBothF<URI> {
  return (_) => ({
    URI,
    ..._
  })
}
