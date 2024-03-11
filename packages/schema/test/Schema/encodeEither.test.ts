import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > encodeEither", () => {
  const schema = S.struct({ a: Util.NumberFromChar })

  it("should return Left on invalid values", () => {
    Util.expectEitherRight(S.encodeEither(schema)({ a: 1 }), { a: "1" })
    Util.expectEitherLeft(
      S.encodeEither(schema)({ a: 10 }),
      `{ a: NumberFromChar }
└─ ["a"]
   └─ NumberFromChar
      └─ Encoded side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected Char (a single character), actual "10"`
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
      `{ a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected "a"`
    )
    Util.expectEitherLeft(
      S.encodeEither(schema, { onExcessProperty: "error" })(input),
      `{ a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected "a"`
    )
    Util.expectEitherRight(
      S.encodeEither(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }),
      { a: "1" }
    )
  })
})
