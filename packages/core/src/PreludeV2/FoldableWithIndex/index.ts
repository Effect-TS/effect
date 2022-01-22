// ets_tracing: off

import type { FoldMapWithIndex } from "../FoldMapWithIndex/index.js"
import type * as HKT from "../HKT/index.js"
import type { ReduceRightWithIndex } from "../ReduceRightWithIndex/index.js"
import type { ReduceWithIndex } from "../ReduceWithIndex/index.js"

export type FoldableWithIndex<K, F extends HKT.HKT> = ReduceRightWithIndex<K, F> &
  ReduceWithIndex<K, F> &
  FoldMapWithIndex<K, F>
