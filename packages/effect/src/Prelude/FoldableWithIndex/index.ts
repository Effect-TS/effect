import { FoldMapWithIndex } from "../FoldMapWithIndex"
import { Auto, URIS } from "../HKT"
import { ReduceRightWithIndex } from "../ReduceRightWithIndex"
import { ReduceWithIndex } from "../ReduceWithIndex"

export type FoldableWithIndex<F extends URIS, C = Auto> = ReduceRightWithIndex<F, C> &
  ReduceWithIndex<F, C> &
  FoldMapWithIndex<F, C>
