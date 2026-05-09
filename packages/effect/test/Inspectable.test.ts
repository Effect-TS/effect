import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import { Inspectable, Redacted } from "effect"

describe("Inspectable", () => {
  describe("formatUnknown", () => {
    const format = Inspectable.formatUnknown
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
      strictEqual(format(new Error("a", { cause: "b" })), `Error: a (cause: "b")`)
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

    describe("whitespace", () => {
      it("object", () => {
        strictEqual(format({ a: 1 }, { space: 2 }), `{"a":1}`)
        strictEqual(
          format({ a: 1, b: 2 }, { space: 2 }),
          `{
  "a": 1,
  "b": 2
}`
        )
        strictEqual(
          format({ a: 1, b: [1, 2, 3n] }, { space: 2 }),
          `{
  "a": 1,
  "b": [
    1,
    2,
    3n
  ]
}`
        )
        strictEqual(format({ [Symbol.for("a")]: 1 }, { space: 2 }), `{Symbol(a):1}`)
      })

      it("circular object", () => {
        const obj: any = { a: 1 }
        obj.b = obj
        strictEqual(
          format(obj, { space: 2 }),
          `{
  "a": 1,
  "b": [Circular]
}`
        )
      })

      it("object with null prototype", () => {
        strictEqual(format(Object.create(null), { space: 2 }), `{}`)
        strictEqual(
          format(Object.create(null, { a: { value: 1 } }), { space: 2 }),
          `{"a":1}`
        )
      })
    })
  })

  describe("toString", () => {
    it("primitives", () => {
      strictEqual(Inspectable.format(null), "null")
      strictEqual(Inspectable.format(undefined), undefined)
      strictEqual(Inspectable.format(1), "1")
      strictEqual(Inspectable.format("a"), `"a"`)
      strictEqual(Inspectable.format(true), "true")
    })

    it("empty collections", () => {
      strictEqual(Inspectable.format({}), "{}")
      strictEqual(Inspectable.format([]), "[]")
    })

    it("objects", () => {
      strictEqual(
        Inspectable.format({ a: 1 }),
        `{
  "a": 1
}`
      )
      strictEqual(
        Inspectable.format({ a: 1, b: 2 }),
        `{
  "a": 1,
  "b": 2
}`
      )
      strictEqual(
        Inspectable.format({ a: 1, b: { c: 2 } }),
        `{
  "a": 1,
  "b": {
    "c": 2
  }
}`
      )
      strictEqual(Inspectable.format({ a: undefined }), "{}")
    })

    it("arrays", () => {
      strictEqual(
        Inspectable.format([1, 2, 3]),
        `[
  1,
  2,
  3
]`
      )
      strictEqual(
        Inspectable.format([1, [2, 3], 4]),
        `[
  1,
  [
    2,
    3
  ],
  4
]`
      )
    })

    it("mixed", () => {
      strictEqual(
        Inspectable.format({ "a": [] }),
        `{
  "a": []
}`
      )
      strictEqual(
        Inspectable.format({
          "_id": "Cause",
          "_tag": "Fail",
          "errors": [
            {
              "value": { "_id": "Chunk", "values": [0, 1, 2] }
            },
            {
              "value": { "_id": "Chunk", "values": ["a", "b"] }
            }
          ]
        }),
        `{
  "_id": "Cause",
  "_tag": "Fail",
  "errors": [
    {
      "value": {
        "_id": "Chunk",
        "values": [
          0,
          1,
          2
        ]
      }
    },
    {
      "value": {
        "_id": "Chunk",
        "values": [
          "a",
          "b"
        ]
      }
    }
  ]
}`
      )
    })
  })
})
