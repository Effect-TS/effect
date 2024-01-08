import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema/object", () => {
  const schema = S.object
  it("decoding", async () => {
    await Util.expectParseSuccess(schema, {})
    await Util.expectParseSuccess(schema, [])
    await Util.expectParseFailure(
      schema,
      null,
      `Expected object (an object in the TypeScript meaning, i.e. the \`object\` type), actual null`
    )
    await Util.expectParseFailure(
      schema,
      "a",
      `Expected object (an object in the TypeScript meaning, i.e. the \`object\` type), actual "a"`
    )
    await Util.expectParseFailure(
      schema,
      1,
      `Expected object (an object in the TypeScript meaning, i.e. the \`object\` type), actual 1`
    )
    await Util.expectParseFailure(
      schema,
      true,
      `Expected object (an object in the TypeScript meaning, i.e. the \`object\` type), actual true`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, {}, {})
    await Util.expectEncodeSuccess(schema, [], [])
    await Util.expectEncodeSuccess(schema, [1, 2, 3], [1, 2, 3])
  })
})
