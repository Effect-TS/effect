import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import { DockerSwarm, DockerSwarmConfigs } from "effect/docker"
import { layer } from "./utils/dind.ts"

// padded standard base64 `+/8=`, which the Engine requires
const bytes = Uint8Array.of(0xfb, 0xff)

it.layer(layer, { timeout: "300 seconds", excludeTestServices: true })("DockerSwarmConfigs (live, dind)", (it) => {
  it.effect("creates a config, reads its data back, updates its labels and removes it", () =>
    Effect.gen(function*() {
      const configs = yield* DockerSwarmConfigs.DockerSwarmConfigs
      yield* DockerSwarm.DockerSwarm.use((swarm) =>
        swarm.init({ ListenAddr: "0.0.0.0:2377", AdvertiseAddr: "127.0.0.1:2377" })
      )
      const { ID } = yield* configs.create({ Name: "conf", Data: bytes })
      const config = yield* configs.inspect("conf")
      assert.strictEqual(config.ID, ID)
      assert.deepStrictEqual(config.Spec?.Data, bytes)
      yield* configs.update("conf", { ...config.Spec, Labels: { rev: "2" } }, { version: config.Version!.Index! })
      const [listed] = yield* configs.list({ filters: { name: "conf" } })
      assert.deepStrictEqual(listed.Spec?.Labels, { rev: "2" })
      const stale = yield* Effect.flip(configs.update("conf", config.Spec!, { version: config.Version!.Index! }))
      assert(stale.reason._tag === "ServerError")
      assert.include(stale.reason.message, "update out of sequence")
      yield* configs.remove("conf")
      const missing = yield* Effect.flip(configs.inspect("conf"))
      assert.strictEqual(missing.reason._tag, "NotFound")
    }), 180_000)
})
