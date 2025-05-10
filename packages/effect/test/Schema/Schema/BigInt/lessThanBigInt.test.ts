import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("lessThanBigInt", () => {
  const schema = S.BigIntFromSelf.pipe(S.lessThanBigInt(0n))

  it("decoding", async () => {
    await Util.assertions.decoding.fail(
      schema,
      0n,
      `lessThanBigInt(0)
└─ Predicate refinement failure
   └─ Expected a negative bigint, actual 0n`
    )
    await Util.assertions.decoding.fail(
      schema,
      1n,
      `lessThanBigInt(0)
└─ Predicate refinement failure
   └─ Expected a negative bigint, actual 1n`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, -1n, -1n)
  })
})
