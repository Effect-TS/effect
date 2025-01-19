import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("validateEither", () => {
  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should return an error on invalid values", async () => {
    Util.assertions.either.succeed(S.validateEither(schema)({ a: 1 }), { a: 1 })
    await Util.assertions.either.fail(
      S.validateEither(schema)({ a: null }),
      `{ readonly a: number }
└─ ["a"]
   └─ Expected number, actual null`
    )
  })

  it("should return an error on async", async () => {
    await Util.assertions.either.fail(
      S.encodeEither(Util.AsyncDeclaration)("a"),
      `AsyncDeclaration
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
    )
  })

  it("should respect outer/inner options", async () => {
    const input = { a: 1, b: "b" }
    await Util.assertions.either.fail(
      S.validateEither(schema)(input, { onExcessProperty: "error" }),
      `{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    await Util.assertions.either.fail(
      S.validateEither(schema, { onExcessProperty: "error" })(input),
      `{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    Util.assertions.either.succeed(
      S.validateEither(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }),
      { a: 1 }
    )
  })
})
