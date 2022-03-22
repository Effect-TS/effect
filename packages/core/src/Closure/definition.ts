// ets_tracing: off

import type { HKT } from "../PreludeV2/index.js"

/**
 * Base combine
 */
export interface Closure<A> {
  readonly _Closure: "Closure" // @todo: should we remove those from the types ?
  readonly combine: (x: A, y: A) => A
}

export interface ClosureF extends HKT {
  readonly type: Closure<this["A"]>
}
