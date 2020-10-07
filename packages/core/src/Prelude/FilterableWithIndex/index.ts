import type { Compactable } from "../Compactable"
import type { CovariantWithIndex } from "../CovariantWithIndex"
import type { FilterMapWithIndex } from "../FilterMapWithIndex"
import type { FilterWithIndex } from "../FilterWithIndex"
import type * as HKT from "../HKT"
import type { PartitionMapWithIndex } from "../PartitionMapWithIndex"
import type { PartitionWithIndex } from "../PartitionWithIndex"

export type FilterableWithIndex<F extends HKT.URIS, C = HKT.Auto> = CovariantWithIndex<
  F,
  C
> &
  Compactable<F, C> &
  FilterWithIndex<F, C> &
  PartitionWithIndex<F, C> &
  FilterMapWithIndex<F, C> &
  PartitionMapWithIndex<F, C>
