import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > parse", () => {
  const schema = S.struct({ a: Util.NumberFromChar })

  it("should return Left on invalid values", async () => {
    await Util.expectEffectSuccess(S.parse(schema)({ a: "1" }), { a: 1 })
    await Util.expectEffectFailure(
      S.parse(schema)({ a: "10" }),
      `{ a: NumberFromChar }
└─ ["a"]
   └─ NumberFromChar
      └─ From side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected Char (a single character), actual "10"`
    )
  })

  it("should respect outer/inner options", async () => {
    const input = { a: "1", b: "b" }
    await Util.expectEffectFailure(
      S.parse(schema)(input, { onExcessProperty: "error" }),
      `{ a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected "a"`
    )
    await Util.expectEffectFailure(
      S.parse(schema, { onExcessProperty: "error" })(input),
      `{ a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected "a"`
    )
    await Util.expectEffectSuccess(
      S.parse(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }),
      {
        a: 1
      }
    )
  })
})
