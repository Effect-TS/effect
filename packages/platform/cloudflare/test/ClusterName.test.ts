import * as CloudflareCluster from "@effect/platform-cloudflare/CloudflareCluster"
import { assert, describe, it } from "@effect/vitest"

describe("ClusterName", () => {
  describe("encodeName", () => {
    it("length-prefixes the entity type", () => {
      assert.strictEqual(CloudflareCluster.encodeName("User", "42"), "4:User42")
    })

    it("keeps separators in the id unambiguous", () => {
      assert.strictEqual(CloudflareCluster.encodeName("Counter", "a:b"), "7:Countera:b")
    })
  })

  describe("decodeName", () => {
    it("round-trips encoded names", () => {
      const cases: ReadonlyArray<readonly [string, string]> = [
        ["User", "42"],
        ["Counter", "a:b"],
        ["A:B", "X"],
        ["User", ""],
        ["Workflow123", "9:already-prefixed"]
      ]
      for (const [type, id] of cases) {
        assert.deepStrictEqual(
          CloudflareCluster.decodeName(CloudflareCluster.encodeName(type, id)),
          { type, id }
        )
      }
    })

    it("rejects names without a length prefix", () => {
      assert.isUndefined(CloudflareCluster.decodeName(""))
      assert.isUndefined(CloudflareCluster.decodeName("User42"))
      assert.isUndefined(CloudflareCluster.decodeName(":User"))
      assert.isUndefined(CloudflareCluster.decodeName("4User42"))
    })

    it("rejects names whose declared length exceeds the payload", () => {
      assert.isUndefined(CloudflareCluster.decodeName("10:User42"))
      assert.isUndefined(CloudflareCluster.decodeName("5:User"))
    })

    it("rejects non-canonical length prefixes", () => {
      assert.isUndefined(CloudflareCluster.decodeName("04:User42"))
    })
  })
})
