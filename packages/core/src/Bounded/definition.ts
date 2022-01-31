// ets_tracing: off

import type { Ord } from "../Ord/index.js"

export interface Bounded<A> extends Ord<A> {
  readonly top: A
  readonly bottom: A
}
