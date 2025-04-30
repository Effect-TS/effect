import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

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
    await Util.assertions.encoding.succeed(schema, "a", "a")

    await Util.assertions.encoding.fail(
      schema,
      " ",
      `NonEmptyTrimmedString
└─ From side refinement failure
   └─ Trimmed
      └─ Predicate refinement failure
         └─ Expected a string with no leading or trailing whitespace, actual " "`
    )
    await Util.assertions.encoding.fail(
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
