// ets_tracing: off

import type { Closure } from "../Closure/index.js"
import type { HKT } from "../PreludeV2/index.js"

/**
 * The `Associative[A]` type class describes an associative binary operator
 * for a type `A`. For example, addition for integers, and string
 * concatenation for strings.
 */
export interface Associative<A> extends Closure<A> {
  readonly _Associative: "Associative"
}

export interface AssociativeF extends HKT {
  readonly type: Associative<this["A"]>
}
