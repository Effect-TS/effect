// ets_tracing: off

import type { FoldMapWithIndex } from "../FoldMapWithIndex"
import type * as HKT from "../HKT"
import type { ReduceRightWithIndex } from "../ReduceRightWithIndex"
import type { ReduceWithIndex } from "../ReduceWithIndex"

export type FoldableWithIndex<K, F extends HKT.HKT> = ReduceRightWithIndex<K, F> &
  ReduceWithIndex<K, F> &
  FoldMapWithIndex<K, F>
