import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, expect, it } from "vitest"

describe("optional", () => {
  it("should expose a from property", () => {
    const schema = S.optional(S.String)
    expect(schema.from).toStrictEqual(S.String)
  })

  it("should expose a from property after an annotations call", () => {
    const schema = S.optional(S.String).annotations({})
    expect(schema.from).toStrictEqual(S.String)
  })

  it("decoding / encoding", async () => {
    const schema = S.Struct({
      a: S.optional(S.NumberFromString)
    })
    await Util.expectDecodeUnknownSuccess(schema, {}, {})
    await Util.expectDecodeUnknownSuccess(schema, { a: undefined }, { a: undefined })
    await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
    await Util.expectDecodeUnknownFailure(
      schema,
      { a: "a" },
      `{ readonly a?: NumberFromString | undefined }
└─ ["a"]
   └─ NumberFromString | undefined
      ├─ NumberFromString
      │  └─ Transformation process failure
      │     └─ Expected NumberFromString, actual "a"
      └─ Expected undefined, actual "a"`
    )

    await Util.expectEncodeSuccess(schema, {}, {})
    await Util.expectEncodeSuccess(schema, { a: undefined }, { a: undefined })
    await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
  })
})
