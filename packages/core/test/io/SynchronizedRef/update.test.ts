import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { SynchronizedRef } from "../../../src/io/Ref/Synchronized"
import { State } from "./test-utils"

const current = "value"
const update = "new value"
const failure = "failure"

describe("SynchronizedRef", () => {
  describe("updateAndGetEffect", () => {
    it("happy path", async () => {
      const program = SynchronizedRef.make(current).flatMap((ref) =>
        ref.updateAndGetEffect(() => Effect.succeed(update))
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("with failure", async () => {
      const program = SynchronizedRef.make(current).flatMap((ref) =>
        ref.updateAndGetEffect(() => Effect.fail(failure))
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })
  })

  describe("updateSomeAndGetEffect", () => {
    it("happy path", async () => {
      const program = SynchronizedRef.make<State>(State.Active).flatMap((ref) =>
        ref.updateSomeAndGetEffect((state) =>
          state.isClosed() ? Option.some(Effect.succeed(State.Changed)) : Option.none
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(State.Active)
    })

    it("twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => SynchronizedRef.make<State>(State.Active))
        .bind("v1", ({ ref }) =>
          ref.updateSomeAndGetEffect((state) =>
            state.isActive() ? Option.some(Effect.succeed(State.Changed)) : Option.none
          )
        )
        .bind("v2", ({ ref }) =>
          ref.updateSomeAndGetEffect((state) =>
            state.isActive()
              ? Option.some(Effect.succeed(State.Changed))
              : state.isChanged()
              ? Option.some(Effect.succeed(State.Closed))
              : Option.none
          )
        )

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual(State.Changed)
      expect(v2).toEqual(State.Closed)
    })

    it("with failure", async () => {
      const program = SynchronizedRef.make<State>(State.Active).flatMap((ref) =>
        ref.updateSomeAndGetEffect((state) =>
          state.isActive() ? Option.some(Effect.fail(failure)) : Option.none
        )
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })
  })
})
