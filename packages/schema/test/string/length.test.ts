import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("string > length", () => {
  it("decoding", async () => {
    const schema = S.string.pipe(S.length(1), S.identifier("Char"))
    await Util.expectParseSuccess(schema, "a")

    await Util.expectParseFailure(
      schema,
      "",
      `Char
└─ Predicate refinement failure
   └─ Expected a character, actual ""`
    )
    await Util.expectParseFailure(
      schema,
      "aa",
      `Char
└─ Predicate refinement failure
   └─ Expected a character, actual "aa"`
    )
  })
})
