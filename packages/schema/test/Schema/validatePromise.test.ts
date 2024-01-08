import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > validatePromise", () => {
  const schema = S.struct({ a: Util.NumberFromChar })

  it("should return None on invalid values", async () => {
    await Util.expectPromiseSuccess(S.validatePromise(schema)({ a: 1 }), { a: 1 })
    await Util.expectPromiseFailure(
      S.validatePromise(schema)({ a: null }),
      `{ a: number }
└─ ["a"]
   └─ Expected a number, actual null`
    )
  })

  it("should respect outer/inner options", async () => {
    const input = { a: 1, b: "b" }
    await Util.expectPromiseFailure(
      S.validatePromise(schema)(input, { onExcessProperty: "error" }),
      `{ a: number }
└─ ["b"]
   └─ is unexpected, expected "a"`
    )
    await Util.expectPromiseFailure(
      S.validatePromise(schema, { onExcessProperty: "error" })(input),
      `{ a: number }
└─ ["b"]
   └─ is unexpected, expected "a"`
    )
    await Util.expectPromiseSuccess(
      S.validatePromise(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }),
      {
        a: 1
      }
    )
  })
})
