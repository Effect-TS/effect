import { HttpRouter, HttpServer, HttpServerRequest, HttpServerResponse, type Socket } from "@effect/platform"
import { BunHttpServer } from "@effect/platform-bun"
import { assert, describe, it } from "@effect/vitest"
import { Context, Deferred, Effect, Exit, Fiber, Layer, Scope } from "effect"

const socketApp = (
  run: (socket: Socket.Socket) => Effect.Effect<void, unknown>
) =>
  HttpRouter.empty.pipe(
    HttpRouter.get(
      "/ws",
      Effect.gen(function*() {
        const socket = yield* HttpServerRequest.upgrade
        yield* run(socket)
        return HttpServerResponse.empty()
      }).pipe(Effect.orElseSucceed(() => HttpServerResponse.empty()))
    )
  )

const clientCloseCode = (port: number, message?: string) =>
  Effect.async<number>((resume) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`)
    ws.addEventListener("open", () => {
      if (message !== undefined) ws.send(message)
    })
    ws.addEventListener("close", (event) => resume(Effect.succeed(event.code)))
    return Effect.sync(() => ws.close())
  })

describe.skipIf(typeof Bun === "undefined")("BunHttpServer", () => {
  describe("upgrade", () => {
    it.effect("closes with 1012 when the server shuts down", () =>
      Effect.gen(function*() {
        const opened = yield* Deferred.make<void>()
        const scope = yield* Scope.make()
        const context = yield* Layer.buildWithScope(BunHttpServer.layer({ port: 0 }), scope)
        yield* socketApp((socket) => socket.runRaw(() => {}, { onOpen: Deferred.succeed(opened, void 0) })).pipe(
          HttpServer.serveEffect(),
          Scope.extend(scope),
          Effect.provide(context)
        )
        const address = Context.get(context, HttpServer.HttpServer).address
        assert(address._tag === "TcpAddress")
        const code = yield* Effect.fork(clientCloseCode(address.port))
        yield* Deferred.await(opened)
        yield* Scope.close(scope, Exit.void)
        assert.strictEqual(yield* Fiber.join(code), 1012)
      }))

    it.scoped("closes with 1011 when the socket handler fails", () =>
      Effect.gen(function*() {
        yield* socketApp((socket) => socket.runRaw(() => Effect.fail("boom"))).pipe(HttpServer.serveEffect())
        const address = (yield* HttpServer.HttpServer).address
        assert(address._tag === "TcpAddress")
        assert.strictEqual(yield* clientCloseCode(address.port, "hello"), 1011)
      }).pipe(Effect.provide(BunHttpServer.layerTest)))
  })
})
