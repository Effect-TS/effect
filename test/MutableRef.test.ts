import * as Chunk from "effect/Chunk"
import * as MutableRef from "effect/MutableRef"
import { inspect } from "node:util"
import { describe, expect, it } from "vitest"

describe.concurrent("MutableRef", () => {
  it("toString", () => {
    expect(String(MutableRef.make(Chunk.make(1, 2, 3)))).toEqual(`{
  "_id": "MutableRef",
  "current": {
    "_id": "Chunk",
    "values": [
      1,
      2,
      3
    ]
  }
}`)
  })

  it("toJSON", () => {
    expect(MutableRef.make(Chunk.make(1, 2, 3)).toJSON()).toEqual(
      { _id: "MutableRef", current: { _id: "Chunk", values: [1, 2, 3] } }
    )
  })

  it("inspect", () => {
    if (typeof window !== "undefined") {
      return
    }
    expect(inspect(MutableRef.make(Chunk.make(1, 2, 3)))).toEqual(
      inspect({ _id: "MutableRef", current: { _id: "Chunk", values: [1, 2, 3] } })
    )
  })
})
