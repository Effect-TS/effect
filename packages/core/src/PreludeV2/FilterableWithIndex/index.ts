// ets_tracing: off

import type { FilterMapWithIndex } from "../FilterMapWithIndex/index.js"
import type { FilterWithIndex } from "../FilterWithIndex/index.js"
import type * as HKT from "../HKT/index.js"
import type { PartitionMapWithIndex } from "../PartitionMapWithIndex/index.js"
import type { PartitionWithIndex } from "../PartitionWithIndex/index.js"

export interface FilterableWithIndex<K, F extends HKT.HKT>
  extends FilterWithIndex<K, F>,
    PartitionWithIndex<K, F>,
    FilterMapWithIndex<K, F>,
    PartitionMapWithIndex<K, F> {}
