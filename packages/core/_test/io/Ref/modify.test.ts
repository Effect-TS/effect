import { State } from "@effect/core/test/io/Ref/test-utils"

const current = "value"
const update = "new value"

describe.concurrent("Ref", () => {
  describe.concurrent("modify", () => {
    it("simple", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(current))
        .bind("v1", ({ ref }) => ref.modify(() => Tuple("hello", update)))
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      assert.strictEqual(v1, "hello")
      assert.strictEqual(v2, update)
    })
  })

  describe.concurrent("modifySome", () => {
    it("simple", async () => {
      const program = Ref.make<State>(State.Active).flatMap((ref) =>
        ref.modifySome(
          "state doesn't change",
          (state) => state.isClosed() ? Maybe.some(Tuple("active", State.Active)) : Maybe.none
        )
      )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "state doesn't change")
    })

    it("twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<State>(State.Active))
        .bind(
          "v1",
          ({ ref }) =>
            ref.modifySome("doesn't change the state", (state) =>
              state.isActive()
                ? Maybe.some(Tuple("changed", State.Changed))
                : Maybe.none)
        )
        .bind(
          "v2",
          ({ ref }) =>
            ref.modifySome("doesn't change the state", (state) =>
              state.isActive()
                ? Maybe.some(Tuple("changed", State.Changed))
                : state.isChanged()
                ? Maybe.some(Tuple("closed", State.Closed))
                : Maybe.none)
        )

      const { v1, v2 } = await program.unsafeRunPromise()

      assert.strictEqual(v1, "changed")
      assert.strictEqual(v2, "closed")
    })
  })
})
