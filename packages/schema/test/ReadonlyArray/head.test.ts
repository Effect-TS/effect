import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as Option from "effect/Option"
import { describe, it } from "vitest"

describe("ReadonlyArray > head", () => {
  it("decoding", async () => {
    const schema = S.head(S.array(S.NumberFromString))
    await Util.expectParseSuccess(schema, [], Option.none())
    await Util.expectParseSuccess(schema, ["1"], Option.some(1))
    await Util.expectParseFailure(
      schema,
      ["a"],
      `(ReadonlyArray<NumberFromString> <-> Option<number>)
└─ From side transformation failure
   └─ ReadonlyArray<NumberFromString>
      └─ [0]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Expected NumberFromString, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = S.head(S.array(S.NumberFromString))
    await Util.expectEncodeSuccess(schema, Option.none(), [])
    await Util.expectEncodeSuccess(schema, Option.some(1), ["1"])
  })
})
