import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("encodePromise", () => {
  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should return None on invalid values", async () => {
    deepStrictEqual(await S.encodePromise(schema)({ a: 1 }), { a: "1" })

    await Util.assertions.promise.fail(
      S.encodePromise(schema)({ a: 10 }),
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
    const input = { a: 1, b: "b" }

    deepStrictEqual(
      await S.encodePromise(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }),
      { a: "1" }
    )

    await Util.assertions.promise.fail(
      S.encodePromise(schema)(input, { onExcessProperty: "error" }),
      `{ readonly a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    await Util.assertions.promise.fail(
      S.encodePromise(schema, { onExcessProperty: "error" })(input),
      `{ readonly a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
  })
})
