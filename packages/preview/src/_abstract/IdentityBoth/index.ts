import { AnyF, AnyK } from "../Any"
import { AssociativeBothF, AssociativeBothK } from "../AssociativeBoth"
import { URIS } from "../HKT"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[(A, B)]` with an identity.
 */
export type IdentityBothF<F, Fix = any> = AssociativeBothF<F, Fix> & AnyF<F, Fix>

export type IdentityBothK<F extends URIS, Fix = any> = AssociativeBothK<F, Fix> &
  AnyK<F, Fix>

export function makeIdentityBoth<URI extends URIS, Fix = any>(
  _: URI
): (_: Omit<IdentityBothK<URI, Fix>, "URI" | "Fix">) => IdentityBothK<URI, Fix>
export function makeIdentityBoth<URI, Fix = any>(
  URI: URI
): (_: Omit<IdentityBothF<URI, Fix>, "URI" | "Fix">) => IdentityBothF<URI, Fix>
export function makeIdentityBoth<URI, Fix = any>(
  URI: URI
): (_: Omit<IdentityBothF<URI, Fix>, "URI" | "Fix">) => IdentityBothF<URI, Fix> {
  return (_) => ({
    URI,
    Fix: undefined as any,
    ..._
  })
}
