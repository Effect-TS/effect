// ets_tracing: off

import type { Filter } from "../Filter"
import type { FilterMap } from "../FilterMap"
import type * as HKT from "../HKT"
import type { Partition } from "../Partition"
import type { PartitionMap } from "../PartitionMap"

export interface Filterable<F extends HKT.HKT>
  extends Filter<F>,
    FilterMap<F>,
    Partition<F>,
    PartitionMap<F> {}
