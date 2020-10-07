import type { Filter } from "../Filter"
import type { FilterMap } from "../FilterMap"
import type * as HKT from "../HKT"
import type { Partition } from "../Partition"
import type { PartitionMap } from "../PartitionMap"

export type Filterable<F extends HKT.URIS, C = HKT.Auto> = Filter<F, C> &
  FilterMap<F, C> &
  Partition<F, C> &
  PartitionMap<F, C>
