// ets_tracing: off

import type { Commutative } from "./definition.js"

export function makeCommutative<A>(f: (l: A, r: A) => A): Commutative<A> {
  return {
    _Closure: "Closure",
    _Commutative: "Commutative",
    _Associative: "Associative",
    combine: f,
    commute: (x, y) => f(y, x)
  }
}
