import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("Lowercase", () => {
  it("property tests", () => {
    const schema = S.Lowercase
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    const schema = S.Lowercase
    await Util.expectDecodeUnknownSuccess(schema, "a", "a")
    await Util.expectDecodeUnknownSuccess(schema, "A ", "a ")
    await Util.expectDecodeUnknownSuccess(schema, " A ", " a ")
  })

  it("encoding", async () => {
    const schema = S.Lowercase
    await Util.expectEncodeSuccess(schema, "", "")
    await Util.expectEncodeSuccess(schema, "a", "a")

    await Util.expectEncodeFailure(
      schema,
      "A",
      `Lowercase
└─ Type side transformation failure
   └─ Lowercased
      └─ Predicate refinement failure
         └─ Expected a lowercase string, actual "A"`
    )
  })
})
