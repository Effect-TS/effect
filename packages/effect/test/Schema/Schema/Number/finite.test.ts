import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Finite", () => {
  const schema = S.Finite

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, 1)
    await Util.assertions.decoding.fail(
      schema,
      NaN,
      `Finite
└─ Predicate refinement failure
   └─ Expected a finite number, actual NaN`
    )
    await Util.assertions.decoding.fail(
      schema,
      Infinity,
      `Finite
└─ Predicate refinement failure
   └─ Expected a finite number, actual Infinity`
    )
    await Util.assertions.decoding.fail(
      schema,
      -Infinity,
      `Finite
└─ Predicate refinement failure
   └─ Expected a finite number, actual -Infinity`
    )
  })
})
