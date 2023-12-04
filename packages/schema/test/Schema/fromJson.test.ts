import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema/fromJson", () => {
  it("decoding", async () => {
    const schema = S.fromJson(S.struct({ a: S.number }))
    await Util.expectParseSuccess(schema, `{"a":1}`, { a: 1 })
    await Util.expectParseFailure(
      schema,
      `{"a"}`,
      Util.isBun
        ? `JSON Parse error: Expected ':' before value in object property definition`
        : `Expected ':' after property name in JSON at position 4`
    )
    await Util.expectParseFailure(schema, `{"a":"b"}`, `/a Expected number, actual "b"`)
  })

  it("reviver", async () => {
    const schema = S.fromJson(S.struct({ a: S.number, b: S.string }), {
      reviver: (key, value) => key === "a" ? value + 1 : value
    })
    await Util.expectParseSuccess(schema, `{"a":1,"b":"b"}`, { a: 2, b: "b" })
  })

  it("encoding", async () => {
    const schema = S.ParseJson.pipe(S.compose(S.struct({ a: S.number })))
    await Util.expectEncodeSuccess(schema, { a: 1 }, `{"a":1}`)
  })

  it("replacer", async () => {
    const schema = S.fromJson(S.struct({ a: S.number, b: S.string }), { replacer: ["b"] })
    await Util.expectEncodeSuccess(
      schema,
      { a: 1, b: "b" },
      `{"b":"b"}`
    )
  })

  it("space", async () => {
    const schema = S.fromJson(S.struct({ a: S.number }), { space: 2 })
    await Util.expectEncodeSuccess(
      schema,
      { a: 1 },
      `{
  "a": 1
}`
    )
  })
})
