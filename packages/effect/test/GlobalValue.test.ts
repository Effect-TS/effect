import * as G from "effect/GlobalValue"
import { strictEqual } from "effect/test/util"
import { describe, it } from "vitest"

const a = G.globalValue("id", () => ({}))
const b = G.globalValue("id", () => ({}))

describe("GlobalValue", () => {
  it("should give the same value when invoked with the same id", () => {
    strictEqual(a, b)
  })
})
