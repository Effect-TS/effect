import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("string/UUID", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.UUID)
  })

  it("Decoder", async () => {
    const schema = S.UUID
    await Util.assertions.decoding.succeed(schema, "123e4567-e89b-12d3-a456-426614174000")
    await Util.assertions.decoding.fail(
      schema,
      "",
      `UUID
└─ Predicate refinement failure
   └─ Expected a Universally Unique Identifier, actual ""`
    )
  })
})
