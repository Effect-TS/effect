import { describe, it } from "@effect/vitest"
import * as Exit from "effect/Exit"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("ExitFromSelf", () => {
  it("arbitrary", () => {
    Util.assertions.arbitrary.validateGeneratedValues(
      S.ExitFromSelf({ failure: S.String, success: S.Number, defect: S.Unknown })
    )
  })

  it("decoding", async () => {
    const schema = S.ExitFromSelf({ failure: S.NumberFromString, success: S.BooleanFromString, defect: S.Unknown })
    await Util.assertions.decoding.succeed(schema, Exit.fail("1"), Exit.fail(1))
    await Util.assertions.decoding.succeed(schema, Exit.succeed("true"), Exit.succeed(true))

    await Util.assertions.decoding.fail(
      schema,
      null,
      `Expected Exit<BooleanFromString, NumberFromString>, actual null`
    )
    await Util.assertions.decoding.fail(
      schema,
      Exit.succeed(""),
      `Exit<BooleanFromString, NumberFromString>
└─ BooleanFromString
   └─ Encoded side transformation failure
      └─ a string to be decoded into a boolean
         ├─ Expected "true", actual ""
         └─ Expected "false", actual ""`
    )
    await Util.assertions.decoding.fail(
      schema,
      Exit.fail("a"),
      `Exit<BooleanFromString, NumberFromString>
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
      await Util.assertions.encoding.succeed(schema, Exit.die({ a: 1 }), Exit.die(`{"a":1}`))
    })
  })
})
