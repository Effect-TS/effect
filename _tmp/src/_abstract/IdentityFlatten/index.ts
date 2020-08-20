import type { AnyF, AnyK } from "../Any"
import type { AssociativeFlattenF, AssociativeFlattenK } from "../AssociativeFlatten"
import type { URIS } from "../HKT"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[(A, B)]` with an identity.
 */
export type IdentityFlattenF<
  F,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = AssociativeFlattenF<F, TL0, TL1, TL2, TL3> & AnyF<F, TL0, TL1, TL2, TL3>

export type IdentityFlattenK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = AssociativeFlattenK<F, TL0, TL1, TL2, TL3> & AnyK<F, TL0, TL1, TL2, TL3>
