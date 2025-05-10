import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("NegativeBigIntFromSelf", () => {
  const schema = S.NegativeBigIntFromSelf

  it("decoding", async () => {
    await Util.assertions.decoding.fail(
      schema,
      0n,
      `NegativeBigintFromSelf
└─ Predicate refinement failure
   └─ Expected a negative bigint, actual 0n`
    )
    await Util.assertions.decoding.fail(
      schema,
      1n,
      `NegativeBigintFromSelf
└─ Predicate refinement failure
   └─ Expected a negative bigint, actual 1n`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, -1n, -1n)
  })
})
