import { describe, it } from "@effect/vitest"
import * as Inspectable from "effect/Inspectable"
import { strictEqual } from "effect/test/util"

describe("Inspectable", () => {
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
