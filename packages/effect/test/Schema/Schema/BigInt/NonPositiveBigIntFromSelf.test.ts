import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"

describe("NonPositiveBigIntFromSelf", () => {
  const schema = S.NonPositiveBigIntFromSelf

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, 0n)
    await Util.assertions.decoding.fail(
      schema,
      1n,
      `NonPositiveBigintFromSelf
└─ Predicate refinement failure
   └─ Expected a non-positive bigint, actual 1n`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, -1n, -1n)
  })
})
