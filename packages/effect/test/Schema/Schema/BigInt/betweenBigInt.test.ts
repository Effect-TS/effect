import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("betweenBigInt", () => {
  const schema = S.BigIntFromSelf.pipe(S.betweenBigInt(-1n, 1n)).annotations({
    title: "[-1n, 1n] interval"
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, 0n, 0n)
    await Util.expectDecodeUnknownFailure(
      schema,
      -2n,
      `[-1n, 1n] interval
└─ Predicate refinement failure
   └─ Expected a bigint between -1n and 1n, actual -2n`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      2n,
      `[-1n, 1n] interval
└─ Predicate refinement failure
   └─ Expected a bigint between -1n and 1n, actual 2n`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1n, 1n)
  })
})
