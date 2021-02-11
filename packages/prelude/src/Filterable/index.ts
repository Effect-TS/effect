import type * as HKT from "@effect-ts/hkt"

import type { Filter } from "../Filter"
import type { FilterMap } from "../FilterMap"
import type { Partition } from "../Partition"
import type { PartitionMap } from "../PartitionMap"

export interface Filterable<F extends HKT.URIS, C = HKT.Auto>
  extends Filter<F, C>,
    FilterMap<F, C>,
    Partition<F, C>,
    PartitionMap<F, C> {}
