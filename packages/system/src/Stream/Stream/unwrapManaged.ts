import type * as M from "../_internal/managed"
import type { Stream } from "./definitions"
import { flatten } from "./flatten"
import { managed } from "./managed"

/**
 * Creates a stream produced from a [[ZManaged]]
 */
export function unwrapManaged<R, E, A>(
  fa: M.Managed<R, E, Stream<R, E, A>>
): Stream<R, E, A> {
  return flatten(managed(fa))
}
