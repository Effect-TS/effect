import * as Exit from "effect/Exit"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("parseJson", () => {
  describe("parseJson()", () => {
    it("decoding", async () => {
      const schema = S.parseJson()
      await Util.assertions.decoding.succeed(schema, "{}", {})
      await Util.assertions.decoding.succeed(schema, `{"a":"b"}`, { "a": "b" })

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `parseJson
└─ Encoded side transformation failure
   └─ Expected string, actual null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        "",
        Util.isBun ?
          `parseJson
└─ Transformation process failure
    └─ JSON Parse error: Unexpected EOF` :
          `parseJson
└─ Transformation process failure
   └─ Unexpected end of JSON input`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        "a",
        Util.isBun
          ? `parseJson
└─ Transformation process failure
    └─ JSON Parse error: Unexpected identifier "a"`
          : `parseJson
└─ Transformation process failure
   └─ Unexpected token 'a', "a" is not valid JSON`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        "{",
        Util.isBun
          ? `parseJson
└─ Transformation process failure
    └─ JSON Parse error: Expected '}'`
          : `parseJson
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
          `parseJson
└─ Transformation process failure
    └─ JSON.stringify cannot serialize cyclic structures.` :
          `parseJson
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
      await Util.assertions.decoding.succeed(schema, `{"a":1}`, { a: 1 })
      await Util.expectDecodeUnknownFailure(
        schema,
        `{"a"}`,
        Util.isBun
          ? `(parseJson <-> { readonly a: number })
└─ Encoded side transformation failure
    └─ parseJson
      └─ Transformation process failure
          └─ JSON Parse error: Expected ':' before value in object property definition`
          : `(parseJson <-> { readonly a: number })
└─ Encoded side transformation failure
   └─ parseJson
      └─ Transformation process failure
         └─ Expected ':' after property name in JSON at position 4`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        `{"a":"b"}`,
        `(parseJson <-> { readonly a: number })
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
        await Util.assertions.decoding.succeed(schema, encoding, Exit.void)
      })
    })
  })

  describe("parseJson(schema, options)", () => {
    it("reviver", async () => {
      const schema = S.parseJson(S.Struct({ a: S.Number, b: S.String }), {
        reviver: (key, value) => key === "a" ? value + 1 : value
      })
      await Util.assertions.decoding.succeed(schema, `{"a":1,"b":"b"}`, { a: 2, b: "b" })
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
