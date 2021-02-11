import type { Auto, URIS } from "@effect-ts/hkt"

import type { FoldMap } from "../FoldMap"
import type { Reduce } from "../Reduce"
import type { ReduceRight } from "../ReduceRight"

export interface Foldable<F extends URIS, C = Auto>
  extends ReduceRight<F, C>,
    Reduce<F, C>,
    FoldMap<F, C> {}
