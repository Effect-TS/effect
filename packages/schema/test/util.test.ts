import * as util from "@effect/schema/internal/util"
import { describe, expect, it } from "vitest"

describe("util", () => {
  it("ownKeys", () => {
    expect(util.ownKeys({})).toStrictEqual([])
    expect(util.ownKeys({ a: 1 })).toStrictEqual(["a"])
    expect(util.ownKeys({ a: 1, b: 2 })).toStrictEqual(["a", "b"])
    const a = Symbol.for("@effect/schema/test/a")
    const b = Symbol.for("@effect/schema/test/b")
    expect(util.ownKeys({ [a]: 3, [b]: 4 })).toStrictEqual([a, b])
    expect(util.ownKeys({ a: 1, [a]: 3, b: 2, [b]: 4 })).toStrictEqual(["a", "b", a, b])
  })
})
