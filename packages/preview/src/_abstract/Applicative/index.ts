import { CovariantF, CovariantK } from "../Covariant"
import { URIS } from "../HKT"
import { IdentityBothF, IdentityBothK } from "../IdentityBoth"

export type ApplicativeF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any> = IdentityBothF<
  F,
  TL0,
  TL1,
  TL2,
  TL3
> &
  CovariantF<F, TL0, TL1, TL2, TL3>

export type ApplicativeK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = IdentityBothK<F, TL0, TL1, TL2, TL3> & CovariantK<F, TL0, TL1, TL2, TL3>
