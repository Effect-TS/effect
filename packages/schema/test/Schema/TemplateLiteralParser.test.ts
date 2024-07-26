import * as Schema from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("TemplateLiteralParser", () => {
  describe("string based schemas", () => {
    it("decoding", async () => {
      const schema = Schema.TemplateLiteralParser(Schema.NumberFromString, "a", Schema.NonEmptyString)
      await Util.expectDecodeUnknownSuccess(schema, "100ab", [100, "a", "b"])
      await Util.expectDecodeUnknownFailure(
        schema,
        "-ab",
        `(\`\${string}a\${string}\` <-> readonly [NumberFromString, "a", NonEmptyString])
└─ Type side transformation failure
   └─ readonly [NumberFromString, "a", NonEmptyString]
      └─ [0]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Expected NumberFromString, actual "-"`
      )
    })

    it("encoding", async () => {
      const schema = Schema.TemplateLiteralParser(Schema.NumberFromString, "a", Schema.Char)
      await Util.expectEncodeSuccess(schema, [100, "a", "b"], "100ab")
      await Util.expectEncodeFailure(
        schema,
        [100, "a", ""],
        `(\`\${string}a\${string}\` <-> readonly [NumberFromString, "a", Char])
└─ Type side transformation failure
   └─ readonly [NumberFromString, "a", Char]
      └─ [2]
         └─ Char
            └─ Predicate refinement failure
               └─ Expected Char, actual ""`
      )
    })
  })
})
