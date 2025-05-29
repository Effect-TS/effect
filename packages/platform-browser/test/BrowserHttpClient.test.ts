import { Cookies, HttpClient } from "@effect/platform"
import { BrowserHttpClient } from "@effect/platform-browser"
import { assert, describe, it } from "@effect/vitest"
import { Chunk, Effect, Layer, Stream } from "effect"
import * as MXHR from "mock-xmlhttprequest"

const layer = (...args: Parameters<typeof MXHR.newServer>) =>
  Layer.unwrapEffect(Effect.sync(() => {
    const server = MXHR.newServer(...args)
    return BrowserHttpClient.layerXMLHttpRequest.pipe(
      Layer.provide(Layer.succeed(BrowserHttpClient.XMLHttpRequest, server.xhrFactory))
    )
  }))

describe("BrowserHttpClient", () => {
  it.effect("json", () =>
    Effect.gen(function*() {
      const body = yield* HttpClient.get("http://localhost:8080/my/url").pipe(
        Effect.flatMap((_) => _.json)
      )
      assert.deepStrictEqual(body, { message: "Success!" })
    }).pipe(Effect.provide(layer({
      get: ["http://localhost:8080/my/url", {
        headers: { "Content-Type": "application/json" },
        body: "{ \"message\": \"Success!\" }"
      }]
    }))))

  it.effect("stream", () =>
    Effect.gen(function*() {
      const body = yield* HttpClient.get("http://localhost:8080/my/url").pipe(
        Effect.map((_) =>
          _.stream.pipe(
            Stream.decodeText(),
            Stream.mkString
          )
        ),
        Stream.unwrapScoped,
        Stream.runCollect
      )
      assert.deepStrictEqual(Chunk.unsafeHead(body), "{ \"message\": \"Success!\" }")
    }).pipe(Effect.provide(layer({
      get: ["http://localhost:8080/my/url", {
        headers: { "Content-Type": "application/json" },
        body: "{ \"message\": \"Success!\" }"
      }]
    }))))

  it.effect("cookies", () =>
    Effect.gen(function*() {
      const cookies = yield* HttpClient.get("http://localhost:8080/my/url").pipe(
        Effect.map((res) => res.cookies)
      )
      assert.deepStrictEqual(Cookies.toRecord(cookies), {
        foo: "bar"
      })
    }).pipe(
      Effect.provide(layer({
        get: ["http://localhost:8080/my/url", {
          headers: { "Content-Type": "application/json", "Set-Cookie": "foo=bar; HttpOnly; Secure" },
          body: "{ \"message\": \"Success!\" }"
        }]
      }))
    ))

  it.effect("arrayBuffer", () =>
    Effect.gen(function*() {
      const body = yield* HttpClient.get("http://localhost:8080/my/url").pipe(
        Effect.flatMap((_) => _.arrayBuffer),
        BrowserHttpClient.withXHRArrayBuffer
      )
      assert.strictEqual(new TextDecoder().decode(body), "{ \"message\": \"Success!\" }")
    }).pipe(
      Effect.provide(layer({
        get: ["http://localhost:8080/my/url", {
          headers: { "Content-Type": "application/json" },
          body: "{ \"message\": \"Success!\" }"
        }]
      }))
    ))

  it.effect("arrayBuffer without withXHRArrayBuffer", () =>
    Effect.gen(function*() {
      const body = yield* HttpClient.get("http://localhost:8080/my/url").pipe(
        Effect.flatMap((_) => _.arrayBuffer)
      )
      assert.strictEqual(new TextDecoder().decode(body), "{ \"message\": \"Success!\" }")
    }).pipe(
      Effect.provide(layer({
        get: ["http://localhost:8080/my/url", {
          headers: { "Content-Type": "application/json" },
          body: "{ \"message\": \"Success!\" }"
        }]
      }))
    ))
})
