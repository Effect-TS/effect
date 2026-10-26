import { assert, describe, it } from "@effect/vitest"
import { Effect, Stream } from "effect"
import { DockerApi, DockerPlugins } from "effect/docker"
import { HttpApi, HttpApiBuilder, HttpApiGroup, HttpApiSchema } from "effect/http-api"
import { fakeEngine } from "./utils/fake.ts"

const Served = HttpApi.make("docker").add(
  HttpApiGroup.make("plugins").add(
    DockerApi.Plugins.endpoints.privileges,
    DockerApi.Plugins.endpoints.pull,
    DockerApi.Plugins.endpoints.set,
    DockerApi.Plugins.endpoints.enable
  ).middleware(DockerApi.EngineErrors)
)

const privileges = [{ Name: "network", Description: "permissions to access a network", Value: ["host"] }]

const received: Array<string> = []

const Handlers = HttpApiBuilder.group(Served, "plugins", (handlers) =>
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
          body: Stream.make({ status: "Pulling from vieux/sshfs" }),
          headers: { "docker-plugin-name": "sshfs:latest" }
        })
      }))
    .handle("set", ({ params, payload }) =>
      Effect.sync(() => {
        received.push(`set ${params.name} ${payload.join(",")}`)
      }))
    .handle(
      "enable",
      ({ params, query }) =>
        Effect.sync(() => {
          received.push(`enable ${params.name} ${query.timeout}`)
        })
    ))

describe("DockerPlugins", () => {
  it.effect("round-trips DockerApi: install pulls with the accepted privileges, configures and enables", () =>
    Effect.gen(function*() {
      const plugins = yield* DockerPlugins.DockerPlugins
      const name = yield* plugins.install("vieux/sshfs", { accept: Effect.succeed, args: ["DEBUG=1"] })
      assert.strictEqual(name, "sshfs:latest")
      assert.deepStrictEqual(received, [
        "privileges vieux/sshfs",
        `pull vieux/sshfs ${JSON.stringify(privileges)}`,
        "set sshfs:latest DEBUG=1",
        "enable sshfs:latest 0"
      ])
    }).pipe(Effect.provide(fakeEngine(Served, Handlers))))
})
