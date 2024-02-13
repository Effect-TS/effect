import { HttpClient } from "@effect/platform"
import { BrowserHttpClient } from "@effect/platform-browser"
import { Chunk, Effect, Stream } from "effect"
import * as MXHR from "mock-xmlhttprequest"
import { assert, describe, test } from "vitest"

describe("BrowserHttpClient", () => {
  test("json", () =>
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
    }).pipe(Effect.runPromise))

  test("stream", () =>
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
    }).pipe(Effect.runPromise))
})
