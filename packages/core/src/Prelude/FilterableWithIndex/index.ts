// ets_tracing: off

import type { FilterMapWithIndex } from "../FilterMapWithIndex/index.js"
import type { FilterWithIndex } from "../FilterWithIndex/index.js"
import type * as HKT from "../HKT/index.js"
import type { PartitionMapWithIndex } from "../PartitionMapWithIndex/index.js"
import type { PartitionWithIndex } from "../PartitionWithIndex/index.js"

export interface FilterableWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends FilterWithIndex<F, C>,
    PartitionWithIndex<F, C>,
    FilterMapWithIndex<F, C>,
    PartitionMapWithIndex<F, C> {}
