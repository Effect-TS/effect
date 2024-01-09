import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > parsePromise", () => {
  const schema = S.struct({ a: Util.NumberFromChar })

  it("should return None on invalid values", async () => {
    await Util.expectPromiseSuccess(S.parsePromise(schema)({ a: "1" }), { a: 1 })
    await Util.expectPromiseFailure(
      S.parsePromise(schema)({ a: "10" }),
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
    await Util.expectPromiseFailure(
      S.parsePromise(schema)(input, { onExcessProperty: "error" }),
      `{ a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected "a"`
    )
    await Util.expectPromiseFailure(
      S.parsePromise(schema, { onExcessProperty: "error" })(input),
      `{ a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected "a"`
    )
    await Util.expectPromiseSuccess(
      S.parsePromise(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }),
      {
        a: 1
      }
    )
  })
})
