import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"
import { State } from "./test-utils"

const current = "value"
const update = "new value"

describe("Ref", () => {
  describe("update", () => {
    it("simple", async () => {
      const program = Ref.make(current)
        .tap((ref) => ref.update(() => update))
        .flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })
  })

  describe("updateAndGet", () => {
    it("simple", async () => {
      const program = Ref.make(current).flatMap((ref) => ref.updateAndGet(() => update))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })
  })

  describe("updateSome", () => {
    it("simple", async () => {
      const program = Ref.make<State>(State.Active)
        .tap((ref) =>
          ref.updateSome((state) =>
            state.isClosed() ? Option.some(State.Changed) : Option.none
          )
        )
        .flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(State.Active)
    })

    it("twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<State>(State.Active))
        .tap(({ ref }) =>
          ref.updateSome((state) =>
            state.isActive() ? Option.some(State.Changed) : Option.none
          )
        )
        .bind("v1", ({ ref }) => ref.get)
        .tap(({ ref }) =>
          ref.updateSome((state) =>
            state.isActive()
              ? Option.some(State.Changed)
              : state.isChanged()
              ? Option.some(State.Closed)
              : Option.none
          )
        )
        .bind("v2", ({ ref }) => ref.get)

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual(State.Changed)
      expect(v2).toEqual(State.Closed)
    })
  })

  describe("updateSomeAndGet", () => {
    it("simple", async () => {
      const program = Ref.make<State>(State.Active).flatMap((ref) =>
        ref.updateSomeAndGet((state) =>
          state.isClosed() ? Option.some(State.Changed) : Option.none
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(State.Active)
    })

    it("twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<State>(State.Active))
        .bind("v1", ({ ref }) =>
          ref.updateSomeAndGet((state) =>
            state.isActive() ? Option.some(State.Changed) : Option.none
          )
        )
        .bind("v2", ({ ref }) =>
          ref.updateSomeAndGet((state) =>
            state.isActive()
              ? Option.some(State.Changed)
              : state.isChanged()
              ? Option.some(State.Closed)
              : Option.none
          )
        )

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual(State.Changed)
      expect(v2).toEqual(State.Closed)
    })
  })
})
