import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("string/split", () => {
  it("split (data-last)", async () => {
    const schema = S.split(",")

    Util.assertions.testRoundtripConsistency(schema)

    // Decoding
    await Util.assertions.decoding.succeed(schema, "", [""])
    await Util.assertions.decoding.succeed(schema, ",", ["", ""])
    await Util.assertions.decoding.succeed(schema, "a", ["a"])
    await Util.assertions.decoding.succeed(schema, ",a", ["", "a"])
    await Util.assertions.decoding.succeed(schema, "a,", ["a", ""])
    await Util.assertions.decoding.succeed(schema, "a,b", ["a", "b"])

    // Encoding
    await Util.assertions.encoding.succeed(schema, [], "")
    await Util.assertions.encoding.succeed(schema, [""], "")
    await Util.assertions.encoding.succeed(schema, ["", ""], ",")
    await Util.assertions.encoding.succeed(schema, ["a"], "a")
    await Util.assertions.encoding.succeed(schema, ["", "a"], ",a")
    await Util.assertions.encoding.succeed(schema, ["a", ""], "a,")
    await Util.assertions.encoding.succeed(schema, ["a", "b"], "a,b")
  })
})
