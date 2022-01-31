// ets_tracing: off

import type { Filter } from "../Filter/index.js"
import type { FilterMap } from "../FilterMap/index.js"
import type * as HKT from "../HKT/index.js"
import type { Partition } from "../Partition/index.js"
import type { PartitionMap } from "../PartitionMap/index.js"

export interface Filterable<F extends HKT.URIS, C = HKT.Auto>
  extends Filter<F, C>,
    FilterMap<F, C>,
    Partition<F, C>,
    PartitionMap<F, C> {}
