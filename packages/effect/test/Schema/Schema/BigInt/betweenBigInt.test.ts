import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("betweenBigInt", () => {
  const schema = S.BigIntFromSelf.pipe(S.betweenBigInt(-1n, 1n)).annotations({
    title: "[-1n, 1n] interval"
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, 0n, 0n)
    await Util.assertions.decoding.fail(
      schema,
      -2n,
      `[-1n, 1n] interval
└─ Predicate refinement failure
   └─ Expected a bigint between -1n and 1n, actual -2n`
    )
    await Util.assertions.decoding.fail(
      schema,
      2n,
      `[-1n, 1n] interval
└─ Predicate refinement failure
   └─ Expected a bigint between -1n and 1n, actual 2n`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, 1n, 1n)
  })
})
