import { State } from "@effect/core/test/io/SynchronizedRef/test-utils"

const current = "value"
const update = "new value"
const failure = "failure"

describe.concurrent("SynchronizedRef", () => {
  describe.concurrent("updateAndGetEffect", () => {
    it("happy path", async () => {
      const program = Ref.Synchronized.make(current).flatMap((ref) =>
        ref.updateAndGetEffect(() => Effect.sync(update))
      )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, update)
    })

    it("with failure", async () => {
      const program = Ref.Synchronized.make(current).flatMap((ref) =>
        ref.updateAndGetEffect(() => Effect.failSync(failure))
      )

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(failure))
    })
  })

  describe.concurrent("updateSomeAndGetEffect", () => {
    it("happy path", async () => {
      const program = Ref.Synchronized.make<State>(State.Active).flatMap((ref) =>
        ref.updateSomeAndGetEffect((state) =>
          state.isClosed() ? Maybe.some(Effect.sync(State.Changed)) : Maybe.none
        )
      )

      const result = await program.unsafeRunPromise()

      assert.deepEqual(result, State.Active)
    })

    it("twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.Synchronized.make<State>(State.Active))
        .bind(
          "v1",
          ({ ref }) =>
            ref.updateSomeAndGetEffect((state) =>
              state.isActive() ? Maybe.some(Effect.sync(State.Changed)) : Maybe.none
            )
        )
        .bind("v2", ({ ref }) =>
          ref.updateSomeAndGetEffect((state) =>
            state.isActive()
              ? Maybe.some(Effect.sync(State.Changed))
              : state.isChanged()
              ? Maybe.some(Effect.sync(State.Closed))
              : Maybe.none
          ))

      const { v1, v2 } = await program.unsafeRunPromise()

      assert.deepEqual(v1, State.Changed)
      assert.deepEqual(v2, State.Closed)
    })

    it("with failure", async () => {
      const program = Ref.Synchronized.make<State>(State.Active).flatMap((ref) =>
        ref.updateSomeAndGetEffect((state) =>
          state.isActive() ? Maybe.some(Effect.failSync(failure)) : Maybe.none
        )
      )

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(failure))
    })
  })
})
