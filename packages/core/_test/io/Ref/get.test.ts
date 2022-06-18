import { State } from "@effect/core/test/io/Ref/test-utils"

const current = "value"
const update = "new value"

describe.concurrent("Ref", () => {
  describe.concurrent("get", () => {
    it("simple", async () => {
      const program = Ref.make(current).flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, current)
    })
  })

  describe.concurrent("getAndSet", () => {
    it("simple", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(current))
        .bind("v1", ({ ref }) => ref.getAndSet(update))
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      assert.strictEqual(v1, current)
      assert.strictEqual(v2, update)
    })
  })

  describe.concurrent("getAndUpdate", () => {
    it("simple", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(current))
        .bind("v1", ({ ref }) => ref.getAndUpdate(() => update))
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      assert.strictEqual(v1, current)
      assert.strictEqual(v2, update)
    })
  })

  describe.concurrent("getAndUpdateSome", () => {
    it("simple", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<State>(State.Active))
        .bind(
          "v1",
          ({ ref }) => ref.getAndUpdateSome((state) => state.isClosed() ? Maybe.some(State.Changed) : Maybe.none)
        )
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      assert.strictEqual(v1, State.Active)
      assert.strictEqual(v2, State.Active)
    })

    it("twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<State>(State.Active))
        .bind(
          "v1",
          ({ ref }) => ref.getAndUpdateSome((state) => state.isActive() ? Maybe.some(State.Changed) : Maybe.none)
        )
        .bind("v2", ({ ref }) =>
          ref.getAndUpdateSome((state) =>
            state.isActive()
              ? Maybe.some(State.Changed)
              : state.isChanged()
              ? Maybe.some(State.Closed)
              : Maybe.none
          ))
        .bind("v3", ({ ref }) => ref.get())

      const { v1, v2, v3 } = await program.unsafeRunPromise()

      assert.strictEqual(v1, State.Active)
      assert.strictEqual(v2, State.Changed)
      assert.strictEqual(v3, State.Closed)
    })
  })
})
