import { AnyK, AnyF } from "../Any"
import { AssociativeFlattenK, AssociativeFlattenF } from "../AssociativeFlatten"
import { URIS } from "../HKT"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[(A, B)]` with an identity.
 */
export type IdentityFlattenF<F> = AssociativeFlattenF<F> & AnyF<F>

export type IdentityFlattenK<F extends URIS> = AssociativeFlattenK<F> & AnyK<F>

export function makeIdentityFlatten<URI extends URIS>(
  _: URI
): (_: Omit<IdentityFlattenK<URI>, "URI">) => IdentityFlattenK<URI>
export function makeIdentityFlatten<URI>(
  URI: URI
): (_: Omit<IdentityFlattenF<URI>, "URI">) => IdentityFlattenF<URI> {
  return (_) => ({
    URI,
    ..._
  })
}
