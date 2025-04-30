import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Symbol", () => {
  const schema = S.Symbol

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, "a", Symbol.for("a"))
    await Util.assertions.decoding.fail(
      schema,
      null,
      `Symbol
└─ Encoded side transformation failure
   └─ Expected string, actual null`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, Symbol.for("a"), "a")
    await Util.assertions.encoding.fail(
      schema,
      Symbol(),
      `Symbol
└─ Transformation process failure
   └─ Unable to encode a unique symbol Symbol() into a string`
    )
  })
})
