import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as O from "effect/Option"
import { describe, it } from "vitest"

describe("Option/option", () => {
  it("property tests", () => {
    Util.roundtrip(S.option(S.number))
  })

  it("decoding", async () => {
    const schema = S.option(S.NumberFromString)
    await Util.expectParseSuccess(schema, JSON.parse(JSON.stringify(O.none())), O.none())
    await Util.expectParseSuccess(schema, JSON.parse(JSON.stringify(O.some("1"))), O.some(1))
  })

  it("encoding", async () => {
    const schema = S.option(S.NumberFromString)
    await Util.expectEncodeSuccess(schema, O.none(), { _tag: "None" })
    await Util.expectEncodeSuccess(schema, O.some(1), { _tag: "Some", value: "1" })
  })
})
