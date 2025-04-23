import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Negative", () => {
  const schema = S.Negative
  it("decoding", async () => {
    await Util.assertions.decoding.fail(
      schema,
      0,
      `Negative
└─ Predicate refinement failure
   └─ Expected a negative number, actual 0`
    )
    await Util.assertions.decoding.fail(
      schema,
      1,
      `Negative
└─ Predicate refinement failure
   └─ Expected a negative number, actual 1`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, -1, -1)
  })
})
