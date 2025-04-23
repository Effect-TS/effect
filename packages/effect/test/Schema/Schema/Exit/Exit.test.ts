import { describe, it } from "@effect/vitest"
import { Cause, Exit, Schema as S } from "effect"
import * as Util from "../../TestUtils.js"

describe("Exit", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.Exit({ failure: S.String, success: S.Number, defect: S.Defect }))
  })

  it("decoding", async () => {
    const schema = S.Exit({ failure: S.String, success: S.Number, defect: S.Defect })
    await Util.assertions.decoding.succeed(
      schema,
      { _tag: "Failure", cause: { _tag: "Fail", error: "error" } },
      Exit.fail("error")
    )
    await Util.assertions.decoding.succeed(
      schema,
      { _tag: "Success", value: 123 },
      Exit.succeed(123)
    )
    await Util.assertions.decoding.fail(
      schema,
      { _tag: "Success", value: null },
      `(ExitEncoded<number, string, Defect> <-> Exit<number, string>)
└─ Encoded side transformation failure
   └─ ExitEncoded<number, string, Defect>
      └─ { readonly _tag: "Success"; readonly value: number }
         └─ ["value"]
            └─ Expected number, actual null`
    )
    await Util.assertions.decoding.fail(
      schema,
      { _tag: "Failure", cause: null },
      `(ExitEncoded<number, string, Defect> <-> Exit<number, string>)
└─ Encoded side transformation failure
   └─ ExitEncoded<number, string, Defect>
      └─ { readonly _tag: "Failure"; readonly cause: CauseEncoded<string> }
         └─ ["cause"]
            └─ Expected CauseEncoded<string>, actual null`
    )
  })

  describe("encoding", async () => {
    it("should raise an error when a non-encodable Cause is passed", async () => {
      const schema = S.Exit({ failure: S.String, success: S.Number, defect: Util.Defect })
      await Util.assertions.encoding.fail(
        schema,
        Exit.failCause(Cause.die(null)),
        `(ExitEncoded<number, string, (string <-> object)> <-> Exit<number, string>)
└─ Type side transformation failure
   └─ Exit<number, string>
      └─ Cause<string>
         └─ CauseEncoded<string>
            └─ { readonly _tag: "Die"; readonly defect: object }
               └─ ["defect"]
                  └─ Expected object, actual null`
      )
    })
  })

  it("using the built-in Defect schema as defect argument", async () => {
    const schema = S.Exit({ failure: S.String, success: S.Number, defect: S.Defect })
    await Util.assertions.encoding.succeed(schema, Exit.fail("error"), {
      _tag: "Failure",
      cause: { _tag: "Fail", error: "error" }
    })
    await Util.assertions.encoding.succeed(schema, Exit.succeed(123), { _tag: "Success", value: 123 })
  })
})
