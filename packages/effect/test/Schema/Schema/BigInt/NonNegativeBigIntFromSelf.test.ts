import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("NonNegativeBigIntFromSelf", () => {
  const schema = S.NonNegativeBigIntFromSelf

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, 0n)
    await Util.assertions.decoding.succeed(schema, 1n)
  })

  it("encoding", async () => {
    await Util.assertions.encoding.fail(
      schema,
      -1n,
      `NonNegativeBigintFromSelf
└─ Predicate refinement failure
   └─ Expected a non-negative bigint, actual -1n`
    )
  })
})
