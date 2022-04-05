import { a, as, eventEq, eventOrd, eventPredicate } from "@effect-ts/core/test/stm/TPriorityQueue/test-utils";

describe.concurrent("TPriorityQueue", () => {
  describe.concurrent("removeIf", () => {
    it("removeIf", async () => {
      const program = TPriorityQueue.from(eventOrd)(as)
        .tap((queue) => queue.removeIf(eventPredicate))
        .flatMap((queue) => queue.toChunk())
        .commit();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result.corresponds(Chunk.single(a), eventEq.equals));
    });
  });
});
