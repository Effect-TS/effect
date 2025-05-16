import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { MutableList, pipe } from "effect"

describe("MutableList", () => {
  it("toString", () => {
    strictEqual(
      String(MutableList.make(0, 1, 2)),
      `{
  "_id": "MutableList",
  "values": [
    0,
    1,
    2
  ]
}`
    )
  })

  it("toJSON", () => {
    deepStrictEqual(MutableList.make(0, 1, 2).toJSON(), { _id: "MutableList", values: [0, 1, 2] })
  })

  it("inspect", () => {
    if (typeof window !== "undefined") {
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { inspect } = require("node:util")
    deepStrictEqual(inspect(MutableList.make(0, 1, 2)), inspect({ _id: "MutableList", values: [0, 1, 2] }))
  })

  it("pipe()", () => {
    deepStrictEqual(MutableList.empty<string>().pipe(MutableList.prepend("a")), MutableList.make("a"))
  })

  it("empty", () => {
    deepStrictEqual(Array.from(MutableList.empty<number>()), [])
  })

  it("fromIterable", () => {
    deepStrictEqual(Array.from(MutableList.fromIterable([])), [])
    deepStrictEqual(Array.from(MutableList.fromIterable([1, 2, 3])), [1, 2, 3])
  })

  it("make", () => {
    deepStrictEqual(Array.from(MutableList.make()), [])
    deepStrictEqual(Array.from(MutableList.make(1, 2, 3)), [1, 2, 3])
  })

  it("isEmpty", () => {
    assertTrue(MutableList.isEmpty(MutableList.empty<number>()))
    assertFalse(MutableList.isEmpty(MutableList.make(1, 2, 3)))
  })

  it("length", () => {
    strictEqual(MutableList.length(MutableList.empty<number>()), 0)
    strictEqual(MutableList.length(MutableList.make(1, 2, 3)), 3)
  })

  it("tail", () => {
    strictEqual(MutableList.tail(MutableList.make()), undefined)
    deepStrictEqual(MutableList.tail(MutableList.make(1, 2, 3)), 3)
  })

  it("head", () => {
    strictEqual(MutableList.head(MutableList.make()), undefined)
    deepStrictEqual(MutableList.head(MutableList.make(1, 2, 3)), 1)
  })

  it("forEach", () => {
    const accumulator: Array<number> = []
    const list = MutableList.make(1, 2, 3)
    pipe(
      list,
      MutableList.forEach((n) => {
        accumulator.push(n * 2)
      })
    )

    deepStrictEqual(Array.from(list), [1, 2, 3])
    deepStrictEqual(accumulator, [2, 4, 6])
  })

  it("reset", () => {
    const list = MutableList.make(1, 2, 3)
    deepStrictEqual(Array.from(list), [1, 2, 3])
    deepStrictEqual(Array.from(MutableList.reset(list)), [])
  })

  it("append", () => {
    const list = pipe(
      MutableList.empty<number>(),
      MutableList.append(1),
      MutableList.append(2),
      MutableList.append(3)
    )

    deepStrictEqual(Array.from(list), [1, 2, 3])
  })

  it("shift", () => {
    const list = MutableList.make(1, 2, 3)
    strictEqual(MutableList.shift(list), 1)
    strictEqual(MutableList.shift(list), 2)
    strictEqual(MutableList.shift(list), 3)
    strictEqual(MutableList.shift(list), undefined)
  })

  it("pop", () => {
    const list = MutableList.make(1, 2, 3)
    strictEqual(MutableList.pop(list), 3)
    strictEqual(MutableList.pop(list), 2)
    strictEqual(MutableList.pop(list), 1)
    strictEqual(MutableList.pop(list), undefined)
  })

  it("prepend", () => {
    const list = pipe(
      MutableList.empty<number>(),
      MutableList.prepend(1),
      MutableList.prepend(2),
      MutableList.prepend(3),
      MutableList.append(4)
    )
    deepStrictEqual(Array.from(list), [3, 2, 1, 4])
  })
})
