import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Effect } from "../../../src/io/Effect"
import { Promise } from "../../../src/io/Promise"
import { Ref } from "../../../src/io/Ref"

describe("Promise", () => {
  describe("fail", () => {
    it("fail a promise using fail", async () => {
      const program = Effect.Do()
        .bind("promise", () => Promise.make<string, number>())
        .bind("success", ({ promise }) => promise.fail("error with fail"))
        .bind("result", ({ promise }) => promise.await().exit())

      const { result, success } = await program.unsafeRunPromise()

      expect(success).toBe(true)
      expect(result.isFailure()).toBe(true)
    })

    it("fail a promise using complete", async () => {
      const program = Effect.Do()
        .bind("promise", () => Promise.make<string, number>())
        .bind("ref", () => Ref.make(Chunk.from(["first error", "second error"])))
        .bind("success", ({ promise, ref }) =>
          promise.complete(
            ref.modify((as) => Tuple(as.unsafeHead(), as.unsafeTail())).flip()
          )
        )
        .bind("v1", ({ promise }) => promise.await().exit())
        .bind("v2", ({ promise }) => promise.await().exit())

      const { success, v1, v2 } = await program.unsafeRunPromise()

      expect(success).toBe(true)
      expect(v1.isFailure()).toBe(true)
      expect(v2.isFailure()).toBe(true)
    })

    it("fail a promise using completeWith", async () => {
      const program = Effect.Do()
        .bind("promise", () => Promise.make<string, number>())
        .bind("ref", () => Ref.make(Chunk.from(["first error", "second error"])))
        .bind("success", ({ promise, ref }) =>
          promise.completeWith(
            ref.modify((as) => Tuple(as.unsafeHead(), as.unsafeTail())).flip()
          )
        )
        .bind("v1", ({ promise }) => promise.await().exit())
        .bind("v2", ({ promise }) => promise.await().exit())

      const { success, v1, v2 } = await program.unsafeRunPromise()

      expect(success).toBe(true)
      expect(v1.isFailure()).toBe(true)
      expect(v2.isFailure()).toBe(true)
    })
  })
})
