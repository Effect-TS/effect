import { HttpClientRequest, HttpRouter, HttpServer, HttpServerResponse } from "@effect/platform"
import { BunHttpServer } from "@effect/platform-bun"
import { expect, it } from "bun:test"
import { Effect } from "effect"

it("BunHttpTest", () =>
  Effect.gen(function*(_) {
    yield* HttpRouter.empty.pipe(
      HttpRouter.get("/", HttpServerResponse.text("Hello, World!")),
      HttpServer.serveEffect()
    )
    const response1 = yield* HttpClientRequest.get("/")
    expect(response1.status).toEqual(200)
    expect(yield* response1.text).toEqual("Hello, World!")

    const response2 = yield* HttpClientRequest.get("/non-existing")
    expect(response2.status).toEqual(404)
  }).pipe(Effect.provide(BunHttpServer.layerTest), Effect.scoped, Effect.runPromise))
