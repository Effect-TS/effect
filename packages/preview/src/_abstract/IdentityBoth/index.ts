import { AnyF, AnyK } from "../Any"
import { AssociativeBothF, AssociativeBothK } from "../AssociativeBoth"
import { URIS } from "../HKT"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[(A, B)]` with an identity.
 */
export type IdentityBothF<
  F,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> = AssociativeBothF<F, Fix0, Fix1, Fix2, Fix3> & AnyF<F, Fix0, Fix1, Fix2, Fix3>

export type IdentityBothK<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> = AssociativeBothK<F, Fix0, Fix1, Fix2, Fix3> & AnyK<F, Fix0, Fix1, Fix2, Fix3>

export function makeIdentityBoth<
  URI extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  _: URI
): (
  _: Omit<
    IdentityBothK<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => IdentityBothK<URI, Fix0, Fix1, Fix2, Fix3>
export function makeIdentityBoth<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (
  _: Omit<
    IdentityBothF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => IdentityBothF<URI, Fix0, Fix1, Fix2, Fix3>
export function makeIdentityBoth<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (
  _: Omit<
    IdentityBothF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => IdentityBothF<URI, Fix0, Fix1, Fix2, Fix3> {
  return (_) => ({
    URI,
    Fix0: undefined as any,
    Fix1: undefined as any,
    Fix2: undefined as any,
    Fix3: undefined as any,
    ..._
  })
}
