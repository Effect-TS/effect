import * as Schema from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("TemplateLiteralParser", () => {
  it("decoding", async () => {
    const schema = Schema.TemplateLiteralParser(Schema.NumberFromString, "a", Schema.NonEmptyString)
    await Util.expectDecodeUnknownSuccess(schema, "100afoo", [100, "a", "foo"])
  })

  it("encoding", async () => {
    const schema = Schema.TemplateLiteralParser(Schema.NumberFromString, "a", Schema.NonEmptyString)
    await Util.expectEncodeSuccess(schema, [100, "a", "foo"], "100afoo")
  })
})
