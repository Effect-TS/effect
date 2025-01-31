import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { deepStrictEqual } from "effect/test/util"

describe("validateSync", () => {
  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should throw on invalid values", () => {
    deepStrictEqual(S.validateSync(schema)({ a: 1 }), { a: 1 })
    Util.assertions.parseError(
      () => S.validateSync(schema)({ a: null }),
      `{ readonly a: number }
└─ ["a"]
   └─ Expected number, actual null`
    )
  })

  it("should throw on async", () => {
    Util.assertions.parseError(
      () => S.validateSync(Util.AsyncDeclaration)("a"),
      `AsyncDeclaration
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
    )
  })

  it("should respect outer/inner options", () => {
    const input = { a: 1, b: "b" }
    Util.assertions.parseError(
      () => S.validateSync(schema)(input, { onExcessProperty: "error" }),
      `{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    Util.assertions.parseError(
      () => S.validateSync(schema, { onExcessProperty: "error" })(input),
      `{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    deepStrictEqual(S.validateSync(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }), {
      a: 1
    })
  })
})
