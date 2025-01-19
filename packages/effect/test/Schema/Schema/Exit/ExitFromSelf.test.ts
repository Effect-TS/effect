import * as Exit from "effect/Exit"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("ExitFromSelf", () => {
  it("arbitrary", () => {
    Util.assertions.arbitrary.is(S.ExitFromSelf({ failure: S.String, success: S.Number, defect: S.Unknown }))
  })

  it("decoding", async () => {
    const schema = S.ExitFromSelf({ failure: S.NumberFromString, success: Util.BooleanFromLiteral, defect: S.Unknown })
    await Util.expectDecodeUnknownSuccess(schema, Exit.fail("1"), Exit.fail(1))
    await Util.expectDecodeUnknownSuccess(schema, Exit.succeed("true"), Exit.succeed(true))

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `Expected Exit<("true" | "false" <-> boolean), NumberFromString>, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      Exit.succeed(""),
      `Exit<("true" | "false" <-> boolean), NumberFromString>
└─ ("true" | "false" <-> boolean)
   └─ Encoded side transformation failure
      └─ "true" | "false"
         ├─ Expected "true", actual ""
         └─ Expected "false", actual ""`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      Exit.fail("a"),
      `Exit<("true" | "false" <-> boolean), NumberFromString>
└─ Cause<NumberFromString>
   └─ CauseEncoded<NumberFromString>
      └─ { readonly _tag: "Fail"; readonly error: NumberFromString }
         └─ ["error"]
            └─ NumberFromString
               └─ Transformation process failure
                  └─ Unable to decode "a" into a number`
    )
  })

  describe("encoding", async () => {
    it("should handle a defect schema", async () => {
      const schema = S.ExitFromSelf({
        success: S.Number,
        failure: S.String,
        defect: Util.Defect
      })
      await Util.expectEncodeSuccess(schema, Exit.die({ a: 1 }), Exit.die(`{"a":1}`))
    })
  })
})
