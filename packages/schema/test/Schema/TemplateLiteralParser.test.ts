import * as Schema from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("TemplateLiteralParser", () => {
  const schema = Schema.TemplateLiteralParser(Schema.NumberFromString, "a", Schema.NonEmptyString)

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, "100afoo", [100, "a", "foo"])
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, [100, "a", "foo"], "100afoo")
  })
})
