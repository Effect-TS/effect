import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import { ConfigProvider, Effect, FileSystem, Path, Redacted } from "effect"
import { DockerConfig } from "effect/docker"
import { createHash } from "node:crypto"

const discover = (env: Record<string, string>) =>
  Effect.gen(function*() {
    return yield* DockerConfig.DockerConfig
  }).pipe(
    Effect.provide(DockerConfig.layerFromEnv()),
    Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromEnv({ env }))
  )

const configDir = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const dir = yield* fs.makeTempDirectoryScoped()
  const write = Effect.fnUntraced(function*(file: string, content: string) {
    const target = path.join(dir, file)
    yield* fs.makeDirectory(path.dirname(target), { recursive: true })
    yield* fs.writeFileString(target, content)
  })
  const context = Effect.fnUntraced(function*(name: string, host: string) {
    const hash = createHash("sha256").update(name).digest("hex")
    yield* write(
      `contexts/meta/${hash}/meta.json`,
      JSON.stringify({ Name: name, Endpoints: { docker: { Host: host } } })
    )
  })
  return { dir, write, context }
})

describe("DockerConfig", () => {
  it.effect("discovers the endpoint from host, named context, then current context", () =>
    Effect.gen(function*() {
      const { context, dir, write } = yield* configDir
      yield* context("named", "unix:///run/named.sock")
      yield* context("current", "unix:///run/current.sock")
      yield* write("config.json", JSON.stringify({ currentContext: "current" }))
      const cases = [
        [{ DOCKER_HOST: "tcp://remote:2375", DOCKER_CONTEXT: "named" }, { _tag: "Tcp", host: "remote", port: 2375 }],
        [{ DOCKER_CONTEXT: "named" }, { _tag: "Unix", path: "/run/named.sock" }],
        [{}, { _tag: "Unix", path: "/run/current.sock" }]
      ] as const
      for (const [env, endpoint] of cases) {
        assert.deepStrictEqual((yield* discover({ DOCKER_CONFIG: dir, ...env })).endpoint, endpoint)
      }
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("requires a CA for verified TLS and loads the client certificate", () =>
    Effect.gen(function*() {
      const { dir, write } = yield* configDir
      const env = { DOCKER_CONFIG: dir, DOCKER_HOST: "tcp://remote:2376", DOCKER_TLS_VERIFY: "1" }
      const error = yield* discover(env).pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "UnreadableCertificate")
      yield* write("ca.pem", "CA")
      yield* write("cert.pem", "CERT")
      yield* write("key.pem", "KEY")
      const { endpoint } = yield* discover(env)
      assert(endpoint._tag === "Tcp")
      assert.isTrue(endpoint.tls?.verify)
      assert.strictEqual(endpoint.tls?.ca, "CA")
      assert.strictEqual(endpoint.tls?.clientCertificate?.cert, "CERT")
      assert.strictEqual(Redacted.value(endpoint.tls!.clientCertificate!.key), "KEY")
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("explicit configuration bypasses environment and file discovery", () =>
    Effect.gen(function*() {
      const { dir, write } = yield* configDir
      yield* write("config.json", "not json")
      const config = yield* Effect.gen(function*() {
        return yield* DockerConfig.DockerConfig
      }).pipe(
        Effect.provide(DockerConfig.layer({ httpHeaders: { "X-Explicit": "1" } })),
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromEnv({
            env: { DOCKER_CONFIG: dir, DOCKER_CONTEXT: "missing" }
          })
        )
      )
      assert.deepStrictEqual(config.endpoint, DockerConfig.defaultEndpoint)
      assert.deepStrictEqual(config.httpHeaders, { "X-Explicit": "1" })
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("accepts DOCKER_API_VERSION only as the one API version the client speaks, 1.52", () =>
    Effect.gen(function*() {
      const { dir } = yield* configDir
      yield* discover({ DOCKER_CONFIG: dir, DOCKER_API_VERSION: "1.52" })
      for (const version of ["1.44", "1.56"]) {
        const error = yield* discover({ DOCKER_CONFIG: dir, DOCKER_API_VERSION: version }).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "InvalidConfig", version)
      }
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("on Windows, finds the config in USERPROFILE and falls back to the default pipe", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const { context, dir, write } = yield* configDir
      yield* context("desktop", "npipe:////./pipe/dockerDesktopLinuxEngine")
      yield* write("config.json", JSON.stringify({ currentContext: "desktop" }))
      const userProfile = yield* fs.makeTempDirectoryScoped()
      yield* fs.symlink(dir, `${userProfile}/.docker`)
      // as NodeDocker.layerFromEnv configures it on Windows; HOME, as Git Bash sets it, is ignored
      const onWindows = (env: Record<string, string>) =>
        Effect.gen(function*() {
          return (yield* DockerConfig.DockerConfig).endpoint
        }).pipe(
          Effect.provide(DockerConfig.layerFromEnv(undefined, {
            defaultEndpoint: DockerConfig.defaultNpipeEndpoint,
            homeVariable: "USERPROFILE"
          })),
          Effect.provideService(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromEnv({ env: { USERPROFILE: userProfile, HOME: "/nonexistent", ...env } })
          )
        )
      assert.deepStrictEqual(yield* onWindows({}), { _tag: "Npipe", path: "//./pipe/dockerDesktopLinuxEngine" })
      assert.deepStrictEqual(yield* onWindows({ DOCKER_CONTEXT: "default" }), DockerConfig.defaultNpipeEndpoint)
    }).pipe(Effect.provide(NodeServices.layer)))
})
