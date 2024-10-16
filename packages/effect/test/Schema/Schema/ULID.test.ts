import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("ULID", () => {
  it("property tests", () => {
    Util.roundtrip(S.ULID)
  })

  it("Decoder", async () => {
    const schema = S.ULID
    await Util.expectDecodeUnknownSuccess(schema, "01H4PGGGJVN2DKP2K1H7EH996V")
    await Util.expectDecodeUnknownFailure(
      schema,
      "",
      `ULID
└─ Predicate refinement failure
   └─ Expected ULID, actual ""`
    )
  })
})
