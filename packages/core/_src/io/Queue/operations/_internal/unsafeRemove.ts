import { unsafeOfferAll } from "@effect/core/io/Queue/operations/_internal/unsafeOfferAll"
import { unsafePollAll } from "@effect/core/io/Queue/operations/_internal/unsafePollAll"

/**
 * Remove an item from the queue.
 */
export function unsafeRemove<A>(queue: MutableQueue<A>, a: A): void {
  unsafeOfferAll(
    queue,
    unsafePollAll(queue).filter((b) => a !== b)
  )
}
