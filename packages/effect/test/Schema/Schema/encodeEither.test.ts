import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("encodeEither", () => {
  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should return Left on invalid values", () => {
    Util.expectEitherRight(S.encodeEither(schema)({ a: 1 }), { a: "1" })
    Util.expectEitherLeft(
      S.encodeEither(schema)({ a: 10 }),
      `{ readonly a: NumberFromChar }
└─ ["a"]
   └─ NumberFromChar
      └─ Encoded side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected a single character, actual "10"`
    )
  })

  it("should return Left on async", () => {
    Util.expectEitherLeft(
      S.encodeEither(Util.AsyncString)("a"),
      `AsyncString
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
    )
  })

  it("should respect outer/inner options", () => {
    const input = { a: 1, b: "b" }
    Util.expectEitherLeft(
      S.encodeEither(schema)(input, { onExcessProperty: "error" }),
      `{ readonly a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    Util.expectEitherLeft(
      S.encodeEither(schema, { onExcessProperty: "error" })(input),
      `{ readonly a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    Util.expectEitherRight(
      S.encodeEither(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }),
      { a: "1" }
    )
  })
})
