import type { UIO } from "../../Effect"
import type { Hub } from "../definition"

/**
 * Checks whether the hub is currently full.
 *
 * @tsplus fluent ets/Hub isFull
 */
export function isFull<A>(self: Hub<A>, __tsplusTrace?: string): UIO<boolean> {
  return self.size.map((n) => n === self.capacity)
}
