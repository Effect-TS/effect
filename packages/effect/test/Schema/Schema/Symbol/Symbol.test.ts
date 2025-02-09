import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("Symbol", () => {
  const schema = S.Symbol

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, "a", Symbol.for("a"))
    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `symbol
└─ Encoded side transformation failure
   └─ Expected string, actual null`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, Symbol.for("a"), "a")
    await Util.expectEncodeFailure(
      schema,
      Symbol(),
      `symbol
└─ Encoded side transformation failure
   └─ Expected string, actual undefined`
    )
  })
})
