import {
  as,
  b,
  eventEq,
  eventOrd,
  eventPredicate
} from "@effect/core/test/stm/TPriorityQueue/test-utils"

describe.concurrent("TPriorityQueue", () => {
  describe.concurrent("retainIf", () => {
    it("retainIf", async () => {
      const program = TPriorityQueue.fromIterable(eventOrd)(as)
        .tap((queue) => queue.retainIf(eventPredicate))
        .flatMap((queue) => queue.toChunk)
        .commit

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.corresponds(Chunk.single(b), eventEq.equals))
    })
  })
})
