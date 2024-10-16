import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("Uppercase", () => {
  it("property tests", () => {
    const schema = S.Uppercase
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    const schema = S.Uppercase
    await Util.expectDecodeUnknownSuccess(schema, "A", "A")
    await Util.expectDecodeUnknownSuccess(schema, "a ", "A ")
    await Util.expectDecodeUnknownSuccess(schema, " a ", " A ")
  })

  it("encoding", async () => {
    const schema = S.Uppercase
    await Util.expectEncodeSuccess(schema, "", "")
    await Util.expectEncodeSuccess(schema, "A", "A")

    await Util.expectEncodeFailure(
      schema,
      "a",
      `Uppercase
└─ Type side transformation failure
   └─ Uppercased
      └─ Predicate refinement failure
         └─ Expected Uppercased, actual "a"`
    )
  })
})
