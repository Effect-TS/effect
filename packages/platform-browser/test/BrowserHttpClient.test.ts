import { HttpClient } from "@effect/platform"
import { BrowserHttpClient } from "@effect/platform-browser"
import { assert, describe, it } from "@effect/vitest"
import { Chunk, Effect, Stream } from "effect"
import * as MXHR from "mock-xmlhttprequest"

describe("BrowserHttpClient", () => {
  it.effect("json", () =>
    Effect.gen(function*(_) {
      const server = MXHR.newServer({
        get: ["http://localhost:8080/my/url", {
          headers: { "Content-Type": "application/json" },
          body: "{ \"message\": \"Success!\" }"
        }]
      })
      const body = yield* _(
        HttpClient.request.get("http://localhost:8080/my/url"),
        BrowserHttpClient.xmlHttpRequest,
        Effect.flatMap((_) => _.json),
        Effect.scoped,
        Effect.locally(BrowserHttpClient.currentXMLHttpRequest, server.xhrFactory)
      )
      assert.deepStrictEqual(body, { message: "Success!" })
    }))

  it.effect("stream", () =>
    Effect.gen(function*(_) {
      const server = MXHR.newServer({
        get: ["http://localhost:8080/my/url", {
          headers: { "Content-Type": "application/json" },
          body: "{ \"message\": \"Success!\" }"
        }]
      })
      const body = yield* _(
        HttpClient.request.get("http://localhost:8080/my/url"),
        BrowserHttpClient.xmlHttpRequest,
        Effect.map((_) =>
          _.stream.pipe(
            Stream.decodeText(),
            Stream.mkString
          )
        ),
        Stream.unwrapScoped,
        Stream.runCollect,
        Effect.locally(BrowserHttpClient.currentXMLHttpRequest, server.xhrFactory)
      )
      assert.deepStrictEqual(Chunk.unsafeHead(body), "{ \"message\": \"Success!\" }")
    }))

  it.effect("cookies", () =>
    Effect.gen(function*(_) {
      const server = MXHR.newServer({
        get: ["http://localhost:8080/my/url", {
          headers: { "Content-Type": "application/json", "Set-Cookie": "foo=bar; HttpOnly; Secure" },
          body: "{ \"message\": \"Success!\" }"
        }]
      })
      const cookies = yield* _(
        HttpClient.request.get("http://localhost:8080/my/url"),
        BrowserHttpClient.xmlHttpRequest,
        Effect.map((res) => res.cookies),
        Effect.scoped,
        Effect.locally(BrowserHttpClient.currentXMLHttpRequest, server.xhrFactory)
      )
      assert.deepStrictEqual(HttpClient.cookies.toRecord(cookies), {
        foo: "bar"
      })
    }))

  it.effect("arrayBuffer", () =>
    Effect.gen(function*(_) {
      const server = MXHR.newServer({
        get: ["http://localhost:8080/my/url", {
          headers: { "Content-Type": "application/json" },
          body: "{ \"message\": \"Success!\" }"
        }]
      })
      const body = yield* _(
        HttpClient.request.get("http://localhost:8080/my/url"),
        BrowserHttpClient.xmlHttpRequest,
        HttpClient.response.arrayBuffer,
        BrowserHttpClient.withXHRArrayBuffer,
        Effect.locally(BrowserHttpClient.currentXMLHttpRequest, server.xhrFactory)
      )
      assert.strictEqual(new TextDecoder().decode(body), "{ \"message\": \"Success!\" }")
    }))
})
