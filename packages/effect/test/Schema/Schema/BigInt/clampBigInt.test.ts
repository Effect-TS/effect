import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("clampBigInt", () => {
  it("decoding", async () => {
    const schema = S.BigIntFromSelf.pipe(S.clampBigInt(-1n, 1n))

    await Util.assertions.decoding.succeed(schema, 3n, 1n)
    await Util.assertions.decoding.succeed(schema, 0n, 0n)
    await Util.assertions.decoding.succeed(schema, -3n, -1n)
  })
})
