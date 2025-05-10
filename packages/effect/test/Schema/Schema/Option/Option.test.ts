import { describe, it } from "@effect/vitest"
import * as O from "effect/Option"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Option", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.Option(S.Number))
  })

  it("decoding", async () => {
    const schema = S.Option(S.NumberFromString)
    await Util.assertions.decoding.succeed(schema, JSON.parse(JSON.stringify(O.none())), O.none())
    await Util.assertions.decoding.succeed(schema, JSON.parse(JSON.stringify(O.some("1"))), O.some(1))
  })

  it("encoding", async () => {
    const schema = S.Option(S.NumberFromString)
    await Util.assertions.encoding.succeed(schema, O.none(), { _tag: "None" })
    await Util.assertions.encoding.succeed(schema, O.some(1), { _tag: "Some", value: "1" })
  })
})
