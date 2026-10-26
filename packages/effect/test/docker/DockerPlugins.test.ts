import { assert, describe, it } from "@effect/vitest"
import { Effect, Stream } from "effect"
import { DockerApi, DockerError, DockerPlugins } from "effect/docker"
import { HttpApi, HttpApiBuilder, HttpApiGroup, HttpApiSchema } from "effect/http-api"
import { fakeEngine } from "./utils/fake.ts"

const Served = HttpApi.make("docker").add(
  HttpApiGroup.make("plugins").add(
    DockerApi.Plugins.endpoints.privileges,
    DockerApi.Plugins.endpoints.pull,
    DockerApi.Plugins.endpoints.set,
    DockerApi.Plugins.endpoints.enable,
    DockerApi.Plugins.endpoints.remove
  ).middleware(DockerApi.EngineErrors)
)

const privileges = [{ Name: "network", Description: "permissions to access a network", Value: ["host"] }]

/** An Engine whose pull and enable can fail, recording each request it receives. */
const makeEngine = (options?: { readonly pullFails?: boolean; readonly enableFails?: boolean }) => {
  const received: Array<string> = []
  const handlers = HttpApiBuilder.group(Served, "plugins", (handlers) =>
    handlers
      .handle("privileges", ({ query }) =>
        Effect.sync(() => {
          received.push(`privileges ${query.remote}`)
          return privileges
        }))
      .handle("pull", ({ payload, query }) =>
        Effect.sync(() => {
          received.push(`pull ${query.remote} ${JSON.stringify(payload)}`)
          return HttpApiSchema.withHeaders({
            body: options?.pullFails === true
              // the Engine fails a pull in band, as when another install created the name first
              ? Stream.make({ status: "Pulling from vieux/sshfs" }, {
                error: "plugin sshfs:latest already exists",
                errorDetail: { message: "plugin sshfs:latest already exists" }
              })
              : Stream.make({ status: "Pulling from vieux/sshfs" }),
            headers: { "docker-plugin-name": "sshfs:latest" }
          })
        }))
      .handle("set", ({ params, payload }) =>
        Effect.sync(() => {
          received.push(`set ${params.name} ${payload.join(",")}`)
        }))
      .handle("enable", ({ params, query }) =>
        Effect.suspend(() => {
          received.push(`enable ${params.name} ${query.timeout}`)
          return options?.enableFails === true
            ? Effect.fail(new DockerError.ServerError({ message: "dial unix verify.sock: no such file or directory" }))
            : Effect.void
        }))
      .handle("remove", ({ params, query }) =>
        Effect.sync(() => {
          received.push(`remove ${params.name} force=${query.force}`)
        })))
  return { received, layer: fakeEngine(Served, handlers) }
}

describe("DockerPlugins", () => {
  it.effect("round-trips DockerApi: install pulls with the accepted privileges, configures and enables", () => {
    const engine = makeEngine()
    return Effect.gen(function*() {
      const plugins = yield* DockerPlugins.DockerPlugins
      const name = yield* plugins.install("vieux/sshfs", { accept: Effect.succeed, args: ["DEBUG=1"] })
      assert.strictEqual(name, "sshfs:latest")
      assert.deepStrictEqual(engine.received, [
        "privileges vieux/sshfs",
        `pull vieux/sshfs ${JSON.stringify(privileges)}`,
        "set sshfs:latest DEBUG=1",
        "enable sshfs:latest 0"
      ])
    }).pipe(Effect.provide(engine.layer))
  })

  it.effect("install removes only a plugin it pulled: not after a failed pull, but after a later step fails", () =>
    Effect.gen(function*() {
      // a failed pull installed nothing, and the name can belong to another install
      const failedPull = makeEngine({ pullFails: true })
      const pullError = yield* DockerPlugins.DockerPlugins.use((plugins) =>
        plugins.install("vieux/sshfs", { accept: Effect.succeed })
      ).pipe(Effect.provide(failedPull.layer), Effect.flip)
      assert(DockerError.isDockerError(pullError) && pullError.reason._tag === "StreamFailed")
      assert.isFalse(failedPull.received.some((request) => request.startsWith("remove")))
      const failedEnable = makeEngine({ enableFails: true })
      const enableError = yield* DockerPlugins.DockerPlugins.use((plugins) =>
        plugins.install("vieux/sshfs", { accept: Effect.succeed })
      ).pipe(Effect.provide(failedEnable.layer), Effect.flip)
      assert(DockerError.isDockerError(enableError) && enableError.reason._tag === "ServerError")
      assert.strictEqual(failedEnable.received.at(-1), "remove sshfs:latest force=true")
    }))
})
