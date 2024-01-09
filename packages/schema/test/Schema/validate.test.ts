import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > validate", () => {
  const schema = S.struct({ a: Util.NumberFromChar })

  it("should return Left on invalid values", async () => {
    await Util.expectEffectSuccess(S.validate(schema)({ a: 1 }), { a: 1 })
    await Util.expectEffectFailure(
      S.validate(schema)({ a: null }),
      `{ a: number }
└─ ["a"]
   └─ Expected a number, actual null`
    )
  })

  it("should respect outer/inner options", async () => {
    const input = { a: 1, b: "b" }
    await Util.expectEffectFailure(
      S.validate(schema)(input, { onExcessProperty: "error" }),
      `{ a: number }
└─ ["b"]
   └─ is unexpected, expected "a"`
    )
    await Util.expectEffectFailure(
      S.validate(schema, { onExcessProperty: "error" })(input),
      `{ a: number }
└─ ["b"]
   └─ is unexpected, expected "a"`
    )
    await Util.expectEffectSuccess(
      S.validate(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }),
      {
        a: 1
      }
    )
  })
})
