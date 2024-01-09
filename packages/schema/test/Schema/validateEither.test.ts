import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > validateEither", () => {
  const schema = S.struct({ a: Util.NumberFromChar })

  it("should return Left on invalid values", () => {
    Util.expectEitherRight(S.validateEither(schema)({ a: 1 }), { a: 1 })
    Util.expectEitherLeft(
      S.validateEither(schema)({ a: null }),
      `{ a: number }
└─ ["a"]
   └─ Expected a number, actual null`
    )
  })

  it("should respect outer/inner options", () => {
    const input = { a: 1, b: "b" }
    Util.expectEitherLeft(
      S.validateEither(schema)(input, { onExcessProperty: "error" }),
      `{ a: number }
└─ ["b"]
   └─ is unexpected, expected "a"`
    )
    Util.expectEitherLeft(
      S.validateEither(schema, { onExcessProperty: "error" })(input),
      `{ a: number }
└─ ["b"]
   └─ is unexpected, expected "a"`
    )
    Util.expectEitherRight(
      S.validateEither(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }),
      { a: 1 }
    )
  })
})
