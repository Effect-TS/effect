import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("NonEmptyTrimmedString", () => {
  it("property tests", () => {
    const schema = S.NonEmptyTrimmedString
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    const schema = S.NonEmptyTrimmedString
    await Util.expectDecodeUnknownSuccess(schema, "a", "a")

    await Util.expectDecodeUnknownFailure(
      schema,
      " ",
      `NonEmptyTrimmedString
└─ From side refinement failure
   └─ Trimmed
      └─ Predicate refinement failure
         └─ Expected Trimmed, actual " "`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      " a ",
      `NonEmptyTrimmedString
└─ From side refinement failure
   └─ Trimmed
      └─ Predicate refinement failure
         └─ Expected Trimmed, actual " a "`
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
         └─ Expected Trimmed, actual " "`
    )
    await Util.expectEncodeFailure(
      schema,
      " a ",
      `NonEmptyTrimmedString
└─ From side refinement failure
   └─ Trimmed
      └─ Predicate refinement failure
         └─ Expected Trimmed, actual " a "`
    )
  })
})
