// ets_tracing: off

import type * as M from "../_internal/managed.js"
import type { Stream } from "./definitions.js"
import { flatten } from "./flatten.js"
import { managed } from "./managed.js"

/**
 * Creates a stream produced from a [[ZManaged]]
 */
export function unwrapManaged<R, E, A>(
  fa: M.Managed<R, E, Stream<R, E, A>>
): Stream<R, E, A> {
  return flatten(managed(fa))
}
