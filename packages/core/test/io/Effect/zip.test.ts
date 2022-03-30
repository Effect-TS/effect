import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Either } from "../../../src/data/Either"
import { Option } from "../../../src/data/Option"
import type { UIO } from "../../../src/io/Effect"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { Promise } from "../../../src/io/Promise"
import { Ref } from "../../../src/io/Ref"

describe("Effect", () => {
  describe("zipFlatten", () => {
    it("is compositional", async () => {
      const program =
        Effect.succeed(1) + Effect.unit + Effect.succeed("test") + Effect.succeed(true)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Tuple(1, undefined, "test", true))
    })
  })

  describe("zipPar", () => {
    it("does not swallow exit causes of loser", async () => {
      const program = Effect.interrupt.zipPar(Effect.interrupt)

      const result = await program.unsafeRunPromiseExit()

      expect(
        result.causeOption().map((cause) => cause.interruptors().size > 0)
      ).toEqual(Option.some(true))
    })

    it("does not report failure when interrupting loser after it succeeded", async () => {
      const program = Effect.interrupt
        .zipPar(Effect.succeed(1))
        .sandbox()
        .either()
        .map((either) => either.mapLeft((cause) => cause.isInterrupted()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(true))
    })

    it("passes regression 1", async () => {
      const program = Effect.succeed(1)
        .zipPar(Effect.succeed(2))
        .flatMap((tuple) => Effect.succeed(tuple.get(0) + tuple.get(1)))
        .map((n) => n === 3)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("paralellizes simple success values", async () => {
      function countdown(n: number): UIO<number> {
        return n === 0
          ? Effect.succeed(0)
          : Effect.succeed(1)
              .zipPar(Effect.succeed(2))
              .flatMap((tuple) =>
                countdown(n - 1).map((y) => tuple.get(0) + tuple.get(1) + y)
              )
      }

      const result = await countdown(50).unsafeRunPromise()

      expect(result).toBe(150)
    })

    it("does not kill fiber when forked on parent scope", async () => {
      const program = Effect.Do()
        .bind("latch1", () => Promise.make<never, void>())
        .bind("latch2", () => Promise.make<never, void>())
        .bind("latch3", () => Promise.make<never, void>())
        .bind("ref", () => Ref.make(false))
        .bindValue("left", ({ latch1, latch2, latch3, ref }) =>
          Effect.uninterruptibleMask(
            ({ restore }) =>
              latch2.succeed(undefined) >
              restore(latch1.await() > Effect.succeed("foo")).onInterrupt(() =>
                ref.set(true)
              )
          )
        )
        .bindValue("right", ({ latch3 }) => latch3.succeed(undefined).as(42))
        .tap(({ latch1, latch2, latch3 }) =>
          (latch2.await() > latch3.await() > latch1.succeed(undefined)).fork()
        )
        .bind("result", ({ left, right }) => left.fork().zipPar(right))
        .bindValue("leftInnerFiber", ({ result }) => result.get(0))
        .bindValue("rightResult", ({ result }) => result.get(1))
        .bind("leftResult", ({ leftInnerFiber }) => leftInnerFiber.await())
        .bind("interrupted", ({ ref }) => ref.get)

      const { interrupted, leftResult, rightResult } = await program.unsafeRunPromise()

      expect(interrupted).toBe(false)
      expect(leftResult.untraced()).toEqual(Exit.succeed("foo"))
      expect(rightResult).toBe(42)
    })
  })
})
