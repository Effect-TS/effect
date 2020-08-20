import type { FoldMapF, FoldMapK } from "../FoldMap"
import type { URIS } from "../HKT"
import type { ReduceF, ReduceK } from "../Reduce"
import type { ReduceRightF, ReduceRightK } from "../ReduceRight"

export type FoldableF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any> = FoldMapF<
  F,
  TL0,
  TL1,
  TL2,
  TL3
> &
  ReduceF<F, TL0, TL1, TL2, TL3> &
  ReduceRightF<F, TL0, TL1, TL2, TL3>

export type FoldableK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = FoldMapK<F, TL0, TL1, TL2, TL3> &
  ReduceK<F, TL0, TL1, TL2, TL3> &
  ReduceRightK<F, TL0, TL1, TL2, TL3>
