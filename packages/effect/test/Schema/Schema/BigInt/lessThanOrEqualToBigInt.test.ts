import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("lessThanOrEqualToBigInt", () => {
  const schema = S.BigIntFromSelf.pipe(S.lessThanOrEqualToBigInt(0n))

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, 0n, 0n)
    await Util.assertions.decoding.fail(
      schema,
      1n,
      `lessThanOrEqualToBigInt(0)
└─ Predicate refinement failure
   └─ Expected a non-positive bigint, actual 1n`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, -1n, -1n)
  })
})
