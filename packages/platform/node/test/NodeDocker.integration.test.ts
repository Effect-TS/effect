import { NodeDocker } from "@effect/platform-node"
import { assert, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { DockerConfig, DockerEngine, DockerSystem } from "effect/docker"

// the static defaults: the runner's Docker at /var/run/docker.sock
it.layer(NodeDocker.layer.pipe(Layer.provide(DockerConfig.layer())), {
  timeout: "120 seconds",
  excludeTestServices: true
})("NodeDocker", (it) => {
  it.effect("negotiates over the default socket", () =>
    Effect.gen(function*() {
      const engine = yield* DockerEngine.DockerEngine
      assert.match(yield* engine.apiVersion, /^1\.\d+$/)
      const info = yield* DockerSystem.DockerSystem.use((system) => system.info)
      assert.isDefined(info.ServerVersion)
    }), 60_000)
})
