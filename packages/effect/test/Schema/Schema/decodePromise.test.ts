import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("decodePromise", () => {
  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should return None on invalid values", async () => {
    expect(await S.decodePromise(schema)({ a: "1" })).toStrictEqual({ a: 1 })

    await Util.assertions.promise.fail(
      S.decodePromise(schema)({ a: "10" }),
      `{ readonly a: NumberFromChar }
└─ ["a"]
   └─ NumberFromChar
      └─ Encoded side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected a single character, actual "10"`
    )
  })

  it("should respect outer/inner options", async () => {
    const input = { a: "1", b: "b" }

    expect(await S.decodePromise(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }))
      .toStrictEqual({ a: 1 })

    await Util.assertions.promise.fail(
      S.decodePromise(schema)(input, { onExcessProperty: "error" }),
      `{ readonly a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    await Util.assertions.promise.fail(
      S.decodePromise(schema, { onExcessProperty: "error" })(input),
      `{ readonly a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
  })
})
