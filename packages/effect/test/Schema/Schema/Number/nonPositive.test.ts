import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("NonPositive", () => {
  const schema = S.NonPositive
  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, 0, 0)
    await Util.assertions.decoding.fail(
      schema,
      1,
      `NonPositive
└─ Predicate refinement failure
   └─ Expected a non-positive number, actual 1`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, -1, -1)
  })
})
