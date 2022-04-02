// ets_tracing: off

import type { HKT } from "../Prelude/index.js"

/**
 * Base combine
 */
export interface Closure<A> {
  readonly _Closure: "Closure"
  readonly combine: (x: A, y: A) => A
}

export interface ClosureF extends HKT {
  readonly type: Closure<this["A"]>
}
