import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
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

describe("Schema > validate", () => {
  const schema = S.struct({ a: Util.NumberFromChar })

  it("should return Left on invalid values", async () => {
    await Util.expectEffectSuccess(S.validate(schema)({ a: 1 }), { a: 1 })
    await Util.expectEffectFailure(
      S.validate(schema)({ a: null }),
      `{ a: number }
└─ ["a"]
   └─ Expected a number, actual null`
    )
  })

  it("should respect outer/inner options", async () => {
    const input = { a: 1, b: "b" }
    await Util.expectEffectFailure(
      S.validate(schema)(input, { onExcessProperty: "error" }),
      `{ a: number }
└─ ["b"]
   └─ is unexpected, expected "a"`
    )
    await Util.expectEffectFailure(
      S.validate(schema, { onExcessProperty: "error" })(input),
      `{ a: number }
└─ ["b"]
   └─ is unexpected, expected "a"`
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
      const schema = S.struct({ a: Util.NumberFromChar })
      await expectValidateSuccess(schema, { a: 1 })
      await expectValidateFailure(
        schema,
        { a: null },
        `{ a: number }
└─ ["a"]
   └─ Expected a number, actual null`
      )
    })

    it("required property signature with undefined", async () => {
      const schema = S.struct({ a: S.union(S.number, S.undefined) })
      await expectValidateSuccess(schema, { a: 1 })
      await expectValidateSuccess(schema, { a: undefined })
      await expectValidateSuccess(schema, { a: 1, b: "b" }, { a: 1 })
      await expectValidateSuccess(schema, {}, { a: undefined })
      await expectValidateFailure(schema, null, `Expected { a: number | undefined }, actual null`)
      await expectValidateFailure(
        schema,
        { a: "a" },
        `{ a: number | undefined }
└─ ["a"]
   └─ number | undefined
      ├─ Union member
      │  └─ Expected a number, actual "a"
      └─ Union member
         └─ Expected undefined, actual "a"`
      )
    })
  })
})
