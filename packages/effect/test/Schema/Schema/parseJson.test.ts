import * as Exit from "effect/Exit"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("parseJson", () => {
  describe("parseJson()", () => {
    it("decoding", async () => {
      const schema = S.parseJson()
      await Util.expectDecodeUnknownSuccess(schema, "{}", {})
      await Util.expectDecodeUnknownSuccess(schema, `{"a":"b"}`, { "a": "b" })

      await Util.expectDecodeUnknownFailure(
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
      await Util.expectDecodeUnknownFailure(
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
      await Util.expectDecodeUnknownFailure(
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
      const schema = S.parseJson(S.Struct({ a: S.Number }))
      await Util.expectDecodeUnknownSuccess(schema, `{"a":1}`, { a: 1 })
      await Util.expectDecodeUnknownFailure(
        schema,
        `{"a"}`,
        Util.isBun
          ? `((JsonString <-> unknown) <-> { readonly a: number })
└─ Encoded side transformation failure
    └─ (JsonString <-> unknown)
      └─ Transformation process failure
          └─ JSON Parse error: Expected ':' before value in object property definition`
          : `((JsonString <-> unknown) <-> { readonly a: number })
└─ Encoded side transformation failure
   └─ (JsonString <-> unknown)
      └─ Transformation process failure
         └─ Expected ':' after property name in JSON at position 4`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        `{"a":"b"}`,
        `((JsonString <-> unknown) <-> { readonly a: number })
└─ Type side transformation failure
   └─ { readonly a: number }
      └─ ["a"]
         └─ Expected number, actual "b"`
      )
    })

    it("encoding", async () => {
      const schema = S.parseJson(S.Struct({ a: S.Number }))
      await Util.expectEncodeSuccess(schema, { a: 1 }, `{"a":1}`)
    })

    describe("roundtrip", () => {
      it("Exit", async () => {
        const schema = S.parseJson(S.Exit({ failure: S.Never, success: S.Void, defect: S.Defect }))
        const encoding = S.encodeSync(schema)(Exit.void)
        await Util.expectDecodeUnknownSuccess(schema, encoding, Exit.void)
      })
    })
  })

  describe("parseJson(schema, options)", () => {
    it("reviver", async () => {
      const schema = S.parseJson(S.Struct({ a: S.Number, b: S.String }), {
        reviver: (key, value) => key === "a" ? value + 1 : value
      })
      await Util.expectDecodeUnknownSuccess(schema, `{"a":1,"b":"b"}`, { a: 2, b: "b" })
    })

    it("replacer", async () => {
      const schema = S.parseJson(S.Struct({ a: S.Number, b: S.String }), { replacer: ["b"] })
      await Util.expectEncodeSuccess(
        schema,
        { a: 1, b: "b" },
        `{"b":"b"}`
      )
    })

    it("space", async () => {
      const schema = S.parseJson(S.Struct({ a: S.Number }), { space: 2 })
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
