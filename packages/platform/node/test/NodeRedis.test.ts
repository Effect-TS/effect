import { NodeRedis } from "@effect/platform-node"
import { describe, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, Layer } from "effect"
import { Redis } from "effect/persistence"
import * as ChildProcess from "node:child_process"
import * as Net from "node:net"
import * as Util from "node:util"

// A loopback peer that accepts a connection and, unless `onData` replies,
// never answers.
const makePeer = Effect.fnUntraced(function*(onData?: (socket: Net.Socket, data: string) => void) {
  const received = yield* Deferred.make<void>()
  const closed = yield* Deferred.make<void>()
  const sockets = new Set<Net.Socket>()
  const server = Net.createServer((socket) => {
    sockets.add(socket)
    socket.on("error", () => {})
    socket.once("data", () => Deferred.doneUnsafe(received, Effect.void))
    if (onData) socket.on("data", (data) => onData(socket, data.toString()))
    socket.once("close", () => Deferred.doneUnsafe(closed, Effect.void))
  })
  yield* Effect.acquireRelease(
    Effect.callback<void>((resume) => {
      server.listen(0, "127.0.0.1", () => resume(Effect.void))
    }),
    () =>
      Effect.callback<void>((resume) => {
        for (const socket of sockets) socket.destroy()
        server.close(() => resume(Effect.void))
      })
  )
  const port = (server.address() as Net.AddressInfo).port
  return { port, received, closed } as const
})

describe("NodeRedis", () => {
  for (const tls of [false, true]) {
    it.live(`interrupts a stalled ${tls ? "TLS" : "Redis"} handshake`, () =>
      Effect.gen(function*() {
        const peer = yield* makePeer()
        const fiber = yield* Layer.build(NodeRedis.layer({
          socket: tls ? { host: "127.0.0.1", port: peer.port, tls } : { host: "127.0.0.1", port: peer.port },
          // `SELECT` guarantees a handshake on every node-redis version.
          database: 1
        })).pipe(Effect.scoped, Effect.forkChild)
        yield* Deferred.await(peer.received)
        yield* Fiber.interrupt(fiber).pipe(Effect.timeout("2 seconds"))
        yield* Deferred.await(peer.closed)
      }))
  }

  it.live("bounds shutdown while a command is stalled", () =>
    Effect.gen(function*() {
      const stalled = yield* Deferred.make<void>()
      const ended = yield* Deferred.make<void>()
      const peer = yield* makePeer((socket, data) => {
        // Complete the connection handshake, but never reply to PING.
        for (const [, command] of data.matchAll(/\*\d+\r\n\$\d+\r\n(\w+)\r\n/g)) {
          if (command === "PING") Deferred.doneUnsafe(stalled, Effect.void)
          else socket.write("+OK\r\n")
        }
      })
      const fiber = yield* Effect.gen(function*() {
        const { client } = yield* NodeRedis.NodeRedis
        client.once("end", () => Deferred.doneUnsafe(ended, Effect.void))
        const redis = yield* Redis.Redis
        yield* redis.send("PING")
      }).pipe(
        Effect.provide(NodeRedis.layer({
          socket: { host: "127.0.0.1", port: peer.port },
          // Keep the connection handshake to at most `HELLO`.
          RESP: 2,
          disableClientInfo: true,
          maintNotifications: "disabled"
        })),
        Effect.forkChild
      )
      yield* Deferred.await(stalled)
      yield* Fiber.interrupt(fiber).pipe(Effect.timeout("2 seconds"))
      yield* Deferred.await(peer.closed)
      // The client is fully destroyed, not just disconnected by the abort signal.
      yield* Deferred.await(ended)
    }))

  // Vitest's CommonJS interop hides missing named exports, so plain Node loads
  // the module, with `redis` resolved to the oldest supported peer.
  it("loads under native ESM with redis 5.0.x", async () => {
    const redis = new URL("./fixtures/redis-5.0.cjs", import.meta.url).href
    const nodeRedis = new URL("../src/NodeRedis.ts", import.meta.url).href
    await Util.promisify(ChildProcess.execFile)(process.execPath, [
      "--input-type=module",
      "--eval",
      `import { registerHooks } from "node:module"
registerHooks({
  resolve: (specifier, context, next) => next(specifier === "redis" ? ${JSON.stringify(redis)} : specifier, context)
})
await import(${JSON.stringify(nodeRedis)})`
    ])
  })
})
