import { Either } from "../../../src/data/Either"
import { Effect } from "../../../src/io/Effect"
import { Promise } from "../../../src/io/Promise"
import { Ref } from "../../../src/io/Ref"
import { Channel } from "../../../src/stream/Channel"

describe("Channel", () => {
  describe("interruptWhen", () => {
    describe("promise", () => {
      it("interrupts the current element", async () => {
        const program = Effect.Do()
          .bind("interrupted", () => Ref.make(false))
          .bind("latch", () => Promise.make<never, void>())
          .bind("halt", () => Promise.make<never, void>())
          .bind("started", () => Promise.make<never, void>())
          .bind("fiber", ({ halt, interrupted, latch, started }) =>
            Channel.fromEffect(
              (started.succeed(undefined) > latch.await()).onInterrupt(() =>
                interrupted.set(true)
              )
            )
              .interruptWhenPromise(halt)
              .runDrain()
              .fork()
          )
          .tap(({ halt, started }) => started.await() > halt.succeed(undefined))
          .tap(({ fiber }) => fiber.await())
          .flatMap(({ interrupted }) => interrupted.get)

        const result = await program.unsafeRunPromise()

        expect(result).toBe(true)
      })

      it("propagates errors", async () => {
        const program = Promise.make<string, never>()
          .tap((promise) => promise.fail("fail"))
          .flatMap((promise) =>
            (Channel.write(1) > Channel.fromEffect(Effect.never))
              .interruptWhen(promise.await())
              .runDrain()
              .either()
          )

        const result = await program.unsafeRunPromise()

        expect(result).toEqual(Either.left("fail"))
      })
    })

    describe("io", () => {
      it("interrupts the current element", async () => {
        const program = Effect.Do()
          .bind("interrupted", () => Ref.make(false))
          .bind("latch", () => Promise.make<never, void>())
          .bind("halt", () => Promise.make<never, void>())
          .bind("started", () => Promise.make<never, void>())
          .bind("fiber", ({ halt, interrupted, latch, started }) =>
            Channel.fromEffect(
              (started.succeed(undefined) > latch.await()).onInterrupt(() =>
                interrupted.set(true)
              )
            )
              .interruptWhen(halt.await())
              .runDrain()
              .fork()
          )
          .tap(({ halt, started }) => started.await() > halt.succeed(undefined))
          .tap(({ fiber }) => fiber.await())
          .flatMap(({ interrupted }) => interrupted.get)

        const result = await program.unsafeRunPromise()

        expect(result).toBe(true)
      })

      it("propagates errors", async () => {
        const program = Promise.make<string, never>()
          .tap((promise) => promise.fail("fail"))
          .flatMap((promise) =>
            Channel.fromEffect(Effect.never)
              .interruptWhen(promise.await())
              .runDrain()
              .either()
          )

        const result = await program.unsafeRunPromise()

        expect(result).toEqual(Either.left("fail"))
      })
    })
  })
})
