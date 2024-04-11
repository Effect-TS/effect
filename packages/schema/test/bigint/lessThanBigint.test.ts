import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("bigint > lessThanBigInt", () => {
  const schema = S.bigintFromSelf.pipe(S.lessThanBigInt(0n))

  it("decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      schema,
      0n,
      `a negative bigint
└─ Predicate refinement failure
   └─ Expected a negative bigint, actual 0n`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      1n,
      `a negative bigint
└─ Predicate refinement failure
   └─ Expected a negative bigint, actual 1n`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, -1n, -1n)
  })
})
