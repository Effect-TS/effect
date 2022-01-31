// ets_tracing: off

import type { Closure } from "../Closure/index.js"

/**
 * The `Associative[A]` type class describes an associative binary operator
 * for a type `A`. For example, addition for integers, and string
 * concatenation for strings.
 */
export interface Associative<A> extends Closure<A> {
  readonly _Associative: "Associative"
}
