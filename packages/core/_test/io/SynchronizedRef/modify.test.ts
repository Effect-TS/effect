import { State } from "@effect/core/test/io/SynchronizedRef/test-utils"

const current = "value"
const update = "new value"
const failure = "failure"
const fatalError = ":-0"

describe.concurrent("SynchronizedRef", () => {
  describe.concurrent("modifyEffect", () => {
    it("happy path", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.Synchronized.make(current))
        .bind("v1", ({ ref }) => ref.modifyEffect(() => Effect.sync(["hello", update] as const)))
        .bind("v2", ({ ref }) => ref.get)

      const { v1, v2 } = await program.unsafeRunPromise()

      assert.strictEqual(v1, "hello")
      assert.strictEqual(v2, update)
    })

    it("with failure", async () => {
      const program = Ref.Synchronized.make(current).flatMap((ref) =>
        ref.modifyEffect(() => Effect.failSync(failure))
      )

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(failure))
    })
  })

  describe.concurrent("modifySomeEffect", () => {
    it("happy path", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.Synchronized.make<State>(State.Active))
        .bind(
          "r1",
          ({ ref }) =>
            ref.modifySomeEffect("state doesn't change", (state) =>
              state.isClosed()
                ? Maybe.some(Effect.sync(["changed", State.Changed] as const))
                : Maybe.none)
        )
        .bind("v1", ({ ref }) => ref.get)

      const { r1, v1 } = await program.unsafeRunPromise()

      assert.strictEqual(r1, "state doesn't change")
      assert.deepEqual(v1, State.Active)
    })

    it("twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.Synchronized.make<State>(State.Active))
        .bind(
          "r1",
          ({ ref }) =>
            ref.modifySomeEffect("state doesn't change", (state) =>
              state.isActive()
                ? Maybe.some(Effect.sync(["changed", State.Changed] as const))
                : Maybe.none)
        )
        .bind("v1", ({ ref }) => ref.get)
        .bind(
          "r2",
          ({ ref }) =>
            ref.modifySomeEffect("state doesn't change", (state) =>
              state.isActive()
                ? Maybe.some(Effect.sync(["changed", State.Changed] as const))
                : state.isChanged()
                ? Maybe.some(Effect.sync(["closed", State.Closed] as const))
                : Maybe.none)
        )
        .bind("v2", ({ ref }) => ref.get)

      const { r1, r2, v1, v2 } = await program.unsafeRunPromise()

      assert.strictEqual(r1, "changed")
      assert.deepEqual(v1, State.Changed)
      assert.strictEqual(r2, "closed")
      assert.deepEqual(v2, State.Closed)
    })

    it("with failure not triggered", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.Synchronized.make<State>(State.Active))
        .bind("r", ({ ref }) =>
          ref
            .modifySomeEffect("state doesn't change", (state) =>
              state.isClosed() ? Maybe.some(Effect.failSync(failure)) : Maybe.none)
            .orDieWith(() =>
              new Error()
            ))
        .bind("v", ({ ref }) => ref.get)

      const { r, v } = await program.unsafeRunPromise()

      assert.strictEqual(r, "state doesn't change")
      assert.deepEqual(v, State.Active)
    })

    it("with failure", async () => {
      const program = Ref.Synchronized.make<State>(State.Active).flatMap((ref) =>
        ref.modifySomeEffect(
          "state doesn't change",
          (state) => state.isActive() ? Maybe.some(Effect.failSync(failure)) : Maybe.none
        )
      )

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(failure))
    })

    it("with fatal error", async () => {
      const program = Ref.Synchronized.make<State>(State.Active).flatMap((ref) =>
        ref.modifySomeEffect(
          "state doesn't change",
          (state) => state.isActive() ? Maybe.some(Effect.dieMessage(fatalError)) : Maybe.none
        )
      )

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.isFailure() && result.cause.dieMaybe.isSome())
    })
  })
})
