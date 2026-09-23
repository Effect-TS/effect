import { assert, describe, it } from "@effect/vitest"
import { ClusterError, RunnerAddress } from "effect/cluster"

const runnerAddress = RunnerAddress.make("localhost", 8080)

describe("ClusterError", () => {
  it("recognizes persistence errors", () => {
    const error = new ClusterError.PersistenceError({ cause: new Error("boom") })
    assert.isTrue(ClusterError.PersistenceError.is(error))
    assert.isFalse(ClusterError.PersistenceError.is(new ClusterError.MalformedMessage({ cause: new Error("boom") })))
    assert.isFalse(ClusterError.PersistenceError.is({ _tag: "PersistenceError" }))
  })

  it("recognizes runner registration errors", () => {
    const error = new ClusterError.RunnerNotRegistered({ address: runnerAddress })
    assert.isTrue(ClusterError.RunnerNotRegistered.is(error))
    assert.isFalse(ClusterError.RunnerNotRegistered.is(new ClusterError.RunnerUnavailable({ address: runnerAddress })))
    assert.isFalse(ClusterError.RunnerNotRegistered.is({ _tag: "RunnerNotRegistered" }))
  })
})
