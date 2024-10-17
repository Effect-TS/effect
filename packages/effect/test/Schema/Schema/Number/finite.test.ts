import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("Finite", () => {
  const schema = S.Finite

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, 1)
    await Util.expectDecodeUnknownFailure(
      schema,
      Infinity,
      `Finite
└─ Predicate refinement failure
   └─ Expected Finite, actual Infinity`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      -Infinity,
      `Finite
└─ Predicate refinement failure
   └─ Expected Finite, actual -Infinity`
    )
  })
})
