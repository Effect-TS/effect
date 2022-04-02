// ets_tracing: off

import type { FoldMap } from "../FoldMap/index.js"
import type * as HKT from "../HKT/index.js"
import type { Reduce } from "../Reduce/index.js"
import type { ReduceRight } from "../ReduceRight/index.js"

export interface Foldable<F extends HKT.HKT>
  extends ReduceRight<F>,
    Reduce<F>,
    FoldMap<F> {}
