import type { Exit } from "../definition"
import { mapErrorCause_ } from "./mapErrorCause"

/**
 * Returns an untraced `Exit` value.
 */
export function untraced<E, A>(self: Exit<E, A>): Exit<E, A> {
  return mapErrorCause_(self, (_) => _.untraced())
}
