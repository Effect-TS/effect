import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"

describe("Effect", () => {
  describe("tapErrorCause", () => {
    it("effectually peeks at the cause of the failure of this effect", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("result", ({ ref }) =>
          Effect.dieMessage("die")
            .tapErrorCause(() => ref.set(true))
            .exit()
        )
        .bind("effect", ({ ref }) => ref.get)

      const { effect, result } = await program.unsafeRunPromise()

      expect(result.isFailure() && result.cause.dieOption().isSome()).toBe(true)
      expect(effect).toBe(true)
    })
  })

  describe("tapDefect", () => {
    it("effectually peeks at the cause of the failure of this effect", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("result", ({ ref }) =>
          Effect.dieMessage("die")
            .tapDefect(() => ref.set(true))
            .exit()
        )
        .bind("effect", ({ ref }) => ref.get)

      const { effect, result } = await program.unsafeRunPromise()

      expect(result.isFailure() && result.cause.dieOption().isSome()).toBe(true)
      expect(effect).toBe(true)
    })
  })

  describe("tapEither", () => {
    it("effectually peeks at the failure of this effect", async () => {
      const program = Ref.make(0)
        .tap((ref) =>
          Effect.fail(42)
            .tapEither((either) =>
              either.fold(
                (n) => ref.set(n),
                () => ref.set(-1)
              )
            )
            .exit()
        )
        .flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("effectually peeks at the success of this effect", async () => {
      const program = Ref.make(0)
        .tap((ref) =>
          Effect.succeed(42)
            .tapEither((either) =>
              either.fold(
                () => ref.set(-1),
                (n) => ref.set(n)
              )
            )
            .exit()
        )
        .flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })
  })

  describe("tapSome", () => {
    it("is identity if the function doesn't match", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("result", ({ ref }) => ref.set(true).as(42).tapSome(Option.emptyOf))
        .bind("effect", ({ ref }) => ref.get)

      const { effect, result } = await program.unsafeRunPromise()

      expect(result).toBe(42)
      expect(effect).toBe(true)
    })

    it("runs the effect if the function matches", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bind("result", ({ ref }) =>
          ref
            .set(10)
            .as(42)
            .tapSome((n) => Option.some(ref.set(n)))
        )
        .bind("effect", ({ ref }) => ref.get)

      const { effect, result } = await program.unsafeRunPromise()

      expect(result).toBe(42)
      expect(effect).toBe(42)
    })
  })
})
