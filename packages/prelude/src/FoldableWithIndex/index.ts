import type { Auto, URIS } from "@effect-ts/hkt"

import type { FoldMapWithIndex } from "../FoldMapWithIndex"
import type { ReduceRightWithIndex } from "../ReduceRightWithIndex"
import type { ReduceWithIndex } from "../ReduceWithIndex"

export type FoldableWithIndex<F extends URIS, C = Auto> = ReduceRightWithIndex<F, C> &
  ReduceWithIndex<F, C> &
  FoldMapWithIndex<F, C>
