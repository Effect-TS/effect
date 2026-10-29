import { NodeRedis } from "@effect/platform-node"
import { assert } from "@effect/vitest"
import { Effect, Fiber, Layer } from "effect"
import { once } from "node:events"
import { createServer, type Socket } from "node:net"
import { setTimeout } from "node:timers/promises"
import { it } from "vitest"

// A loopback peer lets each test choose exactly which protocol phase stalls.
const withPeer = async (
  test: (peer: {
    readonly port: number
    readonly sockets: Set<Socket>
    readonly accepted: Promise<Socket>
    readonly connections: () => number
  }) => Promise<void>
) => {
  const sockets = new Set<Socket>()
  let connections = 0
  const accepted = Promise.withResolvers<Socket>()
  const server = createServer((socket) => {
    connections++
    sockets.add(socket)
    socket.on("error", () => {})
    socket.once("close", () => sockets.delete(socket))
    accepted.resolve(socket)
  })
  server.listen(0, "127.0.0.1")
  await once(server, "listening")
  const address = server.address()
  assert.isTrue(typeof address === "object" && address !== null)
  if (typeof address !== "object" || address === null) return
  try {
    await test({ port: address.port, sockets, accepted: accepted.promise, connections: () => connections })
  } finally {
    for (const socket of sockets) socket.destroy()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

const bounded = <A>(promise: Promise<A>, millis = 2_500): Promise<A> =>
  new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => reject(new Error("Redis lifecycle did not complete")), millis)
    promise.then(resolve, reject).finally(() => clearTimeout(timer))
  })

for (const tls of [false, true]) {
  it(`interrupts a stalled ${tls ? "TLS" : "Redis"} handshake without leaking the socket`, async () => {
    await withPeer(async (peer) => {
      const fiber = Effect.runFork(
        Layer.build(NodeRedis.layer({
          socket: {
            host: "127.0.0.1",
            port: peer.port,
            ...(tls ? { tls: true as const } : { tls: false as const }),
            reconnectStrategy: () => 100
          }
        })).pipe(Effect.scoped)
      )
      const socket = await bounded(peer.accepted)
      // Redis handshake bytes (or TLS ClientHello) prove connection creation has started.
      await bounded(once(socket, "data"))
      const closed = once(socket, "close")
      try {
        await bounded(Effect.runPromise(Fiber.interrupt(fiber)))
        await bounded(closed)
        assert.strictEqual(peer.sockets.size, 0)
        // Observe two complete retry intervals after the peer confirms disposal.
        await setTimeout(250)
        assert.strictEqual(peer.connections(), 1)
      } finally {
        socket.destroy()
      }
    })
  })
}

it("interrupts initial reconnect backoff without opening another socket", async () => {
  await withPeer(async (peer) => {
    const retry = Promise.withResolvers<void>()
    let retries = 0
    const fiber = Effect.runFork(
      Layer.build(NodeRedis.layer({
        socket: {
          host: "127.0.0.1",
          port: peer.port,
          reconnectStrategy: () => {
            retries++
            retry.resolve()
            return 100
          }
        }
      })).pipe(Effect.scoped)
    )
    const socket = await bounded(peer.accepted)
    await bounded(once(socket, "data"))
    socket.destroy()
    // The callback establishes that node-redis has entered retry backoff.
    await bounded(retry.promise)
    await bounded(Effect.runPromise(Fiber.interrupt(fiber)))
    const retriesAtClose = retries
    await setTimeout(250)
    assert.strictEqual(peer.sockets.size, 0)
    assert.strictEqual(peer.connections(), 1)
    assert.strictEqual(retries, retriesAtClose)
  })
})

it("bounds graceful finalization when a ready client's command stalls", async () => {
  await withPeer(async (peer) => {
    const stalled = Promise.withResolvers<void>()
    const fiber = Effect.runFork(
      Effect.gen(function*() {
        const { client } = yield* NodeRedis.NodeRedis
        // Handle rejection immediately: forced destruction rejects this command.
        const command = client.sendCommand(["PING"]).then(
          () => assert.fail("the peer must not reply to PING"),
          () => {}
        )
        yield* Effect.promise(() => command)
      }).pipe(
        Effect.provide(NodeRedis.layer({ socket: { host: "127.0.0.1", port: peer.port } }))
      )
    )
    const socket = await bounded(peer.accepted)
    let buffer = ""
    socket.on("data", (data) => {
      buffer += data.toString()
      // Parse complete RESP arrays of bulk strings, including fragmented reads.
      while (buffer.length > 0) {
        const count = /^\*(\d+)\r\n/.exec(buffer)
        if (!count) return
        let offset = count[0].length
        const args: Array<string> = []
        for (let i = 0; i < Number(count[1]); i++) {
          const length = /^\$(\d+)\r\n/.exec(buffer.slice(offset))
          if (!length) return
          offset += length[0].length
          const end = offset + Number(length[1])
          if (buffer.length < end + 2) return
          args.push(buffer.slice(offset, end))
          offset = end + 2
        }
        buffer = buffer.slice(offset)
        if (args[0] === "PING") stalled.resolve()
        else socket.write("+OK\r\n")
      }
    })
    await bounded(stalled.promise)
    const closed = once(socket, "close")
    try {
      await bounded(Effect.runPromise(Fiber.interrupt(fiber)))
      await bounded(closed)
      assert.strictEqual(peer.sockets.size, 0)
    } finally {
      socket.destroy()
    }
  })
})

it("preserves a caller's socket abort signal", async () => {
  await withPeer(async (peer) => {
    const abort = new AbortController()
    const fiber = Effect.runFork(
      Layer.build(NodeRedis.layer({
        socket: { host: "127.0.0.1", port: peer.port, signal: abort.signal, reconnectStrategy: false }
      })).pipe(Effect.scoped)
    )
    const socket = await bounded(peer.accepted)
    await bounded(once(socket, "data"))
    const closed = once(socket, "close")
    abort.abort()
    const exit = await bounded(Effect.runPromise(Fiber.await(fiber)))
    assert.strictEqual(exit._tag, "Failure")
    await bounded(closed)
    assert.strictEqual(peer.sockets.size, 0)
  })
})
