import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("headNonEmpty", () => {
  it("decoding", async () => {
    const schema = S.headNonEmpty(S.NonEmptyArray(S.NumberFromString))
    await Util.assertions.decoding.succeed(schema, ["1"], 1)
    await Util.expectDecodeUnknownFailure(
      schema,
      ["a"],
      `(readonly [NumberFromString, ...NumberFromString[]] <-> number | number)
└─ Encoded side transformation failure
   └─ readonly [NumberFromString, ...NumberFromString[]]
      └─ [0]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Unable to decode "a" into a number`
    )
  })

  it("encoding", async () => {
    const schema = S.headNonEmpty(S.NonEmptyArray(S.NumberFromString))
    await Util.expectEncodeSuccess(schema, 1, ["1"])
  })
})
