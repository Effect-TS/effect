// ets_tracing: off

import type { FoldMap } from "../FoldMap/index.js"
import type { Auto, URIS } from "../HKT/index.js"
import type { Reduce } from "../Reduce/index.js"
import type { ReduceRight } from "../ReduceRight/index.js"

export interface Foldable<F extends URIS, C = Auto>
  extends ReduceRight<F, C>,
    Reduce<F, C>,
    FoldMap<F, C> {}
