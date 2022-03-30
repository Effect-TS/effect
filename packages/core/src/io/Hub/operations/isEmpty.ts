import type { UIO } from "../../Effect"
import type { Hub } from "../definition"

/**
 * Checks whether the hub is currently empty.
 *
 * @tsplus fluent ets/Hub isEmpty
 */
export function isEmpty<A>(self: Hub<A>, __tsplusTrace?: string): UIO<boolean> {
  return self.size.map((n) => n === 0)
}
