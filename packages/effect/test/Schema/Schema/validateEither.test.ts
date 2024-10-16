import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("validateEither", () => {
  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should return Left on invalid values", () => {
    Util.expectEitherRight(S.validateEither(schema)({ a: 1 }), { a: 1 })
    Util.expectEitherLeft(
      S.validateEither(schema)({ a: null }),
      `{ readonly a: number }
└─ ["a"]
   └─ Expected number, actual null`
    )
  })

  it("should return Left on async", () => {
    Util.expectEitherLeft(
      S.encodeEither(Util.AsyncDeclaration)("a"),
      `AsyncDeclaration
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
    )
  })

  it("should respect outer/inner options", () => {
    const input = { a: 1, b: "b" }
    Util.expectEitherLeft(
      S.validateEither(schema)(input, { onExcessProperty: "error" }),
      `{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    Util.expectEitherLeft(
      S.validateEither(schema, { onExcessProperty: "error" })(input),
      `{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    Util.expectEitherRight(
      S.validateEither(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }),
      { a: 1 }
    )
  })
})
