import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("NonNegative", () => {
  const schema = S.NonNegative
  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, 0, 0)
    await Util.assertions.decoding.succeed(schema, 1, 1)
  })

  it("encoding", async () => {
    await Util.assertions.encoding.fail(
      schema,
      -1,
      `NonNegative
└─ Predicate refinement failure
   └─ Expected a non-negative number, actual -1`
    )
  })
})
