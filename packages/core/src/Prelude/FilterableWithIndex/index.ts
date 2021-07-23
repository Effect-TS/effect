// ets_tracing: off

import type { FilterMapWithIndex } from "../FilterMapWithIndex"
import type { FilterWithIndex } from "../FilterWithIndex"
import type * as HKT from "../HKT"
import type { PartitionMapWithIndex } from "../PartitionMapWithIndex"
import type { PartitionWithIndex } from "../PartitionWithIndex"

export interface FilterableWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends FilterWithIndex<F, C>,
    PartitionWithIndex<F, C>,
    FilterMapWithIndex<F, C>,
    PartitionMapWithIndex<F, C> {}
