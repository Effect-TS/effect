import * as BunHttpClient from "@effect/platform-bun/BunHttpClient"
import { assert, describe, it } from "@effect/vitest"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as Layer from "effect/Layer"
import * as Fs from "node:fs"
import * as Os from "node:os"
import * as Path from "node:path"

const echoServer = (name: string) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const directory = Fs.mkdtempSync(Path.join(Os.tmpdir(), "bun-http-client-"))
      const unix = Path.join(directory, "server.sock")
      const server = Bun.serve({
        unix,
        fetch: async (request) =>
          Response.json({
            name,
            method: request.method,
            body: await request.text(),
            headers: {
              default: request.headers.get("x-default"),
              request: request.headers.get("x-request")
            }
          })
      })
      return { directory, server, unix }
    }),
    ({ directory, server }) =>
      Effect.promise(() => server.stop(true)).pipe(
        Effect.andThen(Effect.sync(() => Fs.rmSync(directory, { recursive: true, force: true })))
      )
  ).pipe(Effect.map(({ unix }) => unix))

const send = (client: HttpClient.HttpClient, request = HttpClientRequest.get("http://localhost/")) =>
  client.execute(request).pipe(
    Effect.flatMap((response) => response.json),
    Effect.scoped
  )

class ClientA extends Context.Service<ClientA, HttpClient.HttpClient>()("ClientA") {}
class ClientB extends Context.Service<ClientB, HttpClient.HttpClient>()("ClientB") {}

describe("BunHttpClient", () => {
  it.effect("layerOptions applies native options without replacing request fields", () =>
    Effect.gen(function*() {
      const unix = yield* echoServer("server")
      const response = yield* HttpClient.HttpClient.use((client) =>
        send(
          client,
          HttpClientRequest.post("http://localhost/").pipe(
            HttpClientRequest.setHeader("x-request", "request"),
            HttpClientRequest.bodyText("hello")
          )
        )
      ).pipe(
        Effect.provide(BunHttpClient.layerOptions({ unix, headers: { "x-default": "default" } }))
      )
      assert.deepStrictEqual(response, {
        name: "server",
        method: "POST",
        body: "hello",
        headers: { default: "default", request: "request" }
      })
    }))

  it.effect("layerOptions keeps native options when an ambient RequestInit is provided", () =>
    Effect.gen(function*() {
      const unix = yield* echoServer("server")
      const response = yield* HttpClient.HttpClient.use((client) =>
        send(client).pipe(
          Effect.provideService(BunHttpClient.RequestInit, { headers: { "x-default": "ambient" } })
        )
      ).pipe(
        Effect.provide(BunHttpClient.layerOptions({ unix }))
      )
      assert.deepStrictEqual(response, {
        name: "server",
        method: "GET",
        body: "",
        headers: { default: "ambient", request: null }
      })
    }))

  it.effect("layerOptions keeps RequestInit defaults provided to the layer", () =>
    Effect.gen(function*() {
      const unix = yield* echoServer("server")
      const responses = yield* HttpClient.HttpClient.use((client) =>
        Effect.all([
          send(client),
          send(client).pipe(
            Effect.provideService(BunHttpClient.RequestInit, { headers: { "x-default": "ambient" } })
          )
        ])
      ).pipe(
        Effect.provide(
          BunHttpClient.layerOptions({ unix }).pipe(
            Layer.provide(Layer.succeed(BunHttpClient.RequestInit, { headers: { "x-default": "build" } }))
          )
        )
      )
      assert.deepStrictEqual(responses, [
        { name: "server", method: "GET", body: "", headers: { default: "build", request: null } },
        { name: "server", method: "GET", body: "", headers: { default: "ambient", request: null } }
      ])
    }))

  it.effect("layerOptions layers built together keep their own options", () =>
    Effect.gen(function*() {
      const a = yield* echoServer("a")
      const b = yield* echoServer("b")
      const names = yield* Effect.all([ClientA.use(send), ClientB.use(send)]).pipe(
        Effect.map((responses) => responses.map((response) => (response as { name: string }).name)),
        Effect.provide(Layer.mergeAll(
          Layer.effect(ClientA, HttpClient.HttpClient).pipe(Layer.provide(BunHttpClient.layerOptions({ unix: a }))),
          Layer.effect(ClientB, HttpClient.HttpClient).pipe(Layer.provide(BunHttpClient.layerOptions({ unix: b })))
        ))
      )
      assert.deepStrictEqual(names, ["a", "b"])
    }))
})
