// ets_tracing: off

import type { Ord } from "../Ord/index.js"
import type { HKT } from "../PreludeV2/index.js"

export interface Bounded<A> extends Ord<A> {
  readonly top: A
  readonly bottom: A
}

export interface BoundedF extends HKT {
  readonly type: Bounded<this["A"]>
}
