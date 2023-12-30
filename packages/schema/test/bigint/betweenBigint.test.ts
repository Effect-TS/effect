import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("bigint > betweenBigint", () => {
  const schema = S.bigintFromSelf.pipe(S.betweenBigint(-1n, 1n), S.title("[-1n, -1n] interval"))

  it("decoding", async () => {
    await Util.expectParseSuccess(schema, 0n, 0n)
    await Util.expectParseFailure(
      schema,
      -2n,
      `[-1n, -1n] interval
└─ Predicate refinement failure
   └─ Expected a bigint between -1n and 1n, actual -2n`
    )
    await Util.expectParseFailure(
      schema,
      2n,
      `[-1n, -1n] interval
└─ Predicate refinement failure
   └─ Expected a bigint between -1n and 1n, actual 2n`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1n, 1n)
  })
})
