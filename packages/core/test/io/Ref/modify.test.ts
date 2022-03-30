import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"
import { State } from "./test-utils"

const current = "value"
const update = "new value"

describe("Ref", () => {
  describe("modify", () => {
    it("simple", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(current))
        .bind("v1", ({ ref }) => ref.modify(() => Tuple("hello", update)))
        .bind("v2", ({ ref }) => ref.get)

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe("hello")
      expect(v2).toBe(update)
    })
  })

  describe("modifySome", () => {
    it("simple", async () => {
      const program = Ref.make<State>(State.Active).flatMap((ref) =>
        ref.modifySome("state doesn't change", (state) =>
          state.isClosed() ? Option.some(Tuple("active", State.Active)) : Option.none
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual("state doesn't change")
    })

    it("twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<State>(State.Active))
        .bind("v1", ({ ref }) =>
          ref.modifySome("doesn't change the state", (state) =>
            state.isActive()
              ? Option.some(Tuple("changed", State.Changed))
              : Option.none
          )
        )
        .bind("v2", ({ ref }) =>
          ref.modifySome("doesn't change the state", (state) =>
            state.isActive()
              ? Option.some(Tuple("changed", State.Changed))
              : state.isChanged()
              ? Option.some(Tuple("closed", State.Closed))
              : Option.none
          )
        )

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe("changed")
      expect(v2).toBe("closed")
    })
  })
})
