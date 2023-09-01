import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("Schema/ParseJson", () => {
  it("decoding", async () => {
    const schema = S.ParseJson
    await Util.expectParseSuccess(schema, "{}", {})
    await Util.expectParseSuccess(schema, `{"a":"b"}`, { "a": "b" })

    await Util.expectParseFailure(
      schema,
      "",
      `Unexpected end of JSON input`
    )
    await Util.expectParseFailure(
      schema,
      "a",
      `Unexpected token a in JSON at position 0`
    )
    await Util.expectParseFailure(
      schema,
      "{",
      `Unexpected end of JSON input`
    )
  })

  it("encoding", async () => {
    const schema = S.ParseJson
    await Util.expectEncodeSuccess(schema, "a", `"a"`)
    await Util.expectEncodeSuccess(schema, { a: "b" }, `{"a":"b"}`)

    const bad: any = { a: 0 }
    bad["a"] = bad
    await Util.expectEncodeFailure(
      schema,
      bad,
      `Converting circular structure to JSON
    --> starting at object with constructor 'Object'
    --- property 'a' closes the circle`
    )
  })

  it("compose", async () => {
    const schema = S.ParseJson.pipe(S.compose(S.struct({ a: S.number })))
    await Util.expectParseSuccess(schema, `{"a":1}`, { a: 1 })
    await Util.expectParseFailure(schema, `{"a"}`, `Unexpected token } in JSON at position 4`)
    await Util.expectParseFailure(schema, `{"a":"b"}`, `/a Expected number, actual "b"`)
    await Util.expectEncodeSuccess(schema, { a: 1 }, `{"a":1}`)
  })
})
