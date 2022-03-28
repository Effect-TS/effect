import type { MutableQueue } from "../../../../support/MutableQueue"
import { unsafeOfferAll } from "./unsafeOfferAll"
import { unsafePollAllQueue } from "./unsafePollAllQueue"

/**
 * Unsafely removes the specified item from a queue.
 */
export function unsafeRemove<A>(queue: MutableQueue<A>, a: A): void {
  unsafeOfferAll(
    queue,
    unsafePollAllQueue(queue).filter((_) => _ !== a)
  )
}
