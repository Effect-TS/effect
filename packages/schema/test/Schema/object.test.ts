import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema/object", () => {
  const schema = S.Object
  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, {})
    await Util.expectDecodeUnknownSuccess(schema, [])
    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `Expected object (an object in the TypeScript meaning, i.e. the \`object\` type), actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "a",
      `Expected object (an object in the TypeScript meaning, i.e. the \`object\` type), actual "a"`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      1,
      `Expected object (an object in the TypeScript meaning, i.e. the \`object\` type), actual 1`
    )
    await Util.expectDecodeUnknownFailure(
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
