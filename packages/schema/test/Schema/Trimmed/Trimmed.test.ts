import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("Trimmed", () => {
  it("decoding", async () => {
    const schema = S.Trimmed
    await Util.expectDecodeUnknownSuccess(schema, "a")
    await Util.expectDecodeUnknownSuccess(schema, "a b")

    await Util.expectDecodeUnknownFailure(
      schema,
      " a",
      `Trimmed
└─ Predicate refinement failure
   └─ Expected Trimmed (a string with no leading or trailing whitespace), actual " a"`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "a ",
      `Trimmed
└─ Predicate refinement failure
   └─ Expected Trimmed (a string with no leading or trailing whitespace), actual "a "`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      " a ",
      `Trimmed
└─ Predicate refinement failure
   └─ Expected Trimmed (a string with no leading or trailing whitespace), actual " a "`
    )
  })
})
