import { as, eventEq, eventOrd } from "@effect/core/test/stm/TPriorityQueue/test-utils"

describe.concurrent("TPriorityQueue", () => {
  describe.concurrent("toChunk", () => {
    it("toChunk", async () => {
      const program = TPriorityQueue.from(eventOrd)(as)
        .flatMap((queue) => queue.toChunk)
        .commit

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.corresponds(as, eventEq.equals))
    })
  })
})
