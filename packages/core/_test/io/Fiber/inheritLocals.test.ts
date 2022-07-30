import { withLatch } from "@effect/core/test/test-utils/Latch"
import { constVoid } from "@tsplus/stdlib/data/Function"

const initial = "initial"
const update = "update"

describe.concurrent("Fiber", () => {
  describe.concurrent("inheritLocals works for Fiber created using:", () => {
    it("map", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        const child = $(withLatch((release) => fiberRef.set(update).zipRight(release).fork))
        $(child.map(constVoid).inheritRefs)
        const result = $(fiberRef.get)
        assert.strictEqual(result, update)
      }).scoped.unsafeRunPromise())

    it("orElse", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        const latch1 = $(Deferred.make<never, void>())
        const latch2 = $(Deferred.make<never, void>())
        const child1 = $(fiberRef.set("child1").zipRight(latch1.succeed(undefined)).fork)
        const child2 = $(fiberRef.set("child2").zipRight(latch2.succeed(undefined)).fork)
        $(latch1.await.zipRight(latch2.await))
        $(child1.orElse(child2).inheritRefs)
        const result = $(fiberRef.get)
        assert.strictEqual(result, "child1")
      }).scoped.unsafeRunPromise())

    it("zip", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        const latch1 = $(Deferred.make<never, void>())
        const latch2 = $(Deferred.make<never, void>())
        const child1 = $(fiberRef.set("child1").zipRight(latch1.succeed(undefined)).fork)
        const child2 = $(fiberRef.set("child2").zipRight(latch2.succeed(undefined)).fork)
        $(latch1.await.zipRight(latch2.await))
        $(child1.zip(child2).inheritRefs)
        const result = $(fiberRef.get)
        assert.strictEqual(result, "child1")
      }).scoped.unsafeRunPromise())
  })
})
