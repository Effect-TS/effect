// ets_tracing: off

import type { FiberId } from "../definition"
import { isNone } from "./isNone"

/**
 * Returns this `FiberId` if it is not `None`, otherwise returns that `FiberId`.
 */
export function getOrElse_(self: FiberId, that: () => FiberId): FiberId {
  return isNone(self) ? that() : self
}

/**
 * Returns this `FiberId` if it is not `None`, otherwise returns that `FiberId`.
 */
export function getOrElse(that: () => FiberId) {
  return (self: FiberId): FiberId => getOrElse_(self, that)
}
