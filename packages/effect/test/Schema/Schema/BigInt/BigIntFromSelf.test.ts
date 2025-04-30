import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("BigIntFromSelf", () => {
  const schema = S.BigIntFromSelf
  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, 0n, 0n)
    await Util.assertions.decoding.succeed(schema, 1n, 1n)

    await Util.assertions.decoding.fail(
      schema,
      null,
      `Expected bigint, actual null`
    )
    await Util.assertions.decoding.fail(
      schema,
      1.2,
      `Expected bigint, actual 1.2`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, 1n, 1n)
  })
})
