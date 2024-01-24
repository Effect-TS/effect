import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("string > ULID", () => {
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
   └─ Expected ULID (a Universally Unique Lexicographically Sortable Identifier), actual ""`
    )
  })
})
