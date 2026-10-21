import { NodeHttpServer } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { DockerApi } from "effect/docker"
import { HttpClient, HttpRouter } from "effect/http"
import { HttpApi, HttpApiBuilder, HttpApiClient } from "effect/http-api"

const Api = HttpApi.make("docker").add(DockerApi.Volumes)

const missing = new DockerApi.NotFound({ message: "get v: no such volume" })

const VolumesLayer = HttpApiBuilder.group(Api, "volumes", (handlers) =>
  handlers
    .handle("inspect", () => Effect.fail(missing))
    // the endpoints the test doesn't call
    .handle("list", () => Effect.die("unused"))
    .handle("create", () => Effect.die("unused"))
    .handle("update", () => Effect.die("unused"))
    .handle("remove", () => Effect.die("unused"))
    .handle("prune", () => Effect.die("unused")))

// a server passes requests through `EngineErrors`
const EngineErrorsLayer = Layer.succeed(DockerApi.EngineErrors, (effect) => effect)

const ServerLayer = HttpRouter.serve(
  HttpApiBuilder.layer(Api).pipe(Layer.provide(VolumesLayer), Layer.provide(EngineErrorsLayer)),
  { disableListenLog: true, disableLogger: true }
).pipe(Layer.provideMerge(NodeHttpServer.layerTest))

describe("DockerApi", () => {
  it.effect("serves a handler's error as the Engine answers it, and a client decodes it to its class", () =>
    Effect.gen(function*() {
      const response = yield* HttpClient.get("/volumes/v")
      assert.strictEqual(response.status, 404)
      assert.strictEqual(response.headers["content-type"], "application/json")
      assert.deepStrictEqual(yield* response.json, { message: "get v: no such volume" })

      const client = yield* HttpApiClient.make(Api)
      const error = yield* Effect.flip(client.volumes.inspect({ params: { name: "v" } }))
      assert.instanceOf(error, DockerApi.NotFound)
      assert.deepStrictEqual(error, missing)
    }).pipe(Effect.provide(ServerLayer)))
})
