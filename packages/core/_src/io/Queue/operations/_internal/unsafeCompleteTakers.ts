import { unsafeCompleteDeferred } from "@effect-ts/core/io/Queue/operations/_internal/unsafeCompleteDeferred";
import { unsafeOfferAll } from "@effect-ts/core/io/Queue/operations/_internal/unsafeOfferAll";
import { unsafePollAll } from "@effect-ts/core/io/Queue/operations/_internal/unsafePollAll";
import type { Strategy } from "@effect-ts/core/io/Queue/operations/strategy";

export function unsafeCompleteTakers<A>(
  strategy: Strategy<A>,
  queue: MutableQueue<A>,
  takers: MutableQueue<Deferred<never, A>>
): void {
  // Check both a taker and an item are in the queue, starting with the taker
  let keepPolling = true;

  while (keepPolling && !queue.isEmpty) {
    const taker = takers.poll(EmptyMutableQueue);

    if (taker !== EmptyMutableQueue) {
      const element = queue.poll(EmptyMutableQueue);

      if (element !== EmptyMutableQueue) {
        unsafeCompleteDeferred(taker, element);
        strategy.unsafeOnQueueEmptySpace(queue, takers);
      } else {
        unsafeOfferAll(takers, unsafePollAll(takers).prepend(taker));
      }

      keepPolling = true;
    } else {
      keepPolling = false;
    }
  }
}
