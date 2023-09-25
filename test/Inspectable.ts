import * as Inspectable from "effect/Inspectable"

describe.concurrent("Inspectable", () => {
  describe.concurrent("toString", () => {
    it("primitives", () => {
      expect(Inspectable.toString(null)).toEqual("null")
      expect(Inspectable.toString(undefined)).toEqual(undefined)
      expect(Inspectable.toString(1)).toEqual("1")
      expect(Inspectable.toString("a")).toEqual(`"a"`)
      expect(Inspectable.toString(true)).toEqual("true")
    })

    it("empty collections", () => {
      expect(Inspectable.toString({})).toEqual("{}")
      expect(Inspectable.toString([])).toEqual("[]")
    })

    it("objects", () => {
      expect(Inspectable.toString({ a: 1 })).toEqual(`{
  "a": 1
}`)
      expect(Inspectable.toString({ a: 1, b: 2 })).toEqual(`{
  "a": 1,
  "b": 2
}`)
      expect(Inspectable.toString({ a: 1, b: { c: 2 } })).toEqual(`{
  "a": 1,
  "b": {
    "c": 2
  }
}`)
      expect(Inspectable.toString({ a: undefined })).toEqual("{}")
    })

    it("arrays", () => {
      expect(Inspectable.toString([1, 2, 3])).toEqual(`[
  1,
  2,
  3
]`)
      expect(Inspectable.toString([1, [2, 3], 4])).toEqual(`[
  1,
  [
    2,
    3
  ],
  4
]`)
    })

    it("mixed", () => {
      expect(Inspectable.toString({ "a": [] })).toEqual(`{
  "a": []
}`)
      expect(Inspectable.toString({
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
