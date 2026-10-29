import { NodeRedis } from "@effect/platform-node"
import { describe, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, Layer } from "effect"
import { Redis } from "effect/persistence"
import * as Net from "node:net"

// A loopback peer that accepts a connection and never replies.
const makePeer = Effect.gen(function*() {
  const received = yield* Deferred.make<void>()
  const closed = yield* Deferred.make<void>()
  const sockets = new Set<Net.Socket>()
  const server = Net.createServer((socket) => {
    sockets.add(socket)
    socket.on("error", () => {})
    socket.once("data", () => Deferred.doneUnsafe(received, Effect.void))
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
        const peer = yield* makePeer
        const fiber = yield* Layer.build(NodeRedis.layer({ socket: { host: "127.0.0.1", port: peer.port, tls } })).pipe(
          Effect.scoped,
          Effect.forkChild
        )
        yield* Deferred.await(peer.received)
        yield* Fiber.interrupt(fiber).pipe(Effect.timeout("2 seconds"))
        yield* Deferred.await(peer.closed)
      }))
  }

  it.live("bounds shutdown while a command is stalled", () =>
    Effect.gen(function*() {
      const peer = yield* makePeer
      const fiber = yield* Effect.gen(function*() {
        const redis = yield* Redis.Redis
        yield* redis.send("PING")
      }).pipe(
        Effect.provide(NodeRedis.layer({
          socket: { host: "127.0.0.1", port: peer.port },
          // Skip the connection handshake so the client becomes ready without replies.
          RESP: 2,
          disableClientInfo: true,
          maintNotifications: "disabled"
        })),
        Effect.forkChild
      )
      yield* Deferred.await(peer.received)
      yield* Fiber.interrupt(fiber).pipe(Effect.timeout("2 seconds"))
      yield* Deferred.await(peer.closed)
    }))
})
