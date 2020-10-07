import type { Compactable } from "../Compactable"
import type { Covariant } from "../Covariant"
import type { Filter } from "../Filter"
import type { FilterMap } from "../FilterMap"
import type * as HKT from "../HKT"
import type { Partition } from "../Partition"
import type { PartitionMap } from "../PartitionMap"

export type Filterable<F extends HKT.URIS, C = HKT.Auto> = Covariant<F, C> &
  Compactable<F, C> &
  Filter<F, C> &
  FilterMap<F, C> &
  Partition<F, C> &
  PartitionMap<F, C>
