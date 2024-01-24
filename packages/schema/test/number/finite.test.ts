import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("number > Finite", () => {
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
   └─ Expected Finite (a finite number), actual Infinity`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      -Infinity,
      `Finite
└─ Predicate refinement failure
   └─ Expected Finite (a finite number), actual -Infinity`
    )
  })
})
