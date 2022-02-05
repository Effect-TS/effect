// ets_tracing: off

import { instance } from "../Prelude/index.js"
import type { Commutative } from "./definition.js"

export function makeCommutative<A>(f: (l: A, r: A) => A): Commutative<A> {
  return instance<Commutative<A>>({
    combine: f,
    commute: (x, y) => f(y, x)
  })
}
