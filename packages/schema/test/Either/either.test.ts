import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as E from "effect/Either"
import { describe, it } from "vitest"

describe("Either/either", () => {
  it("property tests", () => {
    Util.roundtrip(S.either(S.string, S.number))
  })

  it("decoding", async () => {
    const schema = S.either(S.string, S.NumberFromString)
    await Util.expectParseSuccess(
      schema,
      JSON.parse(JSON.stringify(E.left("a"))),
      E.left("a")
    )
    await Util.expectParseSuccess(
      schema,
      JSON.parse(JSON.stringify(E.right("1"))),
      E.right(1)
    )
  })

  it("encoding", async () => {
    const schema = S.either(S.string, S.NumberFromString)
    await Util.expectEncodeSuccess(schema, E.left("a"), { _tag: "Left", left: "a" })
    await Util.expectEncodeSuccess(schema, E.right(1), { _tag: "Right", right: "1" })
  })
})
