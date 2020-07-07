import { Promise } from "../Promise/promise"
import { MutableQueue } from "../Support/MutableQueue"

import { Strategy } from "./strategy"
import { unsafeCompletePromise } from "./unsafeCompletePromise"
import { unsafeOfferAll } from "./unsafeOfferAll"
import { unsafePollAll } from "./unsafePollAll"

export const unsafeCompleteTakers = <A>(
  strategy: Strategy<A>,
  queue: MutableQueue<A>,
  takers: MutableQueue<Promise<never, A>>
) => {
  let keepPolling = true

  while (keepPolling && !queue.isEmpty) {
    const taker = takers.poll(undefined)

    if (taker != null) {
      const element = queue.poll(undefined)

      if (element != null) {
        unsafeCompletePromise(taker, element)
        strategy.unsafeOnQueueEmptySpace(queue)
      } else {
        unsafeOfferAll(takers, [taker, ...unsafePollAll(takers)])
      }

      keepPolling = true
    } else {
      keepPolling = false
    }
  }
}
