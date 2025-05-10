import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import { GlobalValue as G } from "effect"

const a = G.globalValue("id", () => ({}))
const b = G.globalValue("id", () => ({}))

describe("GlobalValue", () => {
  it("should give the same value when invoked with the same id", () => {
    strictEqual(a, b)
  })
})
