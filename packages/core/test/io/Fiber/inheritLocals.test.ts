import { constVoid } from "../../../src/data/Function"
import { Effect } from "../../../src/io/Effect"
import { FiberRef } from "../../../src/io/FiberRef"
import { Promise } from "../../../src/io/Promise"
import { withLatch } from "../../test-utils/Latch"

const initial = "initial"
const update = "update"

describe("Fiber", () => {
  describe("inheritLocals works for Fiber created using:", () => {
    it("map", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("child", ({ fiberRef }) =>
          withLatch((release) => fiberRef.set(update).zipRight(release).fork())
        )
        .tap(({ child }) => child.map(constVoid).inheritRefs())
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("orElse", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("latch1", () => Promise.make<never, void>())
        .bind("latch2", () => Promise.make<never, void>())
        .bind("child1", ({ fiberRef, latch1 }) =>
          fiberRef.set("child1").zipRight(latch1.succeed(undefined)).fork()
        )
        .bind("child2", ({ fiberRef, latch2 }) =>
          fiberRef.set("child2").zipRight(latch2.succeed(undefined)).fork()
        )
        .tap(({ latch1, latch2 }) => latch1.await().zipRight(latch2.await()))
        .tap(({ child1, child2 }) => (child1 | child2).inheritRefs())
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe("child1")
    })

    it("zip", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("latch1", () => Promise.make<never, void>())
        .bind("latch2", () => Promise.make<never, void>())
        .bind("child1", ({ fiberRef, latch1 }) =>
          fiberRef.set("child1").zipRight(latch1.succeed(undefined)).fork()
        )
        .bind("child2", ({ fiberRef, latch2 }) =>
          fiberRef.set("child2").zipRight(latch2.succeed(undefined)).fork()
        )
        .tap(({ latch1, latch2 }) => latch1.await().zipRight(latch2.await()))
        .tap(({ child1, child2 }) => child1.zip(child2).inheritRefs())
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe("child1")
    })
  })
})
