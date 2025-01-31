import { describe, it } from "@effect/vitest"
import { Chunk, MutableRef } from "effect"
import { deepStrictEqual, strictEqual } from "effect/test/util"

describe("MutableRef", () => {
  it("toString", () => {
    strictEqual(
      String(MutableRef.make(Chunk.make(1, 2, 3))),
      `{
  "_id": "MutableRef",
  "current": {
    "_id": "Chunk",
    "values": [
      1,
      2,
      3
    ]
  }
}`
    )
  })

  it("toJSON", () => {
    deepStrictEqual(MutableRef.make(Chunk.make(1, 2, 3)).toJSON(), {
      _id: "MutableRef",
      current: { _id: "Chunk", values: [1, 2, 3] }
    })
  })

  it("inspect", () => {
    if (typeof window !== "undefined") {
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { inspect } = require("node:util")
    deepStrictEqual(
      inspect(MutableRef.make(Chunk.make(1, 2, 3))),
      inspect({ _id: "MutableRef", current: { _id: "Chunk", values: [1, 2, 3] } })
    )
  })
})
