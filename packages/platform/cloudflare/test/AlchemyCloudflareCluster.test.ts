import { inertClusterHandle, makeClusterHandle } from "@effect/platform-cloudflare/internal/alchemyCluster"
import { assert, describe, it } from "@effect/vitest"
import { Context, Effect } from "effect"
import { Singleton } from "effect/unstable/cluster"
import { Sharding } from "effect/unstable/cluster/Sharding"

// The public `AlchemyCloudflareCluster.make` wires these handles to alchemy's
// Durable Object declarations. The alchemy runtime tracks the published
// `effect` release rather than this workspace, so the alchemy-importing glue
// is covered by the typetest and the examples typecheck instead of executing
// here.
describe("AlchemyCloudflareCluster", () => {
  it.effect("builds the cluster context from the namespace bindings", () =>
    Effect.gen(function*() {
      const getByNameCalls: Array<string> = []
      const wakeCalls: Array<string> = []
      const fakeNamespace = {
        getByName: (name: string) => {
          getByNameCalls.push(name)
          return {
            wake: () => {
              wakeCalls.push(name)
              return Promise.resolve()
            }
          }
        }
      }

      const cluster = yield* makeClusterHandle({
        entities: [],
        layer: Singleton.make("maintenance", Effect.void),
        env: {
          ClusterEntity: fakeNamespace,
          ClusterWorkflow: fakeNamespace,
          ClusterDurableQueue: fakeNamespace,
          ClusterSingleton: fakeNamespace
        }
      })

      // The singleton registration fail-fast resolved its object eagerly.
      assert.include(getByNameCalls, "Singleton/maintenance")

      // The built context carries the cluster services and backs `provide`.
      assert.isTrue(Context.getOption(cluster.context, Sharding)._tag === "Some")
      assert.strictEqual(cluster.entityNamespace, fakeNamespace as any)
      assert.strictEqual(yield* cluster.provide(Effect.succeed("ok")), "ok")

      // `wake` resolves the singleton object lazily and calls its wake().
      const wake = cluster.wake("maintenance")
      assert.deepStrictEqual(wakeCalls, [])
      yield* wake()
      assert.deepStrictEqual(wakeCalls, ["Singleton/maintenance"])
    }))

  it.effect("the plan-time handle is inert", () =>
    Effect.gen(function*() {
      const cluster = inertClusterHandle()
      assert.strictEqual(yield* cluster.provide(Effect.succeed("ok")), "ok")
      yield* cluster.wake("maintenance")()
    }))
})
