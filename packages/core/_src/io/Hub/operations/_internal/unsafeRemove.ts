import { unsafeOfferAll } from "@effect-ts/core/io/Hub/operations/_internal/unsafeOfferAll";
import { unsafePollAllQueue } from "@effect-ts/core/io/Hub/operations/_internal/unsafePollAllQueue";

/**
 * Unsafely removes the specified item from a queue.
 */
export function unsafeRemove<A>(queue: MutableQueue<A>, a: A): void {
  unsafeOfferAll(
    queue,
    unsafePollAllQueue(queue).filter((_) => _ !== a)
  );
}
