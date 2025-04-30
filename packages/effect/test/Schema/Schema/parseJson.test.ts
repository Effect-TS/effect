import { describe, it } from "@effect/vitest"
import * as Exit from "effect/Exit"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

const isBun = "Bun" in globalThis

describe("parseJson", () => {
  describe("parseJson()", () => {
    it("decoding", async () => {
      const schema = S.parseJson()
      await Util.assertions.decoding.succeed(schema, "{}", {})
      await Util.assertions.decoding.succeed(schema, `{"a":"b"}`, { "a": "b" })

      await Util.assertions.decoding.fail(
        schema,
        null,
        `parseJson
└─ Encoded side transformation failure
   └─ Expected string, actual null`
      )
      await Util.assertions.decoding.fail(
        schema,
        "",
        isBun ?
          `parseJson
└─ Transformation process failure
    └─ JSON Parse error: Unexpected EOF` :
          `parseJson
└─ Transformation process failure
   └─ Unexpected end of JSON input`
      )
      await Util.assertions.decoding.fail(
        schema,
        "a",
        isBun
          ? `parseJson
└─ Transformation process failure
    └─ JSON Parse error: Unexpected identifier "a"`
          : `parseJson
└─ Transformation process failure
   └─ Unexpected token 'a', "a" is not valid JSON`
      )
      await Util.assertions.decoding.fail(
        schema,
        "{",
        isBun
          ? `parseJson
└─ Transformation process failure
    └─ JSON Parse error: Expected '}'`
          : `parseJson
└─ Transformation process failure
   └─ Expected property name or '}' in JSON at position 1 (line 1 column 2)`
      )
    })

    it("encoding", async () => {
      const schema = S.parseJson()
      await Util.assertions.encoding.succeed(schema, "a", `"a"`)
      await Util.assertions.encoding.succeed(schema, { a: "b" }, `{"a":"b"}`)

      const bad: any = { a: 0 }
      bad["a"] = bad
      await Util.assertions.encoding.fail(
        schema,
        bad,
        isBun ?
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
      const schema = S.parseJson(S.Struct({ a: S.NumberFromString }))
      await Util.assertions.decoding.succeed(schema, `{"a":"1"}`, { a: 1 })
      await Util.assertions.decoding.fail(
        schema,
        `{"a"}`,
        isBun
          ? `(parseJson <-> { readonly a: NumberFromString })
└─ Encoded side transformation failure
    └─ parseJson
      └─ Transformation process failure
          └─ JSON Parse error: Expected ':' before value in object property definition`
          : `(parseJson <-> { readonly a: NumberFromString })
└─ Encoded side transformation failure
   └─ parseJson
      └─ Transformation process failure
         └─ Expected ':' after property name in JSON at position 4 (line 1 column 5)`
      )
      await Util.assertions.decoding.fail(
        schema,
        `{"a":"b"}`,
        `(parseJson <-> { readonly a: NumberFromString })
└─ Type side transformation failure
   └─ { readonly a: NumberFromString }
      └─ ["a"]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Unable to decode "b" into a number`
      )

      await Util.assertions.decoding.succeed(schema.from, `{"a":"1"}`, { a: "1" })
      await Util.assertions.decoding.succeed(schema.to, { a: "1" }, { a: 1 })
    })

    it("encoding", async () => {
      const schema = S.parseJson(S.Struct({ a: S.NumberFromString }))
      await Util.assertions.encoding.succeed(schema, { a: 1 }, `{"a":"1"}`)
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
      await Util.assertions.encoding.succeed(
        schema,
        { a: 1, b: "b" },
        `{"b":"b"}`
      )
    })

    it("space", async () => {
      const schema = S.parseJson(S.Struct({ a: S.Number }), { space: 2 })
      await Util.assertions.encoding.succeed(
        schema,
        { a: 1 },
        `{
  "a": 1
}`
      )
    })
  })
})
