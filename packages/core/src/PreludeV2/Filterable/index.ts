// ets_tracing: off

import type { Filter } from "../Filter/index.js"
import type { FilterMap } from "../FilterMap/index.js"
import type * as HKT from "../HKT/index.js"
import type { Partition } from "../Partition/index.js"
import type { PartitionMap } from "../PartitionMap/index.js"

export interface Filterable<F extends HKT.HKT>
  extends Filter<F>,
    FilterMap<F>,
    Partition<F>,
    PartitionMap<F> {}
