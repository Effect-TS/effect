import { withLatch } from "@effect/core/test/test-utils/Latch"
import { constVoid } from "@tsplus/stdlib/data/Function"

const initial = "initial"
const update = "update"

describe.concurrent("Fiber", () => {
  describe.concurrent("inheritLocals works for Fiber created using:", () => {
    it("map", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("child", ({ fiberRef }) => withLatch((release) => fiberRef.set(update).zipRight(release).fork))
        .tap(({ child }) => child.map(constVoid).inheritRefs)
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await Effect.scoped(program).unsafeRunPromise()

      assert.strictEqual(result, update)
    })

    it("orElse", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("latch1", () => Deferred.make<never, void>())
        .bind("latch2", () => Deferred.make<never, void>())
        .bind("child1", ({ fiberRef, latch1 }) => fiberRef.set("child1").zipRight(latch1.succeed(undefined)).fork)
        .bind("child2", ({ fiberRef, latch2 }) => fiberRef.set("child2").zipRight(latch2.succeed(undefined)).fork)
        .tap(({ latch1, latch2 }) => latch1.await().zipRight(latch2.await()))
        .tap(({ child1, child2 }) => (child1 | child2).inheritRefs)
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await Effect.scoped(program).unsafeRunPromise()

      assert.strictEqual(result, "child1")
    })

    it("zip", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("latch1", () => Deferred.make<never, void>())
        .bind("latch2", () => Deferred.make<never, void>())
        .bind("child1", ({ fiberRef, latch1 }) => fiberRef.set("child1").zipRight(latch1.succeed(undefined)).fork)
        .bind("child2", ({ fiberRef, latch2 }) => fiberRef.set("child2").zipRight(latch2.succeed(undefined)).fork)
        .tap(({ latch1, latch2 }) => latch1.await().zipRight(latch2.await()))
        .tap(({ child1, child2 }) => child1.zip(child2).inheritRefs)
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await Effect.scoped(program).unsafeRunPromise()

      assert.strictEqual(result, "child1")
    })
  })
})
