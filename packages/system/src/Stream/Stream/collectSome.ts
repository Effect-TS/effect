// ets_tracing: off

import { identity } from "../../Function/index.js"
import type * as O from "../../Option/index.js"
import { collect_ } from "./collect.js"
import type { Stream } from "./definitions.js"

/**
 * Filters any 'None' values.
 */
export function collectSome<R, E, O1>(
  self: Stream<R, E, O.Option<O1>>
): Stream<R, E, O1> {
  return collect_(self, identity)
}
