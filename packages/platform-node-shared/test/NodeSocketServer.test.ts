import * as NodeSocketServer from "@effect/platform-node-shared/NodeSocketServer"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Scope from "effect/Scope"
import * as Net from "node:net"

it.live("closes with a pending pre-run socket", () =>
  Effect.gen(function*() {
    const scope = yield* Scope.make()
    const server = yield* NodeSocketServer.make({ host: "127.0.0.1", port: 0 }).pipe(Scope.provide(scope))
    assert.strictEqual(server.address._tag, "TcpAddress")
    if (server.address._tag !== "TcpAddress") return
    const socket = Net.createConnection({ host: "127.0.0.1", port: server.address.port })
    yield* Effect.promise(() => new Promise<void>((resolve, reject) => {
      socket.once("connect", resolve)
      socket.once("error", reject)
    }))
    const closing = yield* Scope.close(scope, Exit.void).pipe(Effect.forkChild)
    yield* Effect.sleep("50 millis")
    const completed = closing.pollUnsafe() !== undefined
    socket.destroy()
    yield* Fiber.join(closing)
    assert.strictEqual(completed, true)
  }))
