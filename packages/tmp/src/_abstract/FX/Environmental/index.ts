import { CovariantF, CovariantK } from "../../Covariant"
import { URIS } from "../../HKT"
import { IdentityFlattenF, IdentityFlattenK } from "../../IdentityFlatten"
import { AccessF, AccessK } from "../Access"

export type EnvironmentalF<
  F,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = IdentityFlattenF<F, TL0, TL1, TL2, TL3> &
  AccessF<F, TL0, TL1, TL2, TL3> &
  CovariantF<F, TL0, TL1, TL2, TL3>

export type EnvironmentalK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = IdentityFlattenK<F, TL0, TL1, TL2, TL3> &
  AccessK<F, TL0, TL1, TL2, TL3> &
  CovariantK<F, TL0, TL1, TL2, TL3>
