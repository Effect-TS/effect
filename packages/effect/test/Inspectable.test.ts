import * as Inspectable from "effect/Inspectable"
import { describe, expect, it } from "vitest"

describe.concurrent("Inspectable", () => {
  describe.concurrent("toString", () => {
    it("primitives", () => {
      expect(Inspectable.format(null)).toEqual("null")
      expect(Inspectable.format(undefined)).toEqual(undefined)
      expect(Inspectable.format(1)).toEqual("1")
      expect(Inspectable.format("a")).toEqual(`"a"`)
      expect(Inspectable.format(true)).toEqual("true")
    })

    it("empty collections", () => {
      expect(Inspectable.format({})).toEqual("{}")
      expect(Inspectable.format([])).toEqual("[]")
    })

    it("objects", () => {
      expect(Inspectable.format({ a: 1 })).toEqual(`{
  "a": 1
}`)
      expect(Inspectable.format({ a: 1, b: 2 })).toEqual(`{
  "a": 1,
  "b": 2
}`)
      expect(Inspectable.format({ a: 1, b: { c: 2 } })).toEqual(`{
  "a": 1,
  "b": {
    "c": 2
  }
}`)
      expect(Inspectable.format({ a: undefined })).toEqual("{}")
    })

    it("arrays", () => {
      expect(Inspectable.format([1, 2, 3])).toEqual(`[
  1,
  2,
  3
]`)
      expect(Inspectable.format([1, [2, 3], 4])).toEqual(`[
  1,
  [
    2,
    3
  ],
  4
]`)
    })

    it("mixed", () => {
      expect(Inspectable.format({ "a": [] })).toEqual(`{
  "a": []
}`)
      expect(Inspectable.format({
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
      })).toEqual(`{
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
}`)
    })
  })
})
