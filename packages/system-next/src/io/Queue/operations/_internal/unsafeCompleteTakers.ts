import type { MutableQueue } from "../../../../support/MutableQueue"
import type { Promise } from "../../../Promise"
import type { Strategy } from "../strategy"
import { unsafeCompletePromise } from "./unsafeCompletePromise"
import { unsafeOfferAll } from "./unsafeOfferAll"
import { unsafePollAll } from "./unsafePollAll"

export function unsafeCompleteTakers<A>(
  strategy: Strategy<A>,
  queue: MutableQueue<A>,
  takers: MutableQueue<Promise<never, A>>
): void {
  // Check both a taker and an item are in the queue, starting with the taker
  let keepPolling = true

  while (keepPolling && !queue.isEmpty) {
    const taker = takers.poll(undefined)

    if (taker) {
      const element = queue.poll(undefined)

      if (element) {
        unsafeCompletePromise(taker, element)
        strategy.unsafeOnQueueEmptySpace(queue, takers)
      } else {
        unsafeOfferAll(takers, unsafePollAll(takers).prepend(taker))
      }

      keepPolling = true
    } else {
      keepPolling = false
    }
  }
}
