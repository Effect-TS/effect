import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import * as E from "effect/Exit"
import { describe, it } from "vitest"

describe("ExitFromSelf", () => {
  it("arbitrary", () => {
    Util.expectArbitrary(S.ExitFromSelf({ failure: S.String, success: S.Number }))
  })

  it("decoding", async () => {
    const schema = S.ExitFromSelf({ failure: S.NumberFromString, success: Util.BooleanFromLiteral })
    await Util.expectDecodeUnknownSuccess(schema, E.fail("1"), E.fail(1))
    await Util.expectDecodeUnknownSuccess(schema, E.succeed("true"), E.succeed(true))

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `Expected Exit<("true" | "false" <-> boolean), NumberFromString>, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      E.succeed(""),
      `Exit<("true" | "false" <-> boolean), NumberFromString>
└─ ("true" | "false" <-> boolean)
   └─ Encoded side transformation failure
      └─ "true" | "false"
         ├─ Expected "true", actual ""
         └─ Expected "false", actual ""`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      E.fail("a"),
      `Exit<("true" | "false" <-> boolean), NumberFromString>
└─ Cause<NumberFromString>
   └─ CauseEncoded<NumberFromString>
      └─ { readonly _tag: "Fail"; readonly error: NumberFromString }
         └─ ["error"]
            └─ NumberFromString
               └─ Transformation process failure
                  └─ Expected NumberFromString, actual "a"`
    )
  })
})
