import * as O from "effect/Option"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("OptionFromNonEmptyTrimmedString", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.OptionFromNonEmptyTrimmedString)
  })

  it("decoding", async () => {
    const schema = S.OptionFromNonEmptyTrimmedString
    await Util.assertions.decoding.succeed(schema, "", O.none())
    await Util.assertions.decoding.succeed(schema, "a", O.some("a"))
    await Util.assertions.decoding.succeed(schema, " ", O.none())
    await Util.assertions.decoding.succeed(schema, " a ", O.some("a"))

    await Util.assertions.decoding.fail(
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
            └─ Expected a non empty string, actual ""`
    )
  })
})
