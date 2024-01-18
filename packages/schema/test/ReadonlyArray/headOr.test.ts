import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("ReadonlyArray > headOr", () => {
  it("decoding (without fallback)", async () => {
    const schema = S.headOr(S.array(S.NumberFromString))
    await Util.expectParseSuccess(schema, ["1"], 1)
    await Util.expectParseFailure(
      schema,
      [],
      `(ReadonlyArray<NumberFromString> <-> number)
└─ Transformation process failure
   └─ Expected (ReadonlyArray<NumberFromString> <-> number), actual []`
    )
    await Util.expectParseFailure(
      schema,
      ["a"],
      `(ReadonlyArray<NumberFromString> <-> number)
└─ From side transformation failure
   └─ ReadonlyArray<NumberFromString>
      └─ [0]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Expected NumberFromString, actual "a"`
    )
  })

  it("decoding (with fallback)", async () => {
    const schema = S.headOr(S.array(S.NumberFromString), () => 0)
    await Util.expectParseSuccess(schema, ["1"], 1)
    await Util.expectParseSuccess(schema, [], 0)
    await Util.expectParseFailure(
      schema,
      ["a"],
      `(ReadonlyArray<NumberFromString> <-> number)
└─ From side transformation failure
   └─ ReadonlyArray<NumberFromString>
      └─ [0]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Expected NumberFromString, actual "a"`
    )
  })

  it("decoding (struct)", async () => {
    const schema = S.headOr(
      S.array(
        S.struct({
          id: S.string,
          data: S.parseJson()
        })
      )
    )
    await Util.expectParseSuccess(schema, [
      {
        id: "1",
        data: "{\"a\":\"a\"}"
      }
    ], { id: "1", data: { a: "a" } })
  })

  it("encoding", async () => {
    const schema = S.headOr(S.array(S.number))
    await Util.expectEncodeSuccess(schema, 1, [1])
  })
})
