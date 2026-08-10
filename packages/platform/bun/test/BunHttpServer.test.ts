import * as BunHttpServer from "@effect/platform-bun/BunHttpServer"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Scope from "effect/Scope"
import * as HttpServer from "effect/unstable/http/HttpServer"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"

const fetchText = (url: string) =>
  Effect.promise(() => fetch(url, { headers: { connection: "close" } }).then((response) => response.text()))

describe("BunHttpServer", () => {
  it.effect("closing an older serve scope keeps the newer handler active", () =>
    Effect.gen(function*() {
      const ownerScope = yield* Effect.scope
      const server = yield* BunHttpServer.make({
        hostname: "127.0.0.1",
        port: 0
      })
      const firstScope = yield* Scope.fork(ownerScope)
      const secondScope = yield* Scope.fork(ownerScope)

      yield* server.serve(Effect.succeed(HttpServerResponse.text("first"))).pipe(Scope.provide(firstScope))
      yield* server.serve(Effect.succeed(HttpServerResponse.text("second"))).pipe(Scope.provide(secondScope))
      const url = HttpServer.formatAddress(server.address)

      assert.strictEqual(yield* fetchText(url), "second")
      yield* Scope.close(firstScope, Exit.void)
      assert.strictEqual(yield* fetchText(url), "second")
    }))

  it.effect("closing the newer serve scope restores the older handler", () =>
    Effect.gen(function*() {
      const ownerScope = yield* Effect.scope
      const server = yield* BunHttpServer.make({
        hostname: "127.0.0.1",
        port: 0
      })
      const firstScope = yield* Scope.fork(ownerScope)
      const secondScope = yield* Scope.fork(ownerScope)

      yield* server.serve(Effect.succeed(HttpServerResponse.text("first"))).pipe(Scope.provide(firstScope))
      yield* server.serve(Effect.succeed(HttpServerResponse.text("second"))).pipe(Scope.provide(secondScope))
      const url = HttpServer.formatAddress(server.address)

      assert.strictEqual(yield* fetchText(url), "second")
      yield* Scope.close(secondScope, Exit.void)
      assert.strictEqual(yield* fetchText(url), "first")
    }))
})
