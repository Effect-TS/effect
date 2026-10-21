import * as DenoHttpClient from "@effect/platform-deno/DenoHttpClient"
import { assert, describe, it } from "@effect/vitest"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"

const echoServer = Effect.acquireRelease(
  Effect.sync(() => {
    const directory = Deno.makeTempDirSync()
    const path = `${directory}/http.sock`
    const server = Deno.serve({ path, transport: "unix", onListen: () => {} }, async (request) =>
      Response.json({
        method: request.method,
        body: await request.text(),
        headers: {
          default: request.headers.get("x-default"),
          request: request.headers.get("x-request")
        }
      }))
    return { directory, path, server }
  }),
  ({ directory, server }) =>
    Effect.promise(() => server.shutdown()).pipe(
      Effect.andThen(Effect.sync(() => Deno.removeSync(directory, { recursive: true })))
    )
).pipe(Effect.map(({ path }) => path))

const post = (client: HttpClient.HttpClient) =>
  client.execute(
    HttpClientRequest.post("http://localhost/").pipe(
      HttpClientRequest.setHeader("x-request", "request"),
      HttpClientRequest.bodyText("hello")
    )
  ).pipe(
    Effect.flatMap((response) => response.json),
    Effect.scoped
  )

describe("DenoHttpClient", () => {
  it.effect("layerOptions sends requests through the native client without replacing request fields", () =>
    Effect.gen(function*() {
      const path = yield* echoServer
      const response = yield* HttpClient.HttpClient.use(post).pipe(
        Effect.provide(DenoHttpClient.layerOptions({ proxy: { transport: "unix", path } }))
      )
      assert.deepStrictEqual(response, {
        method: "POST",
        body: "hello",
        headers: { default: null, request: "request" }
      })
    }))

  it.effect("layerOptions keeps the native client when an ambient RequestInit is provided", () =>
    Effect.gen(function*() {
      const path = yield* echoServer
      const response = yield* HttpClient.HttpClient.use(post).pipe(
        Effect.provideService(DenoHttpClient.RequestInit, { headers: { "x-default": "ambient" } }),
        Effect.provide(DenoHttpClient.layerOptions({ proxy: { transport: "unix", path } }))
      )
      assert.deepStrictEqual(response, {
        method: "POST",
        body: "hello",
        headers: { default: "ambient", request: "request" }
      })
    }))

  it.effect("layerOptions closes the native client when the layer scope closes", () =>
    Effect.gen(function*() {
      const path = yield* echoServer
      const scope = yield* Scope.make()
      const context = yield* Layer.buildWithScope(
        DenoHttpClient.layerOptions({ proxy: { transport: "unix", path } }),
        scope
      )
      const client = Context.get(context, HttpClient.HttpClient)
      assert.isTrue(Exit.isSuccess(yield* Effect.exit(post(client))))
      yield* Scope.close(scope, Exit.void)
      assert.isTrue(Exit.isFailure(yield* Effect.exit(post(client))))
    }))
})
