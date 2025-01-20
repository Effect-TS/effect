import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("validatePromise", () => {
  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should return None on invalid values", async () => {
    expect(await S.validatePromise(schema)({ a: 1 })).toStrictEqual({ a: 1 })

    await Util.assertions.promise.fail(
      S.validatePromise(schema)({ a: null }),
      `{ readonly a: number }
└─ ["a"]
   └─ Expected number, actual null`
    )
  })

  it("should respect outer/inner options", async () => {
    const input = { a: 1, b: "b" }

    expect(await S.validatePromise(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }))
      .toStrictEqual({ a: 1 })

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
