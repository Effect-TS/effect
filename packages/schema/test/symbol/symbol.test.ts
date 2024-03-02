import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("symbol > symbol", () => {
  const schema = S.symbol

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
   └─ Expected a string, actual null`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, Symbol.for("a"), "a")
    await Util.expectEncodeFailure(
      schema,
      Symbol(),
      `symbol
└─ Encoded side transformation failure
   └─ Expected a string, actual undefined`
    )
  })
})
