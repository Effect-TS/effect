import { State } from "@effect/core/test/io/SynchronizedRef/test-utils"

const current = "value"
const update = "new value"
const failure = "failure"

describe.concurrent("SynchronizedRef", () => {
  describe.concurrent("updateAndGetEffect", () => {
    it("happy path", async () => {
      const program = SynchronizedRef.make(current).flatMap((ref) =>
        ref.updateAndGetEffect(() => Effect.succeed(update))
      )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, update)
    })

    it("with failure", async () => {
      const program = SynchronizedRef.make(current).flatMap((ref) => ref.updateAndGetEffect(() => Effect.fail(failure)))

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced() == Exit.fail(failure))
    })
  })

  describe.concurrent("updateSomeAndGetEffect", () => {
    it("happy path", async () => {
      const program = SynchronizedRef.make<State>(State.Active).flatMap((ref) =>
        ref.updateSomeAndGetEffect((state) =>
          state.isClosed() ? Option.some(Effect.succeed(State.Changed)) : Option.none
        )
      )

      const result = await program.unsafeRunPromise()

      assert.deepEqual(result, State.Active)
    })

    it("twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => SynchronizedRef.make<State>(State.Active))
        .bind(
          "v1",
          ({ ref }) =>
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
          ))

      const { v1, v2 } = await program.unsafeRunPromise()

      assert.deepEqual(v1, State.Changed)
      assert.deepEqual(v2, State.Closed)
    })

    it("with failure", async () => {
      const program = SynchronizedRef.make<State>(State.Active).flatMap((ref) =>
        ref.updateSomeAndGetEffect((state) => state.isActive() ? Option.some(Effect.fail(failure)) : Option.none)
      )

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced() == Exit.fail(failure))
    })
  })
})
