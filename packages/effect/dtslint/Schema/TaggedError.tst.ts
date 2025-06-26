import type { Unify } from "effect"
import { Effect, Schema } from "effect"
import { describe, expect, it } from "tstyche"

describe("Schema.TaggedError", () => {
  it("should be yieldable", () => {
    class Err extends Schema.TaggedError<Err>()("Err", {}) {}

    expect<Unify.Unify<Err>>().type.toBe<Err>()

    expect(Effect.gen(function*($) {
      return yield* $(new Err())
    })).type.toBe<Effect.Effect<never, Err>>()
  })

  it("make should respect custom constructors", () => {
    class MyError extends Schema.TaggedError<MyError>()(
      "MyError",
      { message: Schema.String }
    ) {
      constructor({ a, b }: { a: string; b: string }) {
        super({ message: `${a}:${b}` })
      }
    }

    expect(MyError.make({ a: "a", b: "b" }).message).type.toBe<string>()
    expect(new MyError({ a: "a", b: "b" }).message).type.toBe<string>()
  })

  it("Annotations as tuple", () => {
    // @ts-expect-error!
    class _A extends Schema.TaggedError<_A>()("A", { id: Schema.Number }, [
      undefined,
      undefined,
      {
        pretty: () => (x) => {
          expect(x).type.toBe<{ readonly _tag: "A"; readonly id: number }>()
          return ""
        }
      }
    ]) {}
  })
})
