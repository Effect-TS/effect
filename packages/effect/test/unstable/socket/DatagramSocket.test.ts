import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Schema, Scope, Stream } from "effect"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Datagram from "effect/unstable/socket/DatagramSocket"

const address = NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 12345)
const packet = (data: ReadonlyArray<number>): Datagram.IncomingPacket => ({
  data: Uint8Array.from(data),
  source: address
})

const outgoing: Datagram.OutgoingPacket = { data: new Uint8Array([1]), destination: address }
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
      const socket = Datagram.make({
        address,
        reader: { pull: Deferred.await(started).pipe(Effect.andThen(Effect.fail(failure))) },
        writer: {
          write: (_: Datagram.OutgoingPacket) =>
            Deferred.succeed(started, undefined).pipe(
              Effect.andThen(Effect.never),
              Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined))
            )
        }
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
      assert.deepStrictEqual(Array.from(yield* socket.reader.pull), expected.map(packet))
      handlers.onMessage(new Uint8Array([6, 7]), address)
      assert.deepStrictEqual(yield* socket.reader.pull, [packet([6, 7])])
    }))

  it.effect("copies and batches packets arriving before a waiting reader resumes", () =>
    Effect.gen(function*() {
      const { handlers, socket } = yield* transportFixture({ readBatchSize: 2 })
      const waiting = yield* socket.reader.pull.pipe(Effect.forkChild({ startImmediately: true }))
      const data = new Uint8Array([1])
      handlers.onMessage(data, address)
      data.fill(9)
      handlers.onMessage(new Uint8Array(), address)
      handlers.onMessage(new Uint8Array([2]), address)
      assert.deepStrictEqual(yield* Fiber.join(waiting), [packet([1]), packet([])])
      assert.deepStrictEqual(yield* socket.reader.pull, [packet([2])])
    }))

  it.effect("leaves a notified packet available when its waiting reader is interrupted", () =>
    Effect.gen(function*() {
      const { handlers, socket } = yield* transportFixture({
        receiveCapacity: 1,
        receiveCapacityBytes: 1
      })
      const waiting = yield* socket.reader.pull.pipe(Effect.forkChild({ startImmediately: true }))
      handlers.onMessage(new Uint8Array([1]), address)
      yield* Fiber.interrupt(waiting)
      assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(waiting)))
      assert.deepStrictEqual(yield* socket.reader.pull, [packet([1])])
      handlers.onMessage(new Uint8Array([2]), address)
      assert.deepStrictEqual(yield* socket.reader.pull, [packet([2])])
    }))

  it.effect("discards packets when closed before a notified reader resumes", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Effect.scope)
      const { handlers, socket } = yield* transportFixture().pipe(Scope.provide(scope))
      const waiting = yield* socket.reader.pull.pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
      handlers.onMessage(new Uint8Array([1]), address)
      handlers.onMessage(new Uint8Array([2]), address)
      yield* Scope.close(scope, Exit.void)
      assert.strictEqual((yield* Fiber.join(waiting)).reason._tag, "DatagramSocketClosedError")
      assert.strictEqual((yield* Effect.flip(socket.reader.pull)).reason._tag, "DatagramSocketClosedError")
    }))

  it.effect("fails all readers with the first receive error until the socket closes", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Effect.scope)
      const { handlers, socket } = yield* transportFixture().pipe(Scope.provide(scope))
      const first = yield* socket.reader.pull.pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
      const second = yield* socket.reader.pull.pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
      const cause = new Error("receive failed")
      handlers.onMessage(new Uint8Array([1]), address)
      handlers.onError(cause)
      handlers.onError(new Error("late failure"))
      handlers.onMessage(new Uint8Array([2]), address)

      const failure = yield* Fiber.join(first)
      assert.strictEqual(failure.reason._tag, "DatagramSocketReadError")
      assert.strictEqual(failure.cause, cause)
      assert.strictEqual(yield* Fiber.join(second), failure)
      assert.strictEqual(yield* socket.reader.pull.pipe(Effect.flip), failure)
      yield* socket.writer.write(outgoing)

      yield* Scope.close(scope, Exit.void)
      assert.strictEqual((yield* socket.reader.pull.pipe(Effect.flip)).reason._tag, "DatagramSocketClosedError")
      assert.strictEqual(
        (yield* socket.writer.write(outgoing).pipe(Effect.flip)).reason._tag,
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

  it.effect("settles pending acquisition before waiting for transport cleanup", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Effect.scope)
      const acquiring = yield* Deferred.make<void>()
      const interrupted = yield* Deferred.make<void>()
      const cleanupStarted = yield* Deferred.make<void>()
      const finishCleanup = yield* Deferred.make<void>()
      const opening = yield* Datagram.fromTransport({ localAddress: address }, () =>
        Effect.gen(function*() {
          yield* Effect.addFinalizer(() =>
            Deferred.succeed(cleanupStarted, undefined).pipe(Effect.andThen(Deferred.await(finishCleanup)))
          )
          yield* Deferred.succeed(acquiring, undefined)
          return yield* Effect.never.pipe(Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined)))
        })).pipe(Scope.provide(scope), Effect.flip, Effect.forkChild)
      yield* Deferred.await(acquiring)
      const closing = yield* Scope.close(scope, Exit.void).pipe(Effect.forkChild)
      yield* Effect.gen(function*() {
        yield* Deferred.await(cleanupStarted)
        yield* Deferred.await(interrupted)
        assert.strictEqual((yield* Fiber.join(opening)).reason._tag, "DatagramSocketClosedError")
      }).pipe(Effect.ensuring(Deferred.succeed(finishCleanup, undefined)))
      yield* Fiber.join(closing)
    }))

  it.effect("settles reads and sends before waiting for transport cleanup", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Effect.scope)
      const sendStarted = yield* Deferred.make<void>()
      const sendInterrupted = yield* Deferred.make<void>()
      const cleanupStarted = yield* Deferred.make<void>()
      const finishCleanup = yield* Deferred.make<void>()
      let handlers!: Datagram.Handlers
      const socket = yield* Datagram.fromTransport({ localAddress: address }, (callbacks) =>
        Effect.gen(function*() {
          handlers = callbacks
          yield* Effect.addFinalizer(() =>
            Deferred.succeed(cleanupStarted, undefined).pipe(Effect.andThen(Deferred.await(finishCleanup)))
          )
          return {
            address,
            send: () =>
              Deferred.succeed(sendStarted, undefined).pipe(
                Effect.andThen(Effect.never),
                Effect.onInterrupt(() => Deferred.succeed(sendInterrupted, undefined))
              )
          }
        })).pipe(Scope.provide(scope))
      const reading = yield* socket.reader.pull.pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
      const sending = yield* socket.writer.write(outgoing).pipe(Effect.flip, Effect.forkChild)
      yield* Deferred.await(sendStarted)
      const closing = yield* Scope.close(scope, Exit.void).pipe(Effect.forkChild)
      yield* Effect.gen(function*() {
        yield* Deferred.await(cleanupStarted)
        yield* Deferred.await(sendInterrupted)
        assert.strictEqual((yield* Fiber.join(reading)).reason._tag, "DatagramSocketClosedError")
        assert.strictEqual((yield* Fiber.join(sending)).reason._tag, "DatagramSocketClosedError")
        handlers.onMessage(new Uint8Array([1]), address)
        handlers.onError("late error")
        assert.strictEqual((yield* Effect.flip(socket.reader.pull)).reason._tag, "DatagramSocketClosedError")
        assert.strictEqual((yield* Effect.flip(socket.writer.write(outgoing))).reason._tag, "DatagramSocketClosedError")
      }).pipe(Effect.ensuring(Deferred.succeed(finishCleanup, undefined)))
      yield* Fiber.join(closing)
    }))
})
