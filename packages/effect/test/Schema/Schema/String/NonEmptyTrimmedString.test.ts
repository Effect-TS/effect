import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("NonEmptyTrimmedString", () => {
  it("test roundtrip consistency", () => {
    const schema = S.NonEmptyTrimmedString
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    const schema = S.NonEmptyTrimmedString
    await Util.assertions.decoding.succeed(schema, "a", "a")

    await Util.assertions.decoding.fail(
      schema,
      " ",
      `NonEmptyTrimmedString
└─ From side refinement failure
   └─ Trimmed
      └─ Predicate refinement failure
         └─ Expected a string with no leading or trailing whitespace, actual " "`
    )
    await Util.assertions.decoding.fail(
      schema,
      " a ",
      `NonEmptyTrimmedString
└─ From side refinement failure
   └─ Trimmed
      └─ Predicate refinement failure
         └─ Expected a string with no leading or trailing whitespace, actual " a "`
    )
  })

  it("encoding", async () => {
    const schema = S.NonEmptyTrimmedString
    await Util.expectEncodeSuccess(schema, "a", "a")

    await Util.expectEncodeFailure(
      schema,
      " ",
      `NonEmptyTrimmedString
└─ From side refinement failure
   └─ Trimmed
      └─ Predicate refinement failure
         └─ Expected a string with no leading or trailing whitespace, actual " "`
    )
    await Util.expectEncodeFailure(
      schema,
      " a ",
      `NonEmptyTrimmedString
└─ From side refinement failure
   └─ Trimmed
      └─ Predicate refinement failure
         └─ Expected a string with no leading or trailing whitespace, actual " a "`
    )
  })
})
