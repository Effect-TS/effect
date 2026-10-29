import { assert, describe, it } from "@effect/vitest"
import { Equal, Hash } from "effect"
import { Runner, RunnerAddress } from "effect/cluster"

const make = (groups: ReadonlyArray<string>) =>
  Runner.make({ address: RunnerAddress.make("localhost", 1234), groups, weight: 1 })

describe("Runner", () => {
  it("compares shard groups regardless of order", () => {
    const runner = make(["a", "b"])
    const reordered = make(["b", "a"])
    assert.isTrue(Equal.equals(runner, reordered))
    assert.strictEqual(Hash.hash(runner), Hash.hash(reordered))
    assert.isFalse(Equal.equals(runner, make(["a", "c"])))
  })

  it("hashes duplicate shard groups consistently with equality", () => {
    const self = make(["a", "a", "b"])
    const that = make(["a", "b", "b"])
    assert.strictEqual(Hash.hash(self) === Hash.hash(that), self[Equal.symbol](that))
  })
})
