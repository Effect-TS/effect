import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > encodePromise", () => {
  const schema = S.struct({ a: Util.NumberFromChar })

  it("should return None on invalid values", async () => {
    await Util.expectPromiseSuccess(S.encodePromise(schema)({ a: 1 }), { a: "1" })
    await Util.expectPromiseFailure(
      S.encodePromise(schema)({ a: 10 }),
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
    const input = { a: 1, b: "b" }
    await Util.expectPromiseFailure(
      S.encodePromise(schema)(input, { onExcessProperty: "error" }),
      `{ a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected "a"`
    )
    await Util.expectPromiseFailure(
      S.encodePromise(schema, { onExcessProperty: "error" })(input),
      `{ a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected "a"`
    )
    await Util.expectPromiseSuccess(
      S.encodePromise(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }),
      {
        a: "1"
      }
    )
  })
})
