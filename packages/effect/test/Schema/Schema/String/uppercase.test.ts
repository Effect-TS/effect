import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("Uppercase", () => {
  it("test roundtrip consistency", () => {
    const schema = S.Uppercase
    Util.assertions.testRoundtripConsistency(schema)
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
         └─ Expected an uppercase string, actual "a"`
    )
  })
})
