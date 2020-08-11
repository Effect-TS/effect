import { AnyF, AnyK } from "../Any"
import { AssociativeFlattenF, AssociativeFlattenK } from "../AssociativeFlatten"
import { URIS } from "../HKT"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[(A, B)]` with an identity.
 */
export type IdentityFlattenF<F, Fix = any> = AssociativeFlattenF<F, Fix> & AnyF<F, Fix>

export type IdentityFlattenK<F extends URIS, Fix = any> = AssociativeFlattenK<F, Fix> &
  AnyK<F, Fix>

export function makeIdentityFlatten<URI extends URIS, Fix = any>(
  _: URI
): (_: Omit<IdentityFlattenK<URI, Fix>, "URI" | "Fix">) => IdentityFlattenK<URI, Fix>
export function makeIdentityFlatten<URI, Fix = any>(
  URI: URI
): (_: Omit<IdentityFlattenF<URI, Fix>, "URI" | "Fix">) => IdentityFlattenF<URI, Fix>
export function makeIdentityFlatten<URI, Fix = any>(
  URI: URI
): (_: Omit<IdentityFlattenF<URI, Fix>, "URI" | "Fix">) => IdentityFlattenF<URI, Fix> {
  return (_) => ({
    URI,
    Fix: undefined as any,
    ..._
  })
}
