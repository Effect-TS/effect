import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

const expectValidateSuccess = async <A, I>(
  schema: S.Schema<A, I, never>,
  input: unknown,
  expected: A = input as any
) => Util.expectSuccess(S.validate(schema)(input), expected)

const expectValidateFailure = async <A, I>(
  schema: S.Schema<A, I, never>,
  input: unknown,
  message: string
) => Util.expectFailure(S.validate(schema)(input), message)

describe("validate", () => {
  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should return Left on invalid values", async () => {
    await Util.expectEffectSuccess(S.validate(schema)({ a: 1 }), { a: 1 })
    await Util.expectEffectFailure(
      S.validate(schema)({ a: null }),
      `{ readonly a: number }
└─ ["a"]
   └─ Expected number, actual null`
    )
  })

  it("should respect outer/inner options", async () => {
    const input = { a: 1, b: "b" }
    await Util.expectEffectFailure(
      S.validate(schema)(input, { onExcessProperty: "error" }),
      `{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    await Util.expectEffectFailure(
      S.validate(schema, { onExcessProperty: "error" })(input),
      `{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    await Util.expectEffectSuccess(
      S.validate(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }),
      {
        a: 1
      }
    )
  })

  describe("struct", () => {
    it("required property signature", async () => {
      const schema = S.Struct({ a: Util.NumberFromChar })
      await expectValidateSuccess(schema, { a: 1 })
      await expectValidateFailure(
        schema,
        { a: null },
        `{ readonly a: number }
└─ ["a"]
   └─ Expected number, actual null`
      )
    })

    it("required property signature with undefined", async () => {
      const schema = S.Struct({ a: S.Union(S.Number, S.Undefined) })
      await expectValidateSuccess(schema, { a: 1 })
      await expectValidateSuccess(schema, { a: undefined })
      await expectValidateSuccess(schema, { a: 1, b: "b" }, { a: 1 })
      await expectValidateSuccess(schema, {}, { a: undefined })
      await expectValidateFailure(schema, null, `Expected { readonly a: number | undefined }, actual null`)
      await expectValidateFailure(
        schema,
        { a: "a" },
        `{ readonly a: number | undefined }
└─ ["a"]
   └─ number | undefined
      ├─ Expected number, actual "a"
      └─ Expected undefined, actual "a"`
      )
    })
  })
})
