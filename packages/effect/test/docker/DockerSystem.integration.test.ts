import { NodeDocker } from "@effect/platform-node"
import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import { DockerContainers, DockerEngine, DockerImages, DockerSystem } from "effect/docker"
import { ensureImage, image, layer, scopedContainer } from "./utils/live.ts"

it.layer(layer, { timeout: "120 seconds", excludeTestServices: true })("DockerSystem (live)", (it) => {
  it.effect("negotiates, and reports ping, version and info", () =>
    Effect.gen(function*() {
      const engine = yield* DockerEngine.DockerEngine
      const system = yield* DockerSystem.DockerSystem
      const apiVersion = yield* engine.apiVersion
      const ping = yield* system.ping
      assert.isDefined(ping.apiVersion)
      // the lower of the Engine's version and the client's maximum
      assert.match(apiVersion, /^1\.\d+$/)
      const version = yield* system.version
      assert.strictEqual(version.ApiVersion, ping.apiVersion)
      const info = yield* system.info
      assert.isDefined(info.ServerVersion)
      assert.strictEqual(ping.swarm?.nodeState, info.Swarm?.LocalNodeState)
      assert.strictEqual(ping.experimental, info.ExperimentalBuild)
    }), 60_000)

  it.effect("decodes the Engine's answers at the minimum API version, 1.44", () =>
    Effect.gen(function*() {
      assert.strictEqual(yield* (yield* DockerEngine.DockerEngine).apiVersion, "1.44")
      const system = yield* DockerSystem.DockerSystem
      yield* system.info
      yield* system.version
      yield* system.df()
      yield* ensureImage(image)
      const id = yield* scopedContainer({ Image: image, Cmd: ["true"] })
      assert.strictEqual((yield* DockerContainers.DockerContainers.use((containers) => containers.inspect(id))).Id, id)
      assert.isDefined((yield* DockerImages.DockerImages.use((images) => images.inspect(image))).Id)
      // `local`: a fresh engine, not the suite's, which an enclosing provide already built
    }).pipe(Effect.provide(NodeDocker.layerFromEnv({ apiVersion: "1.44" }), { local: true })), 60_000)
})
