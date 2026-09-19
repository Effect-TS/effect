import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Schema, Scope, Stream } from "effect"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Datagram from "effect/unstable/socket/DatagramSocket"

const address = NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 12345)
const packet = (data: ReadonlyArray<number>): Datagram.Packet => ({
  data: Uint8Array.from(data),
  peer: address
})

const outgoing: Datagram.Packet = { data: new Uint8Array([1]), peer: address }
const transportFixture = Effect.fnUntraced(function*(options: Omit<Datagram.BindOptions, "localAddress"> = {}) {
  let handlers!: Datagram.Handlers
  const socket = yield* Datagram.fromTransport({ localAddress: address, ...options }, (callbacks) => {
    handlers = callbacks
    return Effect.succeed({ address, send: () => Effect.void })
  })
  return { handlers, socket }
})

describe("DatagramSocket", () => {
  it("preserves native write causes and scoped destinations through JSON", () => {
    const destination = NetAddress.inetAddressFromStringUnsafe("[fe80::1%7]:4567")
    const failure = new Datagram.DatagramSocketError({
      reason: new Datagram.DatagramSocketWriteError({
        cause: new Error("native send failed"),
        destination
      })
    })
    const codec = Schema.toCodecJson(Datagram.DatagramSocketError)
    const json = JSON.stringify(Schema.encodeSync(codec)(failure))
    const decoded = Schema.decodeUnknownSync(codec)(JSON.parse(json))
    assert.instanceOf(decoded, Datagram.DatagramSocketError)
    assert.instanceOf(decoded.reason, Datagram.DatagramSocketWriteError)
    if (decoded.reason._tag !== "DatagramSocketWriteError") return
    assert.strictEqual(decoded.cause, decoded.reason.cause)
    assert.deepStrictEqual(decoded.reason.destination, destination)
    assert.instanceOf(decoded.cause, Error)
    assert.strictEqual((decoded.cause as Error).message, "native send failed")
  })

  it.effect("interrupts a pending send when reception fails", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      const interrupted = yield* Deferred.make<void>()
      const failure = new Datagram.DatagramSocketError({
        reason: new Datagram.DatagramSocketReadError({ cause: "receive failed" })
      })
      const socket = Datagram.makeUnconnected({
        address,
        pull: Deferred.await(started).pipe(Effect.andThen(Effect.fail(failure))),
        write: (_: Datagram.Packet) =>
          Deferred.succeed(started, undefined).pipe(
            Effect.andThen(Effect.never),
            Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined))
          )
      })
      const result = yield* Stream.succeed(outgoing).pipe(
        Stream.pipeThroughChannel(Datagram.toChannel(socket)),
        Stream.runDrain,
        Effect.exit
      )
      assert.deepStrictEqual(result, Exit.fail(failure))
      yield* Deferred.await(interrupted)
    }))
})

describe("DatagramSocket.fromTransport", () => {
  it.effect.each([
    {
      name: "packet count, including empty payloads",
      options: { receiveCapacity: 2 },
      incoming: [[], [1], [2]],
      expected: [[], [1]]
    },
    {
      name: "queued bytes",
      options: { receiveCapacityBytes: 3 },
      incoming: [[1, 2], [3], [4]],
      expected: [[1, 2], [3]]
    },
    {
      name: "individual payload size",
      options: { maxPacketBytes: 2 },
      incoming: [[1, 2, 3], [4, 5]],
      expected: [[4, 5]]
    }
  ])("limits $name and accepts packets after draining", ({ expected, incoming, options }) =>
    Effect.gen(function*() {
      const { handlers, socket } = yield* transportFixture(options)
      for (const data of incoming) handlers.onMessage(Uint8Array.from(data), address)
      assert.deepStrictEqual(Array.from(yield* socket.pull), expected.map(packet))
      handlers.onMessage(new Uint8Array([6, 7]), address)
      assert.deepStrictEqual(yield* socket.pull, [packet([6, 7])])
    }))

  it.effect("retains and batches packets arriving before a waiting reader resumes", () =>
    Effect.gen(function*() {
      const { handlers, socket } = yield* transportFixture({ readBatchSize: 2 })
      const waiting = yield* socket.pull.pipe(Effect.forkChild({ startImmediately: true }))
      const data = new Uint8Array([1])
      handlers.onMessage(data, address)
      handlers.onMessage(new Uint8Array(), address)
      handlers.onMessage(new Uint8Array([2]), address)
      const packets = yield* Fiber.join(waiting)
      assert.strictEqual(packets[0].data, data)
      assert.deepStrictEqual(packets, [packet([1]), packet([])])
      assert.deepStrictEqual(yield* socket.pull, [packet([2])])
    }))

  it.effect("leaves a notified packet available when its waiting reader is interrupted", () =>
    Effect.gen(function*() {
      const { handlers, socket } = yield* transportFixture({
        receiveCapacity: 1,
        receiveCapacityBytes: 1
      })
      const waiting = yield* socket.pull.pipe(Effect.forkChild({ startImmediately: true }))
      handlers.onMessage(new Uint8Array([1]), address)
      yield* Fiber.interrupt(waiting)
      assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(waiting)))
      assert.deepStrictEqual(yield* socket.pull, [packet([1])])
      handlers.onMessage(new Uint8Array([2]), address)
      assert.deepStrictEqual(yield* socket.pull, [packet([2])])
    }))

  it.effect("fails all readers with the first receive error until the socket closes", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Effect.scope)
      const { handlers, socket } = yield* transportFixture().pipe(Scope.provide(scope))
      const first = yield* socket.pull.pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
      const second = yield* socket.pull.pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
      const cause = new Error("receive failed")
      handlers.onMessage(new Uint8Array([1]), address)
      handlers.onError(cause)
      handlers.onError(new Error("late failure"))
      handlers.onMessage(new Uint8Array([2]), address)

      const failure = yield* Fiber.join(first)
      assert.strictEqual(failure.reason._tag, "DatagramSocketReadError")
      assert.strictEqual(failure.cause, cause)
      assert.strictEqual(yield* Fiber.join(second), failure)
      assert.strictEqual(yield* socket.pull.pipe(Effect.flip), failure)
      yield* socket.write(outgoing)

      yield* Scope.close(scope, Exit.void)
      assert.strictEqual((yield* socket.pull.pipe(Effect.flip)).reason._tag, "DatagramSocketClosedError")
      assert.strictEqual(
        (yield* socket.write(outgoing).pipe(Effect.flip)).reason._tag,
        "DatagramSocketClosedError"
      )
    }))

  it.effect("rejects acquisition in a closed scope without invoking the transport", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Effect.scope)
      yield* Scope.close(scope, Exit.void)
      let acquired = false
      const failure = yield* Datagram.fromTransport({ localAddress: address }, () => {
        acquired = true
        return Effect.succeed({ address, send: () => Effect.void })
      }).pipe(Scope.provide(scope), Effect.flip)
      assert.strictEqual(failure.reason._tag, "DatagramSocketClosedError")
      assert.isFalse(acquired)
    }))

  it.effect("releases partial acquisition before returning its failure", () =>
    Effect.gen(function*() {
      const failure = new Datagram.DatagramSocketError({
        reason: new Datagram.DatagramSocketOpenError({ cause: "failed to bind" })
      })
      let released = false
      const result = yield* Datagram.fromTransport({ localAddress: address }, () =>
        Effect.gen(function*() {
          yield* Effect.addFinalizer(() =>
            Effect.sync(() => {
              released = true
            })
          )
          return yield* failure
        })).pipe(Effect.flip)
      assert.strictEqual(result, failure)
      assert.isTrue(released)
    }))

  it.effect("releases resources acquired after interruption before returning", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      const finishAcquiring = yield* Deferred.make<void>()
      let released = false
      const opening = yield* Datagram.fromTransport({ localAddress: address }, () =>
        Effect.acquireRelease(
          Deferred.succeed(started, undefined).pipe(
            Effect.andThen(Deferred.await(finishAcquiring)),
            Effect.as({ address, send: () => Effect.void })
          ),
          () =>
            Effect.sync(() => {
              released = true
            })
        )).pipe(Effect.forkChild)
      yield* Deferred.await(started)
      const interrupting = yield* Fiber.interrupt(opening).pipe(Effect.forkChild({ startImmediately: true }))
      assert.isUndefined(interrupting.pollUnsafe())
      yield* Deferred.succeed(finishAcquiring, undefined)
      yield* Fiber.join(interrupting)
      assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(opening)))
      assert.isTrue(released)
    }))

  it.effect.each(["acquisition", "I/O"] as const)(
    "settles pending %s before transport cleanup finishes",
    (phase) =>
      Effect.gen(function*() {
        const scope = yield* Scope.fork(yield* Effect.scope)
        const started = yield* Deferred.make<void>()
        const interrupted = yield* Deferred.make<void>()
        const cleanupStarted = yield* Deferred.make<void>()
        const finishCleanup = yield* Deferred.make<void>()
        const pending = Deferred.succeed(started, undefined).pipe(
          Effect.andThen(Effect.never),
          Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined))
        )
        let handlers!: Datagram.Handlers
        const acquire = Datagram.fromTransport({ localAddress: address }, (callbacks) =>
          Effect.gen(function*() {
            handlers = callbacks
            yield* Effect.addFinalizer(() =>
              Deferred.succeed(cleanupStarted, undefined).pipe(Effect.andThen(Deferred.await(finishCleanup)))
            )
            if (phase === "acquisition") return yield* pending
            return { address, send: () => pending }
          })).pipe(Scope.provide(scope))
        const operations = phase === "acquisition"
          ? [Effect.asVoid(acquire)]
          : yield* Effect.map(
            acquire,
            (socket) => [Effect.asVoid(socket.pull), socket.write(outgoing)]
          )
        const fibers = yield* Effect.forEach(operations, (operation) =>
          operation.pipe(Effect.flip, Effect.forkChild({ startImmediately: true })))
        yield* Deferred.await(started)
        // Closing must discard packets even if a reader was just notified.
        handlers.onMessage(new Uint8Array([1]), address)
        handlers.onMessage(new Uint8Array([2]), address)
        const closing = yield* Scope.close(scope, Exit.void).pipe(Effect.forkChild({ startImmediately: true }))
        yield* Effect.gen(function*() {
          yield* Deferred.await(cleanupStarted)
          yield* Deferred.await(interrupted)
          for (const fiber of fibers) {
            assert.strictEqual((yield* Fiber.join(fiber)).reason._tag, "DatagramSocketClosedError")
          }
          handlers.onMessage(new Uint8Array([3]), address)
          handlers.onError("late error")
          for (const operation of operations) {
            assert.strictEqual((yield* Effect.flip(operation)).reason._tag, "DatagramSocketClosedError")
          }
        }).pipe(Effect.ensuring(Deferred.succeed(finishCleanup, undefined)))
        yield* Fiber.join(closing)
      })
  )
})

describe("DatagramSocket.fromConnectedTransport", () => {
  it.effect("filters packets to a canonical peer address and port", () =>
    Effect.gen(function*() {
      const remote = NetAddress.inetAddressFromIpStringUnsafe("::ffff:127.0.0.1", 54321)
      let handlers!: Datagram.Handlers
      const socket = yield* Datagram.fromConnectedTransport({ localAddress: address, remote }, (callbacks) => {
        handlers = callbacks
        return Effect.succeed({ address, send: () => Effect.void })
      })

      handlers.onMessage(
        new Uint8Array([9]),
        NetAddress.inetAddressFromIpStringUnsafe("127.0.0.2", remote.port)
      )
      handlers.onMessage(
        new Uint8Array([8]),
        NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", remote.port + 1)
      )
      handlers.onMessage(
        new Uint8Array([1]),
        NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", remote.port)
      )

      assert.deepStrictEqual(yield* socket.pull, [{
        data: new Uint8Array([1]),
        peer: NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", remote.port)
      }])
    }))
})

describe("DatagramSocket.writeMany", () => {
  const packets = [outgoing, { ...outgoing, data: new Uint8Array() }, outgoing]
  const batchTransport = (
    sendMany: NonNullable<Datagram.Binding["sendMany"]>,
    options: Omit<Datagram.BindOptions, "localAddress"> = {}
  ) =>
    Datagram.fromTransport(
      { localAddress: address, ...options },
      () => Effect.succeed({ address, send: () => Effect.void, sendMany })
    )

  it.effect("falls back sequentially for custom writers and stops at the original failure", () =>
    Effect.gen(function*() {
      const seen: Array<number> = []
      const failure = new Datagram.DatagramSocketError({
        reason: new Datagram.DatagramSocketWriteError({
          cause: "failed",
          destination: address
        })
      })
      const writer = {
        write: ({ data, peer }: Datagram.Packet) =>
          Effect.suspend(() => {
            assert.strictEqual(peer, address)
            seen.push(data[0])
            return data[0] === 2 ? Effect.fail(failure) : Effect.void
          })
      }
      const socket = Datagram.makeUnconnected({ address, pull: Effect.never, write: writer.write })
      assert.strictEqual(
        yield* socket.writeMany([1, 2, 3].map((n) => ({ data: new Uint8Array([n]), peer: address }))).pipe(Effect.flip),
        failure
      )
      assert.deepStrictEqual(seen, [1, 2])
    }))

  it.effect("constructs a connected socket with sequential batch fallback", () =>
    Effect.gen(function*() {
      const remote = NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 23456)
      const seen: Array<number> = []
      const failure = new Datagram.DatagramSocketError({
        reason: new Datagram.DatagramSocketWriteError({ cause: "failed", destination: remote })
      })
      const socket = Datagram.makeConnected({
        address,
        remote,
        pull: Effect.succeed([packet([9])]),
        write: (data) =>
          Effect.suspend(() => {
            seen.push(data[0])
            return data[0] === 2 ? Effect.fail(failure) : Effect.void
          })
      })
      assert.strictEqual(socket._tag, "ConnectedSocket")
      assert.strictEqual(socket.address, address)
      assert.strictEqual(socket.remote, remote)
      assert.deepStrictEqual(yield* socket.pull, [packet([9])])
      const sending = socket.writeMany([1, 2, 3].map((n) => new Uint8Array([n])))
      assert.deepStrictEqual(seen, [])
      assert.strictEqual(yield* sending.pipe(Effect.flip), failure)
      assert.deepStrictEqual(seen, [1, 2])
      yield* socket.writeMany([])
      assert.deepStrictEqual(seen, [1, 2])
    }))

  it.effect("passes all batches to a supplied connected batch operation", () =>
    Effect.gen(function*() {
      const batches: Array<ReadonlyArray<Uint8Array>> = []
      const payloads = [new Uint8Array([1]), new Uint8Array()]
      const socket = Datagram.makeConnected({
        address,
        remote: address,
        pull: Effect.never,
        write: () => Effect.die("unexpected individual write"),
        writeMany: (batch) =>
          Effect.sync(() => {
            batches.push(batch)
          })
      })
      const sending = socket.writeMany(payloads)
      assert.deepStrictEqual(batches, [])
      yield* sending
      yield* socket.writeMany([])
      assert.strictEqual(batches.length, 2)
      assert.strictEqual(batches[0], payloads)
      assert.deepStrictEqual(batches[1], [])
    }))

  it.effect.each([false, true])(
    "submits only the valid prefix and gives its failure precedence: %s",
    (failPrefix) =>
      Effect.gen(function*() {
        const sent: Array<number> = []
        const socket = yield* batchTransport((batch) =>
          Effect.suspend(() => {
            sent.push(...batch.map((packet) => packet.data[0]))
            return failPrefix
              ? Effect.fail(
                new Datagram.DatagramSocketError({
                  reason: new Datagram.DatagramSocketBatchWriteError({ cause: "prefix failed" })
                })
              )
              : Effect.void
          }), { maxPacketBytes: 1 })
        const failure = yield* socket.writeMany([
          outgoing,
          { ...outgoing, data: new Uint8Array([2, 2]) },
          { ...outgoing, data: new Uint8Array([3]) }
        ]).pipe(Effect.flip)
        assert.deepStrictEqual(sent, [1])
        assert.strictEqual(
          failure.reason._tag,
          failPrefix ? "DatagramSocketBatchWriteError" : "DatagramSocketMessageTooLargeError"
        )
      })
  )

  it.effect("settles blocked batches on closure and rejects subsequent writes", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Effect.scope)
      const socket = yield* batchTransport(() => Effect.never).pipe(Scope.provide(scope))
      const writing = yield* socket.writeMany(packets).pipe(
        Effect.flip,
        Effect.forkChild({ startImmediately: true })
      )
      yield* Scope.close(scope, Exit.void)
      assert.strictEqual((yield* Fiber.join(writing)).reason._tag, "DatagramSocketClosedError")
      assert.strictEqual(
        (yield* socket.writeMany(packets).pipe(Effect.flip)).reason._tag,
        "DatagramSocketClosedError"
      )
      assert.strictEqual(
        (yield* socket.writeMany([]).pipe(Effect.flip)).reason._tag,
        "DatagramSocketClosedError"
      )
    }))

  it.effect("bounds batch windows and permits cancellation between windows", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      let submitted = 0
      const socket = yield* batchTransport((batch) =>
        Effect.sync(() => {
          assert.isAtMost(batch.length, 64)
          submitted += batch.length
          Deferred.doneUnsafe(started, Exit.void)
        })
      )
      const writing = yield* socket.writeMany(Array.from({ length: 10000 }, () => outgoing)).pipe(
        Effect.forkChild
      )
      yield* Deferred.await(started)
      yield* Fiber.interrupt(writing)
      assert.isAbove(submitted, 0)
      assert.isBelow(submitted, 10000)
    }))

  it.effect("prepares connected payloads lazily across bounded windows", () =>
    Effect.gen(function*() {
      const remote = NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 12346)
      const data = new Uint8Array([1])
      const received: Array<number> = []
      let calls = 0
      const socket = yield* Datagram.fromConnectedTransport({ localAddress: address, remote }, () =>
        Effect.succeed({
          address,
          send: () => Effect.void,
          sendMany: (batch) =>
            Effect.sync(() => {
              calls++
              for (const packet of batch) {
                assert.deepStrictEqual(packet.peer, remote)
                assert.notStrictEqual(packet.data, data)
                received.push(packet.data[0])
              }
            })
        }))
      const writing = socket.writeMany(Array.from({ length: 150 }, () => data))
      data[0] = 2
      yield* writing
      assert.deepStrictEqual(
        received,
        Array.from({ length: 150 }, () => 2)
      )
      assert.strictEqual(calls, 3)
    }))

  it.effect("bounds copied bytes as well as packet count", () =>
    Effect.gen(function*() {
      const data = new Uint8Array(65507)
      const sizes: Array<number> = []
      const socket = yield* batchTransport((batch) =>
        Effect.sync(() => {
          sizes.push(batch.length)
        })
      )
      yield* socket.writeMany(Array.from({ length: 20 }, () => ({ ...outgoing, data })))
      assert.strictEqual(sizes.reduce((a, b) => a + b, 0), 20)
      assert.isAbove(sizes.length, 1)
      for (const size of sizes) assert.isAtMost(size * data.length, 256 * 1024 + data.length)
    }))

  it.effect("awaits complete batch operations from any binding and preserves their failures", () =>
    Effect.gen(function*() {
      const accepted = yield* Deferred.make<void>()
      const batches: Array<ReadonlyArray<Datagram.Packet>> = []
      const failure = new Datagram.DatagramSocketError({
        reason: new Datagram.DatagramSocketBatchWriteError({ cause: "batch callback failed" })
      })
      const socket = yield* Datagram.fromTransport({ localAddress: address }, () =>
        Effect.succeed({
          address,
          send: () => Effect.die("unexpected individual send"),
          sendMany: (packets) =>
            Effect.suspend(() => {
              batches.push(packets)
              return batches.length === 1 ? Deferred.await(accepted) : Effect.fail(failure)
            })
        }))
      const writing = yield* socket.writeMany(Array.from({ length: 129 }, () => outgoing))
        .pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
      assert.strictEqual(batches.length, 1)
      assert.strictEqual(batches[0].length, 64)
      assert.notStrictEqual(batches[0][0].data, outgoing.data)
      yield* Deferred.succeed(accepted, undefined)
      assert.strictEqual(yield* Fiber.join(writing), failure)
      assert.strictEqual(batches.length, 2)
      assert.strictEqual(batches[1].length, 64)
    }))

  it.effect("waits for each callback binding send before copying and submitting the next", () =>
    Effect.gen(function*() {
      const accepted = yield* Deferred.make<void>()
      const sent: Array<Uint8Array> = []
      const data = new Uint8Array([1])
      const failure = new Datagram.DatagramSocketError({
        reason: new Datagram.DatagramSocketWriteError({
          cause: "second callback failed",
          destination: address
        })
      })
      const socket = yield* Datagram.fromTransport({ localAddress: address }, () =>
        Effect.succeed({
          address,
          send: (packet) =>
            Effect.suspend(() => {
              sent.push(packet.data)
              return sent.length === 1 ? Deferred.await(accepted) : Effect.fail(failure)
            })
        }))
      const writing = yield* socket.writeMany(Array.from({ length: 3 }, () => ({ ...outgoing, data })))
        .pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
      assert.strictEqual(sent.length, 1)
      assert.notStrictEqual(sent[0], data)
      yield* Deferred.succeed(accepted, undefined)
      assert.strictEqual(yield* Fiber.join(writing), failure)
      assert.strictEqual(sent.length, 2)
      assert.notStrictEqual(sent[0], sent[1])
    }))

  it.effect("passes channel groups through the batch capability and interrupts pending batches", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      const interrupted = yield* Deferred.make<void>()
      const socket = Datagram.makeUnconnected({
        address,
        pull: Deferred.await(started).pipe(Effect.andThen(Effect.succeed([packet([9])] as const))),
        write: (_: Datagram.Packet) => Effect.die("unexpected individual write"),
        writeMany: (batch) =>
          Effect.gen(function*() {
            assert.deepStrictEqual(batch, packets)
            yield* Deferred.succeed(started, undefined)
            return yield* Effect.never
          }).pipe(Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined)))
      })
      yield* Stream.fromIterable(packets).pipe(
        Stream.pipeThroughChannel(Datagram.toChannel(socket)),
        Stream.take(1),
        Stream.runDrain
      )
      yield* Deferred.await(interrupted)
    }))
})
