// ets_tracing: off

import * as EQ from "../../../../Equal/index.js"
import type * as C from "../core.js"
import * as ChangesWith from "./changesWith.js"

/**
 * Returns a new stream that only emits elements that are not equal to the
 * previous element emitted, using natural equality to determine whether two
 * elements are equal.
 */
export function changes<R, E, A>(self: C.Stream<R, E, A>) {
  return ChangesWith.changesWith_(self, EQ.strict<A>())
}
