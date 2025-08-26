import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Option, Redacted, Schema } from "effect"
import * as util from "../../src/internal/schema/util.js"

describe("effect/internal/schema/util", () => {
  it("ownKeys", () => {
    deepStrictEqual(Reflect.ownKeys({}), [])
    deepStrictEqual(Reflect.ownKeys({ a: 1 }), ["a"])
    deepStrictEqual(Reflect.ownKeys({ a: 1, b: 2 }), ["a", "b"])
    const a = Symbol.for("effect/Schema/test/a")
    const b = Symbol.for("effect/Schema/test/b")
    deepStrictEqual(Reflect.ownKeys({ [a]: 3, [b]: 4 }), [a, b])
    deepStrictEqual(Reflect.ownKeys({ a: 1, [a]: 3, b: 2, [b]: 4 }), ["a", "b", a, b])
  })

  describe("formatUnknown", () => {
    const format = util.formatUnknown

    it("null", () => {
      strictEqual(format(null), `null`)
    })

    it("undefined", () => {
      strictEqual(format(undefined), `undefined`)
    })

    it("string", () => {
      strictEqual(format("a"), `"a"`)
    })

    it("number", () => {
      strictEqual(format(123), `123`)
    })

    it("boolean", () => {
      strictEqual(format(true), `true`)
    })

    it("symbol", () => {
      strictEqual(format(Symbol("a")), `Symbol(a)`)
    })

    it("bigint", () => {
      strictEqual(format(BigInt(123)), `123n`)
    })

    it("custom toString method", () => {
      strictEqual(format({ toString: () => "custom" }), `custom`)
    })

    it("array", () => {
      strictEqual(format([1, 2, 3n]), `[1,2,3n]`)
    })

    it("circular array", () => {
      const arr: any = [1]
      arr.push(arr)
      strictEqual(format(arr), `[1,[Circular]]`)
    })

    it("Set", () => {
      strictEqual(format(new Set([1, 2, 3])), `Set([1,2,3])`)
    })

    it("Map", () => {
      strictEqual(format(new Map([["a", 1], ["b", 2]])), `Map([["a",1],["b",2]])`)
    })

    it("circular Map contents", () => {
      const obj: any = { a: 1 }
      const map = new Map([["obj", obj]])
      obj.map = map
      strictEqual(format(map), `Map([["obj",{"a":1,"map":[Circular]}]])`)
    })

    it("circular Set contents", () => {
      const obj: any = { a: 1 }
      const set = new Set([obj])
      obj.set = set
      strictEqual(format(set), `Set([{"a":1,"set":[Circular]}])`)
    })

    it("object", () => {
      strictEqual(format({ a: 1 }), `{"a":1}`)
      strictEqual(format({ a: 1, b: 2 }), `{"a":1,"b":2}`)
      strictEqual(format({ [Symbol.for("a")]: 1 }), `{Symbol(a):1}`)
      strictEqual(format({ a: 1, b: [1, 2, 3n] }), `{"a":1,"b":[1,2,3n]}`)
    })

    it("circular object", () => {
      const obj: any = { a: 1 }
      obj.b = obj
      strictEqual(format(obj), `{"a":1,"b":[Circular]}`)
    })

    it("object with null prototype", () => {
      strictEqual(format(Object.create(null)), `{}`)
      strictEqual(format(Object.create(null, { a: { value: 1 } })), `{"a":1}`)
    })

    it("Error", () => {
      strictEqual(format(new Error("a")), `Error: a`)
    })

    it("Date", () => {
      strictEqual(format(new Date(0)), `1970-01-01T00:00:00.000Z`)
      strictEqual(format(new Date("invalid")), `Invalid Date`)
    })

    it("RegExp", () => {
      strictEqual(format(/a/), `/a/`)
    })

    it("Redacted", () => {
      strictEqual(format(Redacted.make("a")), `<redacted>`)
    })

    it("Option", () => {
      strictEqual(
        format(Option.some(1)),
        `{
  "_id": "Option",
  "_tag": "Some",
  "value": 1
}`
      )
      strictEqual(
        format(Option.none()),
        `{
  "_id": "Option",
  "_tag": "None"
}`
      )
    })

    it("Class", () => {
      class A extends Schema.Class<A>("A")({
        a: Schema.String
      }) {}
      strictEqual(format(new A({ a: "a" })), `A({ "a": "a" })`)
    })

    it("TaggedError", () => {
      class E extends Schema.TaggedError<E>("E")("E", {
        a: Schema.String
      }) {}
      strictEqual(format(new E({ a: "a" })), `E: { "a": "a" }`)
    })

    describe("whitespace", () => {
      it("object", () => {
        strictEqual(format({ a: 1 }, 2), `{"a":1}`)
        strictEqual(
          format({ a: 1, b: 2 }, 2),
          `{
  "a": 1,
  "b": 2
}`
        )
        strictEqual(
          format({ a: 1, b: [1, 2, 3n] }, 2),
          `{
  "a": 1,
  "b": [
    1,
    2,
    3n
  ]
}`
        )
        strictEqual(format({ [Symbol.for("a")]: 1 }, 2), `{Symbol(a):1}`)
      })

      it("circular object", () => {
        const obj: any = { a: 1 }
        obj.b = obj
        strictEqual(
          format(obj, 2),
          `{
  "a": 1,
  "b": [Circular]
}`
        )
      })

      it("object with null prototype", () => {
        strictEqual(format(Object.create(null), 2), `{}`)
        strictEqual(
          format(Object.create(null, { a: { value: 1 } }), 2),
          `{"a":1}`
        )
      })
    })
  })
})
