import { trim } from "@fp-ts/schema/data/parser"
import * as P from "@fp-ts/schema/Parser"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

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
