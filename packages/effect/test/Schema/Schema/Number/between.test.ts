import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("between", () => {
  const schema = S.Number.pipe(S.between(-1, 1)).annotations({
    title: "[-1, -1] interval"
  })
  it("decoding", async () => {
    await Util.assertions.decoding.fail(
      schema,
      -2,
      `[-1, -1] interval
└─ Predicate refinement failure
   └─ Expected a number between -1 and 1, actual -2`
    )
    await Util.assertions.decoding.succeed(schema, 0, 0)
    await Util.assertions.decoding.fail(
      schema,
      2,
      `[-1, -1] interval
└─ Predicate refinement failure
   └─ Expected a number between -1 and 1, actual 2`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, 1, 1)
  })
})
