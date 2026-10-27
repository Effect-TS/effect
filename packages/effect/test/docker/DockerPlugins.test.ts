import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { DockerPlugins } from "effect/docker"
import { json, makeStubEngine, ndjson, withPing } from "./utils/stub.ts"

describe("DockerPlugins", () => {
  it.effect("install removes nothing after a failed pull, whose name can be another install's", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", (request) =>
        request.url.pathname.endsWith("/privileges")
          ? json([])
          : {
            ...ndjson({ error: "plugin already exists", errorDetail: { message: "plugin already exists" } }),
            headers: { "content-type": "application/json", "docker-plugin-name": "sshfs:latest" }
          }))
      const error = yield* DockerPlugins.DockerPlugins.use((plugins) =>
        plugins.install("vieux/sshfs", { accept: Effect.succeed })
      ).pipe(stub.provide, Effect.flip)
      assert(typeof error !== "string" && error.reason._tag === "StreamFailed")
      assert.isFalse(stub.requests.some((request) => request.method === "DELETE"))
    }))
})
