// ets_tracing: off

import type { FilterMapWithIndex } from "../FilterMapWithIndex"
import type { FilterWithIndex } from "../FilterWithIndex"
import type * as HKT from "../HKT"
import type { PartitionMapWithIndex } from "../PartitionMapWithIndex"
import type { PartitionWithIndex } from "../PartitionWithIndex"

export interface FilterableWithIndex<K, F extends HKT.HKT>
  extends FilterWithIndex<K, F>,
    PartitionWithIndex<K, F>,
    FilterMapWithIndex<K, F>,
    PartitionMapWithIndex<K, F> {}
