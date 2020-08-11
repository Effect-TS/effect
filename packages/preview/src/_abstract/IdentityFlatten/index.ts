import { AnyF, AnyK } from "../Any"
import { AssociativeFlattenF, AssociativeFlattenK } from "../AssociativeFlatten"
import { URIS } from "../HKT"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[(A, B)]` with an identity.
 */
export type IdentityFlattenF<
  F,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> = AssociativeFlattenF<F, Fix0, Fix1, Fix2, Fix3> & AnyF<F, Fix0, Fix1, Fix2, Fix3>

export type IdentityFlattenK<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> = AssociativeFlattenK<F, Fix0, Fix1, Fix2, Fix3> & AnyK<F, Fix0, Fix1, Fix2, Fix3>

export function makeIdentityFlatten<
  URI extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  _: URI
): (
  _: Omit<
    IdentityFlattenK<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => IdentityFlattenK<URI, Fix0, Fix1, Fix2, Fix3>
export function makeIdentityFlatten<
  URI,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  URI: URI
): (
  _: Omit<
    IdentityFlattenF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => IdentityFlattenF<URI, Fix0, Fix1, Fix2, Fix3>
export function makeIdentityFlatten<
  URI,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  URI: URI
): (
  _: Omit<
    IdentityFlattenF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => IdentityFlattenF<URI, Fix0, Fix1, Fix2, Fix3> {
  return (_) => ({
    URI,
    Fix0: undefined as any,
    Fix1: undefined as any,
    Fix2: undefined as any,
    Fix3: undefined as any,
    ..._
  })
}
