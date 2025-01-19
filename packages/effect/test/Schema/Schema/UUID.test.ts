import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("string/UUID", () => {
  it("property tests", () => {
    Util.assertions.roundtrip(S.UUID)
  })

  it("Decoder", async () => {
    const schema = S.UUID
    await Util.expectDecodeUnknownSuccess(schema, "123e4567-e89b-12d3-a456-426614174000")
    await Util.expectDecodeUnknownFailure(
      schema,
      "",
      `UUID
└─ Predicate refinement failure
   └─ Expected a Universally Unique Identifier, actual ""`
    )
  })
})
