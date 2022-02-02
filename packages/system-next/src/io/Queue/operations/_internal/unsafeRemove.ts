import type { MutableQueue } from "../../../../support/MutableQueue"
import { unsafeOfferAll } from "./unsafeOfferAll"
import { unsafePollAll } from "./unsafePollAll"

/**
 * Remove an item from the queue.
 */
export function unsafeRemove<A>(queue: MutableQueue<A>, a: A): void {
  unsafeOfferAll(queue, unsafePollAll(queue)).filter((b) => a !== b)
}
