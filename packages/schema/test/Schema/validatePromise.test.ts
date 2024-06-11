import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("validatePromise", () => {
  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should return None on invalid values", async () => {
    await Util.expectPromiseSuccess(S.validatePromise(schema)({ a: 1 }), { a: 1 })
    await Util.expectPromiseFailure(
      S.validatePromise(schema)({ a: null }),
      `{ readonly a: number }
└─ ["a"]
   └─ Expected number, actual null`
    )
  })

  it("should respect outer/inner options", async () => {
    const input = { a: 1, b: "b" }
    await Util.expectPromiseFailure(
      S.validatePromise(schema)(input, { onExcessProperty: "error" }),
      `{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    await Util.expectPromiseFailure(
      S.validatePromise(schema, { onExcessProperty: "error" })(input),
      `{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    await Util.expectPromiseSuccess(
      S.validatePromise(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }),
      {
        a: 1
      }
    )
  })
})
