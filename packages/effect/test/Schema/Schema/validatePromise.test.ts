import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { deepStrictEqual } from "effect/test/util"

describe("validatePromise", () => {
  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should return None on invalid values", async () => {
    deepStrictEqual(await S.validatePromise(schema)({ a: 1 }), { a: 1 })

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
