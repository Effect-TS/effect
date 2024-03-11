import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("string > length", () => {
  it("decoding", async () => {
    const schema = S.string.pipe(S.length(1)).annotations({ identifier: "Char" })
    await Util.expectDecodeUnknownSuccess(schema, "a")

    await Util.expectDecodeUnknownFailure(
      schema,
      "",
      `Char
└─ Predicate refinement failure
   └─ Expected Char (a single character), actual ""`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "aa",
      `Char
└─ Predicate refinement failure
   └─ Expected Char (a single character), actual "aa"`
    )
  })
})
