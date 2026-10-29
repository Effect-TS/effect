import { assert, describe, it } from "@effect/vitest"
import { Equal, Hash } from "effect"
import { Runner, RunnerAddress } from "effect/cluster"

const make = (groups: ReadonlyArray<string>) =>
  Runner.make({ address: RunnerAddress.make("localhost", 1234), groups, weight: 1 })

describe("Runner", () => {
  it("compares shard groups as a set", () => {
    const runner = make(["a", "b"])
    const reordered = make(["b", "a", "b"])
    assert.isTrue(Equal.equals(runner, reordered))
    assert.strictEqual(Hash.hash(runner), Hash.hash(reordered))
    assert.isFalse(Equal.equals(runner, make(["a", "c"])))
  })
})
