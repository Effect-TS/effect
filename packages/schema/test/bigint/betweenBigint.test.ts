import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("bigint > betweenBigInt", () => {
  const schema = S.bigintFromSelf.pipe(S.betweenBigInt(-1n, 1n)).annotations({
    title: "[-1n, -1n] interval"
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, 0n, 0n)
    await Util.expectDecodeUnknownFailure(
      schema,
      -2n,
      `[-1n, -1n] interval
└─ Predicate refinement failure
   └─ Expected a bigint between -1n and 1n, actual -2n`
    )
    await Util.expectDecodeUnknownFailure(
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
