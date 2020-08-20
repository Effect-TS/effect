import { AssociativeEitherF, AssociativeEitherK } from "../AssociativeEither"
import { URIS } from "../HKT"
import { NoneF, NoneK } from "../None"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[Either[A, B]]` with an identity value.
 */
export type IdentityEitherF<
  F,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = AssociativeEitherF<F, TL0, TL1, TL2, TL3> & NoneF<F, TL0, TL1, TL2, TL3>

export type IdentityEitherK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = AssociativeEitherK<F, TL0, TL1, TL2, TL3> & NoneK<F, TL0, TL1, TL2, TL3>
