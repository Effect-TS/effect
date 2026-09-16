import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Queue, Schema, Scope, Stream } from "effect"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Datagram from "effect/unstable/socket/DatagramSocket"

const address = NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 12345)
const packet = (data: ReadonlyArray<number>): Datagram.IncomingPacket => ({
  data: Uint8Array.from(data),
  source: address
})

const outgoing: Datagram.OutgoingPacket = { data: new Uint8Array([1]), destination: address }
const fixture = Effect.gen(function*() {
  const incoming = yield* Queue.unbounded<Datagram.IncomingPacket, Datagram.DatagramSocketError>()
  const receiveStarted = yield* Deferred.make<void>()
  const receiveInterrupted = yield* Deferred.make<void>()
  const writes: Array<Datagram.OutgoingPacket> = []
  const socket = Datagram.make({
    address,
    reader: {
      pull: Deferred.succeed(receiveStarted, undefined).pipe(
        Effect.andThen(Queue.takeAll(incoming)),
        Effect.onInterrupt(() => Deferred.succeed(receiveInterrupted, undefined))
      )
    },
    writer: {
      write: (packet: Datagram.OutgoingPacket) =>
        Effect.sync(() => {
          writes.push(packet)
        })
    }
  })
  return { socket, incoming, receiveStarted, receiveInterrupted, writes }
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

  it.effect("streams packet batches, including empty payloads, without sending", () =>
    Effect.gen(function*() {
      const test = yield* fixture
      const packets = [packet([]), packet([1, 2]), packet([3])]
      yield* Queue.offerAll(test.incoming, packets)
      const result = yield* Datagram.toStream(test.socket).pipe(Stream.take(3), Stream.runCollect)
      assert.deepStrictEqual(result, packets)
      assert.deepStrictEqual(test.writes, [])
    }))

  it.effect("keeps receiving after finite upstream completion", () =>
    Effect.gen(function*() {
      const test = yield* fixture
      const response = packet([42])
      const empty = { data: new Uint8Array(), destination: address }
      const upstreamDone = yield* Deferred.make<void>()
      yield* Effect.forkChild(Effect.andThen(
        Deferred.await(upstreamDone),
        Queue.offer(test.incoming, response)
      ))
      const result = yield* Stream.make(outgoing, empty, outgoing).pipe(
        Stream.concat(Stream.fromEffect(Deferred.succeed(upstreamDone, undefined)).pipe(Stream.drain)),
        Stream.pipeThroughChannel(Datagram.toChannel(test.socket)),
        Stream.take(1),
        Stream.runCollect
      )
      assert.deepStrictEqual(result, [response])
      assert.deepStrictEqual(test.writes, [outgoing, empty, outgoing])
    }))

  it.effect("propagates upstream failures to a blocked reader", () =>
    Effect.gen(function*() {
      const test = yield* fixture
      const result = yield* Stream.fromEffect(
        Deferred.await(test.receiveStarted).pipe(Effect.andThen(Effect.fail("upstream failure")))
      ).pipe(
        Stream.pipeThroughChannel(Datagram.toChannelWith<string>()(test.socket)),
        Stream.runDrain,
        Effect.exit
      )
      assert.deepStrictEqual(result, Exit.fail("upstream failure"))
      yield* Deferred.await(test.receiveInterrupted)
    }))

  it.effect("sends channel batches sequentially and stops at the original write failure", () =>
    Effect.gen(function*() {
      const test = yield* fixture
      const failure = new Datagram.DatagramSocketError({
        reason: new Datagram.DatagramSocketWriteError({ cause: "failed", destination: address })
      })
      const writes: Array<Datagram.OutgoingPacket> = []
      const failing = { data: new Uint8Array([2]), destination: address }
      const skipped = { data: new Uint8Array([3]), destination: address }
      const socket = Datagram.make({
        ...test.socket,
        writer: {
          write: Effect.fnUntraced(function*(packet: Datagram.OutgoingPacket) {
            yield* Deferred.await(test.receiveStarted)
            if (packet === failing) {
              assert.deepStrictEqual(writes, [outgoing])
              return yield* Effect.fail(failure)
            }
            yield* Effect.yieldNow
            writes.push(packet)
          })
        }
      })
      const result = yield* Stream.make(outgoing, failing, skipped).pipe(
        Stream.pipeThroughChannel(Datagram.toChannel(socket)),
        Stream.runDrain,
        Effect.exit
      )
      assert.deepStrictEqual(result, Exit.fail(failure))
      assert.deepStrictEqual(writes, [outgoing])
      yield* Deferred.await(test.receiveInterrupted)
    }))

  it.effect("interrupts upstream when downstream stops and leaves its reader usable", () =>
    Effect.gen(function*() {
      const test = yield* fixture
      const started = yield* Deferred.make<void>()
      const interrupted = yield* Deferred.make<void>()
      const upstream = Stream.fromEffect(
        Effect.andThen(Deferred.succeed(started, undefined), Effect.never).pipe(
          Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined))
        )
      )
      const fiber = yield* upstream.pipe(
        Stream.pipeThroughChannel(Datagram.toChannel(test.socket)),
        Stream.take(1),
        Stream.runCollect,
        Effect.forkChild
      )
      yield* Deferred.await(started)
      yield* Queue.offer(test.incoming, packet([9]))
      assert.deepStrictEqual(yield* Fiber.join(fiber), [packet([9])])
      yield* Deferred.await(interrupted)
      yield* Queue.offer(test.incoming, packet([10]))
      const reader = test.socket.reader
      assert.deepStrictEqual(yield* reader.pull, [packet([10])])
    }))

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
  it.effect("bounds packet count, payload size, and queued bytes, then restores capacity after pulls", () =>
    Effect.gen(function*() {
      let handlers!: Datagram.Handlers
      const socket = yield* Datagram.fromTransport({
        localAddress: address,
        receiveCapacity: 3,
        receiveCapacityBytes: 3,
        readBatchSize: 2,
        maxPacketBytes: 2
      }, (callbacks) => {
        handlers = callbacks
        return Effect.succeed({ address, send: () => Effect.void })
      })
      const data = new Uint8Array([1, 2])
      handlers.onMessage(new Uint8Array([7, 8, 9]), address)
      handlers.onMessage(data, address)
      data.fill(9)
      handlers.onMessage(new Uint8Array([3]), address)
      handlers.onMessage(new Uint8Array([4]), address)
      handlers.onMessage(new Uint8Array(), address)
      handlers.onMessage(new Uint8Array(), address)
      assert.deepStrictEqual(yield* socket.reader.pull, [packet([1, 2]), packet([3])])
      handlers.onMessage(new Uint8Array([5, 6]), address)
      assert.deepStrictEqual(yield* socket.reader.pull, [packet([]), packet([5, 6])])
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

  it.effect("copies the current payload on each execution of a lazy write", () =>
    Effect.gen(function*() {
      const writes: Array<Datagram.OutgoingPacket> = []
      const socket = yield* Datagram.fromTransport({ localAddress: address }, () =>
        Effect.succeed({
          address,
          send: (packet) => {
            writes.push(packet)
            return Effect.void
          }
        }))
      const data = new Uint8Array([1])
      const write = socket.writer.write({ data, destination: address })
      assert.deepStrictEqual(writes, [])
      data[0] = 2
      yield* write
      data[0] = 3
      yield* write
      data[0] = 4
      assert.deepStrictEqual(writes.map((packet) => Array.from(packet.data)), [[2], [3]])
      for (const packet of writes) assert.strictEqual(packet.destination, address)
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
