import * as G from "effect/GlobalValue"
import { assert, describe, it } from "vitest"

const a = G.globalValue("id", () => ({}))
const b = G.globalValue("id", () => ({}))

describe("GlobalValue", () => {
  it("should give the same value when invoked with the same id", () => {
    assert.strictEqual(a, b)
  })
})
