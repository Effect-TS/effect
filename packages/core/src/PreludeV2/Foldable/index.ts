// ets_tracing: off

import type { FoldMap } from "../FoldMap"
import type * as HKT from "../HKT"
import type { Reduce } from "../Reduce"
import type { ReduceRight } from "../ReduceRight"

export interface Foldable<F extends HKT.HKT>
  extends ReduceRight<F>,
    Reduce<F>,
    FoldMap<F> {}
