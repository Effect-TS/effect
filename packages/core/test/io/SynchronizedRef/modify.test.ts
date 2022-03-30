import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { SynchronizedRef } from "../../../src/io/Ref/Synchronized"
import { State } from "./test-utils"

const current = "value"
const update = "new value"
const failure = "failure"
const fatalError = ":-0"

describe("SynchronizedRef", () => {
  describe("modifyEffect", () => {
    it("happy path", async () => {
      const program = Effect.Do()
        .bind("ref", () => SynchronizedRef.make(current))
        .bind("v1", ({ ref }) =>
          ref.modifyEffect(() => Effect.succeed(Tuple("hello", update)))
        )
        .bind("v2", ({ ref }) => ref.get)

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe("hello")
      expect(v2).toBe(update)
    })

    it("with failure", async () => {
      const program = SynchronizedRef.make(current).flatMap((ref) =>
        ref.modifyEffect(() => Effect.fail(failure))
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })
  })

  describe("modifySomeEffect", () => {
    it("happy path", async () => {
      const program = Effect.Do()
        .bind("ref", () => SynchronizedRef.make<State>(State.Active))
        .bind("r1", ({ ref }) =>
          ref.modifySomeEffect("state doesn't change", (state) =>
            state.isClosed()
              ? Option.some(Effect.succeed(Tuple("changed", State.Changed)))
              : Option.none
          )
        )
        .bind("v1", ({ ref }) => ref.get)

      const { r1, v1 } = await program.unsafeRunPromise()

      expect(r1).toBe("state doesn't change")
      expect(v1).toEqual(State.Active)
    })

    it("twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => SynchronizedRef.make<State>(State.Active))
        .bind("r1", ({ ref }) =>
          ref.modifySomeEffect("state doesn't change", (state) =>
            state.isActive()
              ? Option.some(Effect.succeed(Tuple("changed", State.Changed)))
              : Option.none
          )
        )
        .bind("v1", ({ ref }) => ref.get)
        .bind("r2", ({ ref }) =>
          ref.modifySomeEffect("state doesn't change", (state) =>
            state.isActive()
              ? Option.some(Effect.succeed(Tuple("changed", State.Changed)))
              : state.isChanged()
              ? Option.some(Effect.succeed(Tuple("closed", State.Closed)))
              : Option.none
          )
        )
        .bind("v2", ({ ref }) => ref.get)

      const { r1, r2, v1, v2 } = await program.unsafeRunPromise()

      expect(r1).toBe("changed")
      expect(v1).toEqual(State.Changed)
      expect(r2).toBe("closed")
      expect(v2).toEqual(State.Closed)
    })

    it("with failure not triggered", async () => {
      const program = Effect.Do()
        .bind("ref", () => SynchronizedRef.make<State>(State.Active))
        .bind("r", ({ ref }) =>
          ref
            .modifySomeEffect("state doesn't change", (state) =>
              state.isClosed() ? Option.some(Effect.fail(failure)) : Option.none
            )
            .orDieWith(() => new Error())
        )
        .bind("v", ({ ref }) => ref.get)

      const { r, v } = await program.unsafeRunPromise()

      expect(r).toBe("state doesn't change")
      expect(v).toEqual(State.Active)
    })

    it("with failure", async () => {
      const program = SynchronizedRef.make<State>(State.Active).flatMap((ref) =>
        ref.modifySomeEffect("state doesn't change", (state) =>
          state.isActive() ? Option.some(Effect.fail(failure)) : Option.none
        )
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })

    it("with fatal error", async () => {
      const program = SynchronizedRef.make<State>(State.Active).flatMap((ref) =>
        ref.modifySomeEffect("state doesn't change", (state) =>
          state.isActive() ? Option.some(Effect.dieMessage(fatalError)) : Option.none
        )
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.isFailure() && result.cause.dieOption().isSome()).toBe(true)
    })
  })
})
