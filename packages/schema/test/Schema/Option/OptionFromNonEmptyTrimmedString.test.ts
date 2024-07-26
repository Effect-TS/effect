import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import * as O from "effect/Option"
import { describe, it } from "vitest"

describe("OptionFromNonEmptyTrimmedString", () => {
  it("property tests", () => {
    Util.roundtrip(S.OptionFromNonEmptyTrimmedString)
  })

  it("decoding", async () => {
    const schema = S.OptionFromNonEmptyTrimmedString
    await Util.expectDecodeUnknownSuccess(schema, "", O.none())
    await Util.expectDecodeUnknownSuccess(schema, "a", O.some("a"))
    await Util.expectDecodeUnknownSuccess(schema, " ", O.none())
    await Util.expectDecodeUnknownSuccess(schema, " a ", O.some("a"))

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `(string <-> Option<NonEmptyTrimmedString>)
└─ Encoded side transformation failure
   └─ Expected string, actual null`
    )
  })

  it("encoding", async () => {
    const schema = S.OptionFromNonEmptyTrimmedString
    await Util.expectEncodeSuccess(schema, O.none(), "")
    await Util.expectEncodeSuccess(schema, O.some("a"), "a")

    await Util.expectEncodeFailure(
      schema,
      O.some(""),
      `(string <-> Option<NonEmptyTrimmedString>)
└─ Type side transformation failure
   └─ Option<NonEmptyTrimmedString>
      └─ NonEmptyTrimmedString
         └─ Predicate refinement failure
            └─ Expected NonEmptyTrimmedString, actual ""`
    )
  })
})
