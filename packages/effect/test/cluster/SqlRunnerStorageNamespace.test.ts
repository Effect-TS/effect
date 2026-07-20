import { assert, describe, it } from "@effect/vitest"
import { hashString } from "../../src/unstable/cluster/internal/hash.ts"

describe("SqlRunnerStorage advisory lock namespace", () => {
  it("derives distinct namespaces from different prefixes", () => {
    assert.notStrictEqual(hashString("cluster_a"), hashString("cluster_b"))
    assert.strictEqual(hashString("cluster"), hashString("cluster"))
  })

  it("returns a stable int32-compatible value for a given prefix", () => {
    const namespace = hashString("cluster")
    assert.strictEqual(namespace, hashString("cluster"))
    assert.isTrue(Number.isInteger(namespace))
    assert.isTrue(namespace >= -0x80000000 && namespace <= 0x7fffffff)
  })
})
