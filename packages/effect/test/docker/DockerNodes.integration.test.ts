import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import { DockerNodes, DockerSwarm } from "effect/docker"
import { layer } from "./utils/dind.ts"

const Nodes = DockerNodes.DockerNodes

it.layer(layer, { timeout: "300 seconds", excludeTestServices: true })("DockerNodes (live, dind)", (it) => {
  it.effect("lists, inspects and updates the manager, and refuses to remove it", () =>
    Effect.gen(function*() {
      const nodes = yield* Nodes
      const nodeId = yield* DockerSwarm.DockerSwarm.use((swarm) =>
        swarm.init({ ListenAddr: "0.0.0.0:2377", AdvertiseAddr: "127.0.0.1:2377" })
      )
      const [listed] = yield* nodes.list({ filters: { role: "manager" } })
      assert.strictEqual(listed.ID, nodeId)
      const node = yield* nodes.inspect(nodeId)
      assert.strictEqual(node.Spec?.Role, "manager")
      yield* nodes.update(nodeId, { ...node.Spec, Labels: { zone: "a" } }, { version: node.Version!.Index! })
      const updated = yield* nodes.inspect(nodeId)
      assert.deepStrictEqual(updated.Spec?.Labels, { zone: "a" })
      const labelled = yield* nodes.list({ filters: { "node.label": "zone=a" } })
      assert.deepStrictEqual(labelled.map((node) => node.ID), [nodeId])
      const stale = yield* Effect.flip(nodes.update(nodeId, updated.Spec!, { version: node.Version!.Index! }))
      assert(stale.reason._tag === "ServerError")
      assert.include(stale.reason.message, "update out of sequence")
      yield* nodes.modify(nodeId, (spec) => ({ ...spec, Labels: { ...spec.Labels, tier: "x" } }))
      assert.deepStrictEqual((yield* nodes.inspect(nodeId)).Spec?.Labels, { zone: "a", tier: "x" })
      const manager = yield* Effect.flip(nodes.remove(nodeId, { force: true }))
      assert.strictEqual(manager.reason._tag, "BadRequest")
      const missing = yield* Effect.flip(nodes.inspect("no-such-node"))
      assert.strictEqual(missing.reason._tag, "NotFound")
    }), 120_000)
})
