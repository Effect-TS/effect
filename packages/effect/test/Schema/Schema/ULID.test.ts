import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("ULID", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.ULID)
  })

  it("Decoder", async () => {
    const schema = S.ULID
    await Util.assertions.decoding.succeed(schema, "01H4PGGGJVN2DKP2K1H7EH996V")
    await Util.assertions.decoding.fail(
      schema,
      "",
      `ULID
└─ Predicate refinement failure
   └─ Expected a Universally Unique Lexicographically Sortable Identifier, actual ""`
    )
  })
})
