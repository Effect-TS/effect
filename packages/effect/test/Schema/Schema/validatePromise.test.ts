import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import { ParseResult, Schema as S } from "effect"
import * as Util from "../TestUtils.js"

describe("validatePromise", () => {
  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should reject on invalid values", async () => {
    deepStrictEqual(await S.validatePromise(schema)({ a: 1 }), { a: 1 })
    deepStrictEqual(await ParseResult.validatePromise(schema)({ a: 1 }), { a: 1 })

    await Util.assertions.promise.fail(
      S.validatePromise(schema)({ a: null }),
      `{ readonly a: number }
└─ ["a"]
   └─ Expected number, actual null`
    )
  })

  it("should respect outer/inner options", async () => {
    const input = { a: 1, b: "b" }

    deepStrictEqual(
      await S.validatePromise(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }),
      { a: 1 }
    )

    await Util.assertions.promise.fail(
      S.validatePromise(schema)(input, { onExcessProperty: "error" }),
      `{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    await Util.assertions.promise.fail(
      S.validatePromise(schema, { onExcessProperty: "error" })(input),
      `{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
  })
})
