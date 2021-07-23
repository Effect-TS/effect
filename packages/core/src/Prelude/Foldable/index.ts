// ets_tracing: off

import type { FoldMap } from "../FoldMap"
import type { Auto, URIS } from "../HKT"
import type { Reduce } from "../Reduce"
import type { ReduceRight } from "../ReduceRight"

export interface Foldable<F extends URIS, C = Auto>
  extends ReduceRight<F, C>,
    Reduce<F, C>,
    FoldMap<F, C> {}
