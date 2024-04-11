import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("bigint > greaterThanBigInt", () => {
  const schema = S.bigintFromSelf.pipe(S.greaterThanBigInt(0n))

  it("decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      schema,
      -1n,
      `a positive bigint
└─ Predicate refinement failure
   └─ Expected a positive bigint, actual -1n`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      0n,
      `a positive bigint
└─ Predicate refinement failure
   └─ Expected a positive bigint, actual 0n`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1n, 1n)
  })
})
