import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("string > Uppercase", () => {
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
         └─ Expected Uppercased (an uppercase string), actual "a"`
    )
  })
})
