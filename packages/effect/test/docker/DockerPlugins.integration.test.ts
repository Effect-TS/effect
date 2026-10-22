import { assert, it } from "@effect/vitest"
import { Effect, Schedule, Stream } from "effect"
import { DockerContainers, DockerImages, DockerPlugins } from "effect/docker"
import { Tar } from "effect/encoding"
import { layer } from "./utils/dind.ts"

const Plugins = DockerPlugins.DockerPlugins

const registryImage = "docker.io/library/registry:2"
const reference = "localhost:5000/effect-verify:latest"

/**
 * A volume plugin whose entrypoint doesn't exist: it can be created, pushed,
 * pulled and upgraded, and fails to enable at once.
 */
const pluginContext = Stream.make(
  Tar.directory("rootfs"),
  Tar.file(
    "config.json",
    JSON.stringify({
      Description: "effect/docker live test plugin",
      Documentation: "",
      Entrypoint: ["/missing"],
      Interface: { Types: ["docker.volumedriver/1.0"], Socket: "verify.sock" },
      Network: { Type: "none" },
      Env: [{ Name: "DEBUG", Description: "", Settable: ["value"], Value: "0" }]
    })
  )
).pipe(Stream.pipeThroughChannel(Tar.encode()), Stream.orDie)

/** Starts a `registry:2` in the private Engine, on its `localhost:5000`. */
const registry = Effect.gen(function*() {
  const containers = yield* DockerContainers.DockerContainers
  yield* Stream.runDrain(
    DockerImages.DockerImages.use((images) => Effect.succeed(images.pull(registryImage))).pipe(
      Stream.unwrap
    )
  )
  const { Id } = yield* containers.create({
    Image: registryImage,
    ExposedPorts: { "5000/tcp": {} },
    HostConfig: { PortBindings: { "5000/tcp": [{ HostIp: "127.0.0.1", HostPort: "5000" }] } }
  })
  yield* containers.start(Id)
})

it.layer(layer, { timeout: "300 seconds", excludeTestServices: true })("DockerPlugins (live, dind)", (it) => {
  it.effect("creates, configures, pushes, pulls, upgrades and installs a plugin", () =>
    Effect.gen(function*() {
      const plugins = yield* Plugins
      yield* registry

      yield* plugins.create(reference, pluginContext)
      const created = yield* plugins.inspect(reference)
      assert.isFalse(created.Enabled)
      yield* plugins.set(reference, ["DEBUG=1"])
      assert.include((yield* plugins.inspect(reference)).Settings.Env, "DEBUG=1")
      const pushed = yield* plugins.push(reference).pipe(
        // until the registry listens
        Effect.retry({ schedule: Schedule.spaced("500 millis"), times: 40 })
      )
      assert.match(pushed.Digest ?? "", /^sha256:/)
      yield* plugins.remove(reference)
      assert.deepStrictEqual(yield* plugins.list(), [])

      const privileges = yield* plugins.privileges(reference)
      assert.deepStrictEqual(privileges.map((privilege) => [privilege.Name, privilege.Value]), [["network", ["none"]]])
      const refused = yield* Effect.flip(Stream.runDrain(plugins.pull(reference, { privileges: [], name: "refused" })))
      assert(refused.reason._tag === "StreamFailed")
      assert.strictEqual(refused.reason.message, "incorrect privileges")
      assert.deepStrictEqual(yield* plugins.list(), [])

      // enabling fails, so install removes it again
      const failed = yield* Effect.flip(plugins.install(reference, { accept: Effect.succeed, name: "enabled" }))
      assert(typeof failed !== "string")
      assert.strictEqual(failed.reason._tag, "ServerError", failed.message)
      assert.deepStrictEqual(yield* plugins.list(), [])

      const name = yield* plugins.install(reference, { accept: Effect.succeed, name: "kept", disabled: true })
      assert.strictEqual(name, "kept:latest")
      yield* Stream.runDrain(plugins.upgrade(name, reference, { privileges }))
      assert.strictEqual((yield* plugins.inspect(name)).PluginReference, reference)
      yield* plugins.remove(name)
      const missing = yield* Effect.flip(plugins.inspect(name))
      assert.strictEqual(missing.reason._tag, "NotFound")
    }), 180_000)
})
