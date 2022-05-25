import type { Event } from "@effect/core/test/stm/TPriorityQueue/test-utils"
import { as, eventOrd } from "@effect/core/test/stm/TPriorityQueue/test-utils"

describe.concurrent("TPriorityQueue", () => {
  describe.concurrent("empty/nonEmpty", () => {
    it("isEmpty", async () => {
      const program = TPriorityQueue.empty<Event>(eventOrd)
        .tap((queue) => queue.offerAll(as))
        .flatMap((queue) => queue.isEmpty())
        .commit()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result === as.isEmpty())
    })

    it("isNonEmpty", async () => {
      const program = TPriorityQueue.empty<Event>(eventOrd)
        .tap((queue) => queue.offerAll(as))
        .flatMap((queue) => queue.isNonEmpty())
        .commit()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result === as.isNonEmpty())
    })
  })
})
