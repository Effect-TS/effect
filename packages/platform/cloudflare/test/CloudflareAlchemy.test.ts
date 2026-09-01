import { assertNoReservedBindings, makeSingletonTriggers } from "@effect/platform-cloudflare/internal/alchemy"
import { assert, describe, it } from "@effect/vitest"

describe("CloudflareAlchemy", () => {
  it("merges and deduplicates singleton Cron Triggers", () => {
    assert.deepStrictEqual(
      makeSingletonTriggers(["15 * * * *"], [
        { cron: "0 * * * *", names: ["hourly", "hourly"] },
        { cron: "0 * * * *", names: ["ClusterCron/reconcile"] }
      ]),
      {
        crons: ["15 * * * *", "0 * * * *"],
        triggerMap: {
          "0 * * * *": ["hourly", "ClusterCron/reconcile"]
        }
      }
    )
  })

  it("rejects reserved Worker bindings", () => {
    assert.throws(
      () => assertNoReservedBindings({ CLUSTER_ENTITY: "reserved" }),
      /CLUSTER_ENTITY.*reserved/
    )
  })
})
