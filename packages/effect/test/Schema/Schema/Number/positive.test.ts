import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Positive", () => {
  const schema = S.Positive
  it("decoding", async () => {
    await Util.assertions.decoding.fail(
      schema,
      -1,
      `Positive
└─ Predicate refinement failure
   └─ Expected a positive number, actual -1`
    )
    await Util.assertions.decoding.fail(
      schema,
      0,
      `Positive
└─ Predicate refinement failure
   └─ Expected a positive number, actual 0`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, 1, 1)
  })
})
