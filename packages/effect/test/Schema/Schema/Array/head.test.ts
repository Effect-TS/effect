import * as Option from "effect/Option"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("head", () => {
  it("decoding", async () => {
    const schema = S.head(S.Array(S.NumberFromString))
    await Util.expectDecodeUnknownSuccess(schema, [], Option.none())
    await Util.expectDecodeUnknownSuccess(schema, ["1"], Option.some(1))
    await Util.expectDecodeUnknownFailure(
      schema,
      ["a"],
      `(ReadonlyArray<NumberFromString> <-> Option<number>)
└─ Encoded side transformation failure
   └─ ReadonlyArray<NumberFromString>
      └─ [0]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Expected NumberFromString, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = S.head(S.Array(S.NumberFromString))
    await Util.expectEncodeSuccess(schema, Option.none(), [])
    await Util.expectEncodeSuccess(schema, Option.some(1), ["1"])
  })
})
