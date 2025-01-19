import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("Finite", () => {
  const schema = S.Finite

  it("property tests", () => {
    Util.assertions.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, 1)
    await Util.expectDecodeUnknownFailure(
      schema,
      NaN,
      `Finite
└─ Predicate refinement failure
   └─ Expected a finite number, actual NaN`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      Infinity,
      `Finite
└─ Predicate refinement failure
   └─ Expected a finite number, actual Infinity`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      -Infinity,
      `Finite
└─ Predicate refinement failure
   └─ Expected a finite number, actual -Infinity`
    )
  })
})
