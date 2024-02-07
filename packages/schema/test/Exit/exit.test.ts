import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { Exit } from "effect"
import { describe, it } from "vitest"

describe("Exit > exit", () => {
  it("property tests", () => {
    Util.roundtrip(S.exit({ failure: S.string, success: S.number }))
  })

  it("decoding", async () => {
    const schema = S.exit({ failure: S.string, success: S.number })
    await Util.expectDecodeUnknownSuccess(
      schema,
      { _tag: "Failure", cause: { _tag: "Fail", error: "error" } },
      Exit.fail("error")
    )
    await Util.expectDecodeUnknownSuccess(
      schema,
      { _tag: "Success", value: 123 },
      Exit.succeed(123)
    )
  })

  it("encoding", async () => {
    const schema = S.exit({ failure: S.string, success: S.number })
    await Util.expectEncodeSuccess(schema, Exit.fail("error"), {
      _tag: "Failure",
      cause: { _tag: "Fail", error: "error" }
    })
    await Util.expectEncodeSuccess(schema, Exit.succeed(123), { _tag: "Success", value: 123 })
  })
})
