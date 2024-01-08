import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("string > nonEmpty", () => {
  const schema = S.NonEmpty
  it("decoding", async () => {
    await Util.expectParseSuccess(schema, "a")
    await Util.expectParseSuccess(schema, "aa")

    await Util.expectParseFailure(
      schema,
      "",
      `NonEmpty
└─ Predicate refinement failure
   └─ Expected NonEmpty (a non empty string), actual ""`
    )
  })
})
