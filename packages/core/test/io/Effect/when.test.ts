import { Either } from "../../../src/data/Either"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"

describe("Effect", () => {
  describe("when", () => {
    it("executes correct branch only", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .tap(({ ref }) => Effect.when(false, ref.set(1)))
        .bind("v1", ({ ref }) => ref.get)
        .tap(({ ref }) => Effect.when(true, ref.set(2)))
        .bind("v2", ({ ref }) => ref.get)
        .bindValue("failure", () => new Error("expected"))
        .tap(({ failure }) => Effect.when(false, Effect.fail(failure)))
        .bind("failed", ({ failure }) =>
          Effect.when(true, Effect.fail(failure)).either()
        )

      const { failed, failure, v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe(0)
      expect(v2).toBe(2)
      expect(failed).toEqual(Either.left(failure))
    })
  })

  describe("whenCase", () => {
    it("executes correct branch only", async () => {
      const v1 = Option.emptyOf<number>()
      const v2 = Option.some(0)
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .tap(({ ref }) =>
          Effect.whenCase(v1, (option) =>
            option._tag === "Some" ? Option.some(ref.set(true)) : Option.none
          )
        )
        .bind("res1", ({ ref }) => ref.get)
        .tap(({ ref }) =>
          Effect.whenCase(v2, (option) =>
            option._tag === "Some" ? Option.some(ref.set(true)) : Option.none
          )
        )
        .bind("res2", ({ ref }) => ref.get)

      const { res1, res2 } = await program.unsafeRunPromise()

      expect(res1).toBe(false)
      expect(res2).toBe(true)
    })
  })

  describe("whenCaseEffect", () => {
    it("executes condition effect and correct branch", async () => {
      const v1 = Option.emptyOf<number>()
      const v2 = Option.some(0)
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .tap(({ ref }) =>
          Effect.whenCaseEffect(Effect.succeed(v1), (option) =>
            option._tag === "Some" ? Option.some(ref.set(true)) : Option.none
          )
        )
        .bind("res1", ({ ref }) => ref.get)
        .tap(({ ref }) =>
          Effect.whenCaseEffect(Effect.succeed(v2), (option) =>
            option._tag === "Some" ? Option.some(ref.set(true)) : Option.none
          )
        )
        .bind("res2", ({ ref }) => ref.get)

      const { res1, res2 } = await program.unsafeRunPromise()

      expect(res1).toBe(false)
      expect(res2).toBe(true)
    })
  })

  describe("whenEffect", () => {
    it("executes condition effect and correct branch", async () => {
      const program = Effect.Do()
        .bind("effectRef", () => Ref.make(0))
        .bind("conditionRef", () => Ref.make(0))
        .bindValue("conditionTrue", ({ conditionRef }) =>
          conditionRef.update((n) => n + 1).as(true)
        )
        .bindValue("conditionFalse", ({ conditionRef }) =>
          conditionRef.update((n) => n + 1).as(false)
        )
        .tap(({ conditionFalse, effectRef }) =>
          Effect.whenEffect(conditionFalse, effectRef.set(1))
        )
        .bind("v1", ({ effectRef }) => effectRef.get)
        .bind("c1", ({ conditionRef }) => conditionRef.get)
        .tap(({ conditionTrue, effectRef }) =>
          Effect.whenEffect(conditionTrue, effectRef.set(2))
        )
        .bind("v2", ({ effectRef }) => effectRef.get)
        .bind("c2", ({ conditionRef }) => conditionRef.get)
        .bindValue("failure", () => new Error("expected"))
        .tap(({ conditionFalse, failure }) =>
          Effect.whenEffect(conditionFalse, Effect.fail(failure))
        )
        .bind("failed", ({ conditionTrue, failure }) =>
          Effect.whenEffect(conditionTrue, Effect.fail(failure)).either()
        )

      const { c1, c2, failed, failure, v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe(0)
      expect(c1).toBe(1)
      expect(v2).toBe(2)
      expect(c2).toBe(2)
      expect(failed).toEqual(Either.left(failure))
    })
  })
})
