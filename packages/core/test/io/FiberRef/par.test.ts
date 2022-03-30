import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Effect } from "../../../src/io/Effect"
import { FiberRef } from "../../../src/io/FiberRef"
import { Promise } from "../../../src/io/Promise"
import { loseTimeAndCpu } from "./test-utils"

const initial = "initial"
const update = "update"
const update1 = "update1"
const update2 = "update2"

describe("FiberRef", () => {
  describe("zipPar", () => {
    it("the value of the loser is inherited in zipPar", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("latch", () => Promise.make<never, void>())
        .bindValue(
          "winner",
          ({ fiberRef, latch }) =>
            fiberRef.set(update1) > latch.succeed(undefined).asUnit()
        )
        .bindValue(
          "loser",
          ({ fiberRef, latch }) =>
            latch.await() > fiberRef.set(update2) > loseTimeAndCpu
        )
        .tap(({ loser, winner }) => winner.zipPar(loser))
        .flatMap(({ fiberRef }) => fiberRef.get())

      const value = await program.unsafeRunPromise()

      expect(value).toBe(update2)
    })

    it("nothing gets inherited with a failure in zipPar", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bindValue("success", ({ fiberRef }) => fiberRef.set(update))
        .bindValue("failure1", ({ fiberRef }) =>
          fiberRef.set(update).zipRight(Effect.failNow(":-("))
        )
        .bindValue("failure2", ({ fiberRef }) =>
          fiberRef.set(update).zipRight(Effect.failNow(":-O"))
        )
        .tap(({ failure1, failure2, success }) =>
          success.zipPar(failure1.zipPar(failure2)).orElse(Effect.unit)
        )
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toContain(initial)
    })
  })

  describe("collectAllPar", () => {
    it("the value of all fibers in inherited when running many effects with collectAllPar", async () => {
      const program = FiberRef.make(
        0,
        () => 0,
        (x, y) => x + y
      )
        .tap((fiberRef) =>
          Effect.collectAllPar(Chunk.fill(100000, () => fiberRef.update((n) => n + 1)))
        )
        .flatMap((fiberRef) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(100000)
    })
  })
})
