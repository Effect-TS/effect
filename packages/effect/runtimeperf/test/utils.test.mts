import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { parseArgs, resolveDefaults } from "../utils.mts"

describe("runtimeperf options", () => {
  it("accepts a fixed batch size", () => {
    const options = parseArgs(["moltar-parse-safe-valid", "--batch-size", "256"])
    assert.equal(options.batchSize, 256)
    assert.equal(resolveDefaults({ defaults: {} }, options).batchSize, 256)
  })

  it("rejects an invalid fixed batch size", () => {
    assert.throws(() => parseArgs(["--batch-size", "0"]), /--batch-size must be a positive integer/)
  })
})
