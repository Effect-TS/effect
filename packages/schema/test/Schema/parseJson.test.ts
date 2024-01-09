import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as Exit from "effect/Exit"
import { describe, it } from "vitest"

describe("Schema > parseJson", () => {
  describe("parseJson()", () => {
    it("decoding", async () => {
      const schema = S.parseJson()
      await Util.expectParseSuccess(schema, "{}", {})
      await Util.expectParseSuccess(schema, `{"a":"b"}`, { "a": "b" })

      await Util.expectParseFailure(
        schema,
        "",
        Util.isBun ?
          `(JsonString <-> unknown)
└─ Transformation process failure
    └─ JSON Parse error: Unexpected EOF` :
          `(JsonString <-> unknown)
└─ Transformation process failure
   └─ Unexpected end of JSON input`
      )
      await Util.expectParseFailure(
        schema,
        "a",
        Util.isBun
          ? `(JsonString <-> unknown)
└─ Transformation process failure
    └─ JSON Parse error: Unexpected identifier "a"`
          : `(JsonString <-> unknown)
└─ Transformation process failure
   └─ Unexpected token 'a', "a" is not valid JSON`
      )
      await Util.expectParseFailure(
        schema,
        "{",
        Util.isBun
          ? `(JsonString <-> unknown)
└─ Transformation process failure
    └─ JSON Parse error: Expected '}'`
          : `(JsonString <-> unknown)
└─ Transformation process failure
   └─ Expected property name or '}' in JSON at position 1`
      )
    })

    it("encoding", async () => {
      const schema = S.parseJson()
      await Util.expectEncodeSuccess(schema, "a", `"a"`)
      await Util.expectEncodeSuccess(schema, { a: "b" }, `{"a":"b"}`)

      const bad: any = { a: 0 }
      bad["a"] = bad
      await Util.expectEncodeFailure(
        schema,
        bad,
        Util.isBun ?
          `(JsonString <-> unknown)
└─ Transformation process failure
    └─ JSON.stringify cannot serialize cyclic structures.` :
          `(JsonString <-> unknown)
└─ Transformation process failure
   └─ Converting circular structure to JSON
    --> starting at object with constructor 'Object'
    --- property 'a' closes the circle`
      )
    })
  })

  describe("parseJson(schema)", () => {
    it("decoding", async () => {
      const schema = S.parseJson(S.struct({ a: S.number }))
      await Util.expectParseSuccess(schema, `{"a":1}`, { a: 1 })
      await Util.expectParseFailure(
        schema,
        `{"a"}`,
        Util.isBun
          ? `((JsonString <-> unknown) <-> { a: number })
└─ From side transformation failure
    └─ (JsonString <-> unknown)
      └─ Transformation process failure
          └─ JSON Parse error: Expected ':' before value in object property definition`
          : `((JsonString <-> unknown) <-> { a: number })
└─ From side transformation failure
   └─ (JsonString <-> unknown)
      └─ Transformation process failure
         └─ Expected ':' after property name in JSON at position 4`
      )
      await Util.expectParseFailure(
        schema,
        `{"a":"b"}`,
        `((JsonString <-> unknown) <-> { a: number })
└─ To side transformation failure
   └─ { a: number }
      └─ ["a"]
         └─ Expected a number, actual "b"`
      )
    })

    it("encoding", async () => {
      const schema = S.parseJson(S.struct({ a: S.number }))
      await Util.expectEncodeSuccess(schema, { a: 1 }, `{"a":1}`)
    })

    describe("roundtrip", () => {
      it("Exit", async () => {
        const schema = S.parseJson(S.exit(S.never, S.void))
        const encoding = S.encodeSync(schema)(Exit.unit)
        await Util.expectParseSuccess(schema, encoding, Exit.unit)
      })
    })
  })

  describe("parseJson(schema, options)", () => {
    it("reviver", async () => {
      const schema = S.parseJson(S.struct({ a: S.number, b: S.string }), {
        reviver: (key, value) => key === "a" ? value + 1 : value
      })
      await Util.expectParseSuccess(schema, `{"a":1,"b":"b"}`, { a: 2, b: "b" })
    })

    it("replacer", async () => {
      const schema = S.parseJson(S.struct({ a: S.number, b: S.string }), { replacer: ["b"] })
      await Util.expectEncodeSuccess(
        schema,
        { a: 1, b: "b" },
        `{"b":"b"}`
      )
    })

    it("space", async () => {
      const schema = S.parseJson(S.struct({ a: S.number }), { space: 2 })
      await Util.expectEncodeSuccess(
        schema,
        { a: 1 },
        `{
  "a": 1
}`
      )
    })
  })
})
