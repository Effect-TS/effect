import * as os from "os"

import { List } from "../../../src/collection/immutable/List"
import { Duration } from "../../../src/data/Duration"
import { Option } from "../../../src/data/Option"
import type { HasClock } from "../../../src/io/Clock"
import type { RIO } from "../../../src/io/Effect"
import { Effect } from "../../../src/io/Effect"
import { Promise } from "../../../src/io/Promise"
import { Ref } from "../../../src/io/Ref"

describe("Effect", () => {
  describe("RTS asynchronous correctness", () => {
    it("simple async must return", async () => {
      const program = Effect.async((cb) => {
        cb(Effect.succeed(42))
      })

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("simple asyncEffect must return", async () => {
      const program = Effect.asyncEffect((cb) => Effect.succeed(cb(Effect.succeed(42))))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("deep asyncEffect doesn't block", async () => {
      function asyncIO(cont: RIO<HasClock, number>): RIO<HasClock, number> {
        return Effect.asyncEffect(
          (cb) =>
            Effect.sleep(Duration(5)) > cont > Effect.succeed(cb(Effect.succeed(42)))
        )
      }

      function stackIOs(count: number): RIO<HasClock, number> {
        return count < 0 ? Effect.succeed(42) : asyncIO(stackIOs(count - 1))
      }

      const procNum = Effect.succeed(os.cpus().length)

      const program = procNum.flatMap((procNum) => stackIOs(procNum))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(42)
    })

    it("interrupt of asyncEffect register", async () => {
      const program = Effect.Do()
        .bind("release", () => Promise.make<never, void>())
        .bind("acquire", () => Promise.make<never, void>())
        .bind("fiber", ({ acquire, release }) =>
          Effect.asyncEffect(() =>
            // This will never complete because we never call the callback
            Effect.acquireReleaseWithDiscard(
              acquire.succeed(undefined),
              Effect.never,
              release.succeed(undefined)
            )
          )
            .disconnect()
            .fork()
        )
        .tap(({ acquire }) => acquire.await())
        .tap(({ fiber }) => fiber.interruptFork())
        .flatMap(({ release }) => release.await())

      const result = await program.unsafeRunPromise()

      expect(result).toBeUndefined()
    })

    it("async should not resume fiber twice after interruption", async () => {
      const program = Effect.Do()
        .bind("step", () => Promise.make<never, void>())
        .bind("unexpectedPlace", () => Ref.make(List.empty<number>()))
        .bind("runtime", () => Effect.runtime())
        .bind("fork", ({ runtime, step, unexpectedPlace }) =>
          Effect.async<unknown, never, void>((cb) =>
            runtime.unsafeRunAsync(
              step.await() >
                Effect.succeed(cb(unexpectedPlace.update((list) => list.prepend(1))))
            )
          )
            .ensuring(
              Effect.async<unknown, never, void>(() => {
                // The callback is never called so this never completes
                runtime.unsafeRunAsync(step.succeed(undefined))
              })
            )
            .ensuring(unexpectedPlace.update((list) => list.prepend(2)))
            .forkDaemon()
        )
        .bind("result", ({ fork }) => fork.interrupt().timeout(Duration.fromSeconds(1)))
        .bind("unexpected", ({ unexpectedPlace }) => unexpectedPlace.get)

      const { result, unexpected } = await program.unsafeRunPromise()

      expect(unexpected).toEqual(List.empty())
      expect(result).toEqual(Option.none) // the timeout should happen
    })

    it("asyncMaybe should not resume fiber twice after synchronous result", async () => {
      const program = Effect.Do()
        .bind("step", () => Promise.make<never, void>())
        .bind("unexpectedPlace", () => Ref.make(List.empty<number>()))
        .bind("runtime", () => Effect.runtime())
        .bind("fork", ({ runtime, step, unexpectedPlace }) =>
          Effect.asyncMaybe<unknown, never, void>((cb) => {
            runtime.unsafeRunAsync(
              step.await() >
                Effect.succeed(cb(unexpectedPlace.update((list) => list.prepend(1))))
            )
            return Option.some(Effect.unit)
          })
            .flatMap(() =>
              Effect.async<unknown, never, void>(() => {
                // The callback is never called so this never completes
                runtime.unsafeRunAsync(step.succeed(undefined))
              })
            )
            .ensuring(unexpectedPlace.update((list) => list.prepend(2)))
            .uninterruptible()
            .forkDaemon()
        )
        .bind("result", ({ fork }) => fork.interrupt().timeout(Duration.fromSeconds(1)))
        .bind("unexpected", ({ unexpectedPlace }) => unexpectedPlace.get)

      const { result, unexpected } = await program.unsafeRunPromise()

      expect(unexpected).toEqual(List.empty())
      expect(result).toEqual(Option.none) // timeout should happen
    })

    it("sleep 0 must return", async () => {
      const program = Effect.sleep(Duration(0))

      const result = await program.unsafeRunPromise()

      expect(result).toBeUndefined()
    })

    it("shallow bind of async chain", async () => {
      const program = List.range(0, 10).reduce(Effect.succeed(0), (acc, _) =>
        acc.flatMap((n) =>
          Effect.async((cb) => {
            cb(Effect.succeed(n + 1))
          })
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })

    it("asyncEffect can fail before registering", async () => {
      const program = Effect.asyncEffect((cb) => Effect.fail("ouch")).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toBe("ouch")
    })

    it("asyncEffect can defect before registering", async () => {
      const program = Effect.asyncEffect((cb) =>
        Effect.succeed(() => {
          throw new Error("ouch")
        })
      )
        .exit()
        .map((exit) =>
          exit.fold(
            (cause) => cause.defects().first.map((e) => (e as Error).message),
            () => Option.none
          )
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some("ouch"))
    })
  })
})
