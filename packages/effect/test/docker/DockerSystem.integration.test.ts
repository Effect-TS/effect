import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import { DockerContainers, DockerImages, DockerSystem } from "effect/docker"
import { ensureImage, image, layer, scopedContainer } from "./utils/live.ts"

it.layer(layer, { timeout: "120 seconds", excludeTestServices: true })("DockerSystem (live)", (it) => {
  it.effect("decodes the Engine's answers at API 1.52", () =>
    Effect.gen(function*() {
      const system = yield* DockerSystem.DockerSystem
      yield* system.info
      const version = yield* system.version
      // which Engine this ran against: 29.0 or 29.1 for the oldest supported, and a current one
      yield* Effect.logInfo(`Docker Engine ${version.Version}, API ${version.MinAPIVersion} to ${version.ApiVersion}`)
      yield* system.df()
      yield* ensureImage(image)
      const id = yield* scopedContainer({ Image: image, Cmd: ["true"] })
      assert.strictEqual((yield* DockerContainers.DockerContainers.use((containers) => containers.inspect(id))).Id, id)
      assert.isDefined((yield* DockerImages.DockerImages.use((images) => images.inspect(image))).Id)
    }), 60_000)
})
