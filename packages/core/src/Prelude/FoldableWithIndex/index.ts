import type { FoldMapWithIndex } from "../FoldMapWithIndex"
import type { Auto, URIS } from "../HKT"
import type { ReduceRightWithIndex } from "../ReduceRightWithIndex"
import type { ReduceWithIndex } from "../ReduceWithIndex"

export type FoldableWithIndex<F extends URIS, C = Auto> = ReduceRightWithIndex<F, C> &
  ReduceWithIndex<F, C> &
  FoldMapWithIndex<F, C>
