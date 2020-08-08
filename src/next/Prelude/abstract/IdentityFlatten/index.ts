import { Any6, AnyF } from "../Any"
import { AssociativeFlatten6, AssociativeFlattenF } from "../AssociativeFlatten"
import { URIS6 } from "../HKT"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[(A, B)]` with an identity.
 */
export type IdentityFlattenF<F> = AssociativeFlattenF<F> & AnyF<F>

export type IdentityFlatten6<F extends URIS6> = AssociativeFlatten6<F> & Any6<F>

export function makeIdentityFlatten<URI extends URIS6>(
  _: URI
): (_: Omit<IdentityFlatten6<URI>, "URI">) => IdentityFlatten6<URI>
export function makeIdentityFlatten<URI>(
  URI: URI
): (_: Omit<IdentityFlattenF<URI>, "URI">) => IdentityFlattenF<URI> {
  return (_) => ({
    URI,
    ..._
  })
}
