import { NodeHttpServer } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { DockerApi, DockerError } from "effect/docker"
import { HttpClient, HttpRouter } from "effect/http"
import { HttpApi, HttpApiBuilder, HttpApiClient } from "effect/http-api"

const Api = HttpApi.make("docker").add(DockerApi.Volumes)

const missing = new DockerError.NotFound({ message: "get v: no such volume" })
const outsideSwarm = new DockerError.SwarmUnavailable({ message: "This node is not a swarm manager." })

const VolumesLayer = HttpApiBuilder.group(Api, "volumes", (handlers) =>
  handlers
    .handle("inspect", () => Effect.fail(missing))
    // the endpoints the test doesn't call
    .handle("list", () => Effect.die("unused"))
    .handle("create", () => Effect.die("unused"))
    .handle("update", () => Effect.fail(outsideSwarm))
    .handle("remove", () => Effect.die("unused"))
    .handle("prune", () => Effect.die("unused")))

// a server passes requests through `EngineErrors` and `SwarmErrors`
const ErrorsLayer = Layer.mergeAll(
  Layer.succeed(DockerApi.EngineErrors, (effect) => effect),
  Layer.succeed(DockerApi.SwarmErrors, (effect) => effect)
)

const ServerLayer = HttpRouter.serve(
  HttpApiBuilder.layer(Api).pipe(Layer.provide(VolumesLayer), Layer.provide(ErrorsLayer)),
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
      assert.instanceOf(error, DockerError.NotFound)
      assert.deepStrictEqual(error, missing)

      // a Swarm endpoint's 503
      const unavailable = yield* Effect.flip(
        client.volumes.update({ params: { name: "v" }, query: { version: 1 }, payload: {} })
      )
      assert.deepStrictEqual(unavailable, outsideSwarm)
    }).pipe(Effect.provide(ServerLayer)))
})
