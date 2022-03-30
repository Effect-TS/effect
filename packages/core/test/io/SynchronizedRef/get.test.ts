import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { Promise } from "../../../src/io/Promise"
import { SynchronizedRef } from "../../../src/io/Ref/Synchronized"
import { State } from "./test-utils"

const current = "value"
const update = "new value"
const failure = "failure"

describe("SynchronizedRef", () => {
  describe("simple", () => {
    it("get", async () => {
      const program = SynchronizedRef.make(current).flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(current)
    })
  })

  describe("getAndUpdateEffect", () => {
    it("happy path", async () => {
      const program = Effect.Do()
        .bind("ref", () => SynchronizedRef.make(current))
        .bind("v1", ({ ref }) => ref.getAndUpdateEffect(() => Effect.succeed(update)))
        .bind("v2", ({ ref }) => ref.get)

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe(current)
      expect(v2).toBe(update)
    })

    it("with failure", async () => {
      const program = SynchronizedRef.make(current).flatMap((ref) =>
        ref.getAndUpdateEffect(() => Effect.fail(failure))
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })
  })

  describe("getAndUpdateSomeEffect", () => {
    it("happy path", async () => {
      const program = Effect.Do()
        .bind("ref", () => SynchronizedRef.make<State>(State.Active))
        .bind("v1", ({ ref }) =>
          ref.getAndUpdateSomeEffect((state) =>
            state.isClosed() ? Option.some(Effect.succeed(State.Changed)) : Option.none
          )
        )
        .bind("v2", ({ ref }) => ref.get)

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual(State.Active)
      expect(v2).toEqual(State.Active)
    })

    it("twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => SynchronizedRef.make<State>(State.Active))
        .bind("v1", ({ ref }) =>
          ref.getAndUpdateSomeEffect((state) =>
            state.isActive() ? Option.some(Effect.succeed(State.Changed)) : Option.none
          )
        )
        .bind("v2", ({ ref }) =>
          ref.getAndUpdateSomeEffect((state) =>
            state.isClosed()
              ? Option.some(Effect.succeed(State.Active))
              : state.isChanged()
              ? Option.some(Effect.succeed(State.Closed))
              : Option.none
          )
        )
        .bind("v3", ({ ref }) => ref.get)

      const { v1, v2, v3 } = await program.unsafeRunPromise()

      expect(v1).toEqual(State.Active)
      expect(v2).toEqual(State.Changed)
      expect(v3).toEqual(State.Closed)
    })

    it("with failure", async () => {
      const program = SynchronizedRef.make<State>(State.Active).flatMap((ref) =>
        ref.getAndUpdateSomeEffect((state) =>
          state.isActive() ? Option.some(Effect.fail(failure)) : Option.none
        )
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })

    it("interrupt parent fiber and update", async () => {
      const program = Effect.Do()
        .bind("promise", () => Promise.make<never, SynchronizedRef<State>>())
        .bind("latch", () => Promise.make<never, void>())
        .bindValue(
          "makeAndWait",
          ({ latch, promise }) =>
            promise.complete(SynchronizedRef.make<State>(State.Active)) > latch.await()
        )
        .bind("fiber", ({ makeAndWait }) => makeAndWait.fork())
        .bind("ref", ({ promise }) => promise.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) =>
          ref.updateAndGetEffect(() => Effect.succeed(State.Closed))
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(State.Closed)
    })
  })
})
