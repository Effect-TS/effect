import * as UrlParams from "@effect/platform/UrlParams"
import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Effect, Option, Schema } from "effect"

describe("UrlParams", () => {
  describe("makeUrl", () => {
    it.effect("makes a URL", () =>
      Effect.gen(function*() {
        const url = yield* (UrlParams.makeUrl("https://example.com/test", [], Option.none()))
        strictEqual(url.toString(), "https://example.com/test")
      }))

    it.effect("supports relative URLs", () =>
      Effect.gen(function*() {
        const originalLocation = globalThis.location

        globalThis.location = {
          origin: "https://example.com",
          pathname: "/path/"
        } as Location
        const url = yield* (UrlParams.makeUrl("test", [], Option.none()))
        strictEqual(url.toString(), "https://example.com/path/test")

        globalThis.location = originalLocation
      }))

    it.effect("does not throw if `location` is set to `undefined`", () =>
      Effect.gen(function*() {
        const originalLocation = globalThis.location

        // `globalThis.location` is undefined
        // @ts-expect-error
        globalThis.location = undefined
        let url = yield* (UrlParams.makeUrl("https://example.com", [], Option.none()))
        strictEqual(url.toString(), "https://example.com/")

        // `location` is not in globalThis
        // @ts-expect-error
        delete globalThis.location
        url = yield* (UrlParams.makeUrl("http://example.com", [], Option.none()))
        strictEqual(url.toString(), "http://example.com/")

        globalThis.location = originalLocation
      }))

    it.effect("does not fail if `location` is partially defined", () =>
      Effect.gen(function*() {
        const originalLocation = globalThis.location

        globalThis.location = { href: "" } as Location
        const url1 = yield* (UrlParams.makeUrl("https://example.com", [], Option.none()))
        strictEqual(url1.toString(), "https://example.com/")

        globalThis.location = {
          href: "",
          origin: "https://example.com"
        } as unknown as Location
        const url2 = yield* (UrlParams.makeUrl("https://example.com", [], Option.none()))
        strictEqual(url2.toString(), "https://example.com/")

        globalThis.location = {
          href: "",
          pathname: "example_path"
        } as unknown as Location
        const url3 = yield* (UrlParams.makeUrl("https://example.com", [], Option.none()))
        strictEqual(url3.toString(), "https://example.com/")

        globalThis.location = originalLocation
      }))
  })

  describe("fromInput", () => {
    it("works with non-strings", () => {
      deepStrictEqual(
        UrlParams.fromInput({ a: 1, b: true, c: "string", e: [1, 2, 3] }),
        [
          ["a", "1"],
          ["b", "true"],
          ["c", "string"],
          ["e", "1"],
          ["e", "2"],
          ["e", "3"]
        ]
      )
    })
  })

  describe("toRecord", () => {
    it("works when empty", () => {
      deepStrictEqual(
        UrlParams.toRecord(UrlParams.empty),
        {}
      )
    })

    it("builds non empty array from same keys", () => {
      deepStrictEqual(
        UrlParams.toRecord(UrlParams.fromInput({ "a": [10, "string", false] })),
        { a: ["10", "string", "false"] }
      )
    })

    it("works with non-strings", () => {
      const urlParams = UrlParams.fromInput({ a: 1, b: true, c: "string", e: [1, 2, 3] })
      const result = UrlParams.toRecord(urlParams)
      deepStrictEqual(
        result,
        { "a": "1", "b": "true", "c": "string", "e": ["1", "2", "3"] }
      )
    })

    it("works with __proto__", () => {
      const urlParams = UrlParams.fromInput({ ["__proto__"]: "foo" })
      const result = UrlParams.toRecord(urlParams)
      deepStrictEqual(result, { ["__proto__"]: "foo" })
    })
  })

  describe("getAll", () => {
    const params = UrlParams.fromInput({ foo: ["a", "b"], bar: "c" })

    it("returns every value for the provided key", () => {
      deepStrictEqual(UrlParams.getAll(params, "foo"), ["a", "b"])
    })

    it("returns an empty array when the key is missing", () => {
      deepStrictEqual(UrlParams.getAll(params, "missing"), [])
    })
  })

  describe("getFirst", () => {
    const params = UrlParams.fromInput({ foo: ["a", "b"] })

    it("returns the first value wrapped in Option", () => {
      deepStrictEqual(UrlParams.getFirst(params, "foo"), Option.some("a"))
    })

    it("returns none when the key is missing", () => {
      deepStrictEqual(UrlParams.getFirst(params, "missing"), Option.none())
    })
  })

  describe("getLast", () => {
    const params = UrlParams.fromInput({ foo: ["a", "b"] })

    it("returns the last value wrapped in Option", () => {
      deepStrictEqual(UrlParams.getLast(params, "foo"), Option.some("b"))
    })

    it("returns none when the key is missing", () => {
      deepStrictEqual(UrlParams.getLast(params, "missing"), Option.none())
    })
  })

  describe("setAll", () => {
    it("overwrites provided keys while preserving others", () => {
      const prev = UrlParams.fromInput({
        baz: "c",
        foo: "d"
      })
      const next = UrlParams.fromInput({
        foo: "a",
        bar: "b"
      })

      deepStrictEqual(
        UrlParams.toRecord(UrlParams.setAll(prev, next)),
        {
          baz: "c",
          foo: "a",
          bar: "b"
        }
      )
    })
  })

  describe("set", () => {
    it("overwrites only the targeted key", () => {
      const params = UrlParams.fromInput({ foo: "d", baz: "c" })
      deepStrictEqual(
        UrlParams.toRecord(UrlParams.set(params, "foo", "a")),
        { baz: "c", foo: "a" }
      )
    })
  })

  describe("append", () => {
    it("preserves existing entries and appends a new pair", () => {
      const params = UrlParams.fromInput({ foo: "a" })
      const appended = UrlParams.append(params, "foo", "b")
      deepStrictEqual(UrlParams.getAll(appended, "foo"), ["a", "b"])
    })
  })

  describe("appendAll", () => {
    it("appends all entries while keeping order", () => {
      const params = UrlParams.fromInput({ foo: "a" })
      const appended = UrlParams.appendAll(params, {
        foo: "b",
        bar: "c"
      })
      deepStrictEqual(
        UrlParams.toRecord(appended),
        { foo: ["a", "b"], bar: "c" }
      )
    })
  })

  describe("remove", () => {
    it("removes every instance of the provided key", () => {
      const params = UrlParams.fromInput({
        foo: ["a", "b"],
        bar: "c"
      })
      deepStrictEqual(
        UrlParams.toRecord(UrlParams.remove(params, "foo")),
        { bar: "c" }
      )
    })
  })

  describe("schemaStruct", () => {
    it.effect("works when empty", () =>
      Effect.gen(function*() {
        const result = yield* UrlParams.schemaStruct(Schema.Struct({}))(UrlParams.empty)
        deepStrictEqual(result, {})
      }))

    it.effect("parse original values", () =>
      Effect.gen(function*() {
        const urlParams = UrlParams.fromInput({ "a": [10, "string", false] })
        const result = yield* UrlParams.schemaStruct(Schema.Struct({
          a: Schema.Tuple(Schema.NumberFromString, Schema.String, Schema.BooleanFromString)
        }))(urlParams)
        deepStrictEqual(result, {
          a: [10, "string", false]
        })
      }))

    it.effect("parse multiple keys", () =>
      Effect.gen(function*() {
        const urlParams = UrlParams.fromInput({ "a": [10, "string"], "b": false })
        const result = yield* UrlParams.schemaStruct(Schema.Struct({
          a: Schema.Tuple(Schema.NumberFromString, Schema.String),
          b: Schema.BooleanFromString
        }))(urlParams)
        deepStrictEqual(result, {
          a: [10, "string"],
          b: false
        })
      }))
  })

  describe("schemaParse", () => {
    const schema = UrlParams.schemaParse(Schema.Struct({
      a: Schema.NumberFromString,
      b: Schema.BooleanFromString,
      c: Schema.String
    }))

    it.effect("roundtrip", () =>
      Effect.gen(function*() {
        const encoded = yield* Schema.encode(schema)({
          a: 10,
          b: true,
          c: "string"
        })
        strictEqual(encoded, "a=10&b=true&c=string")
        const decoded = yield* Schema.decode(schema)(encoded)
        deepStrictEqual(decoded, {
          a: 10,
          b: true,
          c: "string"
        })
      }))
  })

  it("nested records", () => {
    const urlParams = UrlParams.fromInput({
      "a": [10, "string"],
      "b": false,
      "c": {
        "d": 10,
        "e": "string",
        f: {
          g: [10, "string"]
        }
      }
    })
    deepStrictEqual(Array.from(urlParams), [
      ["a", "10"],
      ["a", "string"],
      ["b", "false"],
      ["c[d]", "10"],
      ["c[e]", "string"],
      ["c[f][g]", "10"],
      ["c[f][g]", "string"]
    ])
  })
})
