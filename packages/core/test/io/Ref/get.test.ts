import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"
import { State } from "./test-utils"

const current = "value"
const update = "new value"

describe("Ref", () => {
  describe("get", () => {
    it("simple", async () => {
      const program = Ref.make(current).flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(current)
    })
  })

  describe("getAndSet", () => {
    it("simple", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(current))
        .bind("v1", ({ ref }) => ref.getAndSet(update))
        .bind("v2", ({ ref }) => ref.get)

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe(current)
      expect(v2).toBe(update)
    })
  })

  describe("getAndUpdate", () => {
    it("simple", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(current))
        .bind("v1", ({ ref }) => ref.getAndUpdate(() => update))
        .bind("v2", ({ ref }) => ref.get)

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe(current)
      expect(v2).toBe(update)
    })
  })

  describe("getAndUpdateSome", () => {
    it("simple", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<State>(State.Active))
        .bind("v1", ({ ref }) =>
          ref.getAndUpdateSome((state) =>
            state.isClosed() ? Option.some(State.Changed) : Option.none
          )
        )
        .bind("v2", ({ ref }) => ref.get)

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual(State.Active)
      expect(v2).toEqual(State.Active)
    })

    it("twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<State>(State.Active))
        .bind("v1", ({ ref }) =>
          ref.getAndUpdateSome((state) =>
            state.isActive() ? Option.some(State.Changed) : Option.none
          )
        )
        .bind("v2", ({ ref }) =>
          ref.getAndUpdateSome((state) =>
            state.isActive()
              ? Option.some(State.Changed)
              : state.isChanged()
              ? Option.some(State.Closed)
              : Option.none
          )
        )
        .bind("v3", ({ ref }) => ref.get)

      const { v1, v2, v3 } = await program.unsafeRunPromise()

      expect(v1).toEqual(State.Active)
      expect(v2).toEqual(State.Changed)
      expect(v3).toEqual(State.Closed)
    })
  })
})
