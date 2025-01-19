import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("object", () => {
  const schema = S.Object
  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, {})
    await Util.assertions.decoding.succeed(schema, [])
    await Util.assertions.decoding.fail(
      schema,
      null,
      `Expected object, actual null`
    )
    await Util.assertions.decoding.fail(
      schema,
      "a",
      `Expected object, actual "a"`
    )
    await Util.assertions.decoding.fail(
      schema,
      1,
      `Expected object, actual 1`
    )
    await Util.assertions.decoding.fail(
      schema,
      true,
      `Expected object, actual true`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, {}, {})
    await Util.expectEncodeSuccess(schema, [], [])
    await Util.expectEncodeSuccess(schema, [1, 2, 3], [1, 2, 3])
  })
})
