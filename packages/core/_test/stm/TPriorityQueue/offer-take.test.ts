import type { Event } from "@effect/core/test/stm/TPriorityQueue/test-utils"
import { as, eventEq, eventOrd } from "@effect/core/test/stm/TPriorityQueue/test-utils"

describe.concurrent("TPriorityQueue", () => {
  it("offerAll and takeAll", async () => {
    const program = TPriorityQueue.empty<Event>(eventOrd)
      .tap((queue) => queue.offerAll(as))
      .flatMap((queue) => queue.takeAll())
      .commit()

    const result = await program.unsafeRunPromise()

    assert.isTrue(result.corresponds(as, eventEq.equals))
  })
})
