import { trim } from "@effect/schema/data/String"
import * as P from "@effect/schema/Parser"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("trim", () => {
  const schema = trim(S.string)

  it("property tests", () => {
    Util.property(schema)
  })

  it("Guard", () => {
    const is = P.is(schema)
    expect(is("a")).toEqual(true)
    expect(is("")).toEqual(true)
    expect(is("a ")).toEqual(false)
    expect(is(" a")).toEqual(false)
    expect(is(" a ")).toEqual(false)
    expect(is(" ")).toEqual(false)
  })

  it("Decoder", () => {
    Util.expectDecodingSuccess(schema, "a", "a")
    Util.expectDecodingSuccess(schema, "", "")
    Util.expectDecodingSuccess(schema, "a ", "a")
    Util.expectDecodingSuccess(schema, " a ", "a")
    Util.expectDecodingSuccess(schema, " ", "")
  })

  it("Encoder", () => {
    Util.expectEncodingSuccess(schema, "a", "a")
    Util.expectEncodingSuccess(schema, "", "")
    Util.expectEncodingSuccess(schema, " a", "a")
    Util.expectEncodingSuccess(schema, "a ", "a")
    Util.expectEncodingSuccess(schema, " a ", "a")
    Util.expectEncodingSuccess(schema, " ", "")
  })
})
