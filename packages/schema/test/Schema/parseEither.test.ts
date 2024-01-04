import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > parseEither", () => {
  const schema = S.struct({ a: Util.NumberFromChar })

  it("should return Left on invalid values", () => {
    Util.expectEitherRight(S.parseEither(schema)({ a: "1" }), { a: 1 })
    Util.expectEitherLeft(
      S.parseEither(schema)({ a: "10" }),
      `{ a: NumberFromChar }
└─ ["a"]
   └─ NumberFromChar
      └─ From side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected Char (a single character), actual "10"`
    )
  })

  it("should respect outer/inner options", () => {
    const input = { a: "1", b: "b" }
    Util.expectEitherLeft(
      S.parseEither(schema)(input, { onExcessProperty: "error" }),
      `{ a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected "a"`
    )
    Util.expectEitherLeft(
      S.parseEither(schema, { onExcessProperty: "error" })(input),
      `{ a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected "a"`
    )
    Util.expectEitherRight(
      S.parseEither(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }),
      { a: 1 }
    )
  })
})
