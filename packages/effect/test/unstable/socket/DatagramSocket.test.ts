import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Scheduler, Scope, Stream } from "effect"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Datagram from "effect/unstable/socket/DatagramSocket"

const address = NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 12345)
const addressV6 = NetAddress.inetAddressFromIpStringUnsafe("::1", 12345)
const forgedInetAddress = (
  address: NetAddress.InetAddress,
  changes: { readonly port?: number; readonly scopeId?: number }
): NetAddress.InetAddress => Object.assign(Object.create(Object.getPrototypeOf(address)), address, changes)
const ipv4MulticastFixture = (input: string): NetAddress.MulticastAddress<NetAddress.Ipv4Address> => {
  const address = NetAddress.ipFromStringUnsafe(input)
  if (!NetAddress.isIpv4Address(address) || !NetAddress.isMulticast(address)) {
    throw new Error("expected IPv4 multicast test address")
  }
  return address
}
const ipv6MulticastFixture = (input: string): NetAddress.MulticastAddress<NetAddress.Ipv6Address> => {
  const address = NetAddress.ipFromStringUnsafe(input)
  if (!NetAddress.isIpv6Address(address) || !NetAddress.isMulticast(address)) {
    throw new Error("expected IPv6 multicast test address")
  }
  return address
}
const packet = (data: ReadonlyArray<number>): Datagram.Packet => ({
  data: Uint8Array.from(data),
  peer: address
})

const outgoing: Datagram.Packet = { data: new Uint8Array([1]), peer: address }
const binding: Datagram.Binding = {
  address,
  send: () => Effect.void,
  setBroadcast: () => Effect.die("unexpected broadcast configuration"),
  setMulticastInterface: () => Effect.die("unexpected multicast interface configuration"),
  addMembership: () => Effect.die("unexpected multicast join"),
  dropMembership: () => Effect.die("unexpected multicast leave")
}

const transportFixture = Effect.fnUntraced(function*(options: Omit<Datagram.BindOptions, "localAddress"> = {}) {
  let handlers!: Datagram.Handlers
  const socket = yield* Datagram.fromTransport({ localAddress: address, ...options }, (callbacks) => {
    handlers = callbacks
    return Effect.succeed(binding)
  })
  return { handlers, socket }
})

describe("DatagramSocket", () => {
  it("identifies raw sockets through TypeId", () => {
    const socket = Datagram.makeUnassociated({
      ...binding,
      write: () => Effect.void,
      pull: Effect.never,
      writeMany: () => Effect.void,
      addMembership: () => Effect.void,
      dropMembership: () => Effect.void
    })
    assert.isTrue(Datagram.isDatagramSocket(socket))
    assert.isTrue(Datagram.TypeId in socket)
    assert.isFalse(Datagram.isDatagramSocket({ _tag: "Unassociated" }))
  })

  it.effect("interrupts a pending send when reception fails", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      const interrupted = yield* Deferred.make<void>()
      const failure = new Datagram.DatagramSocketError({
        reason: new Datagram.DatagramSocketReadError({ cause: "receive failed" })
      })
      const socket = Datagram.makeUnassociated({
        ...binding,
        write: () => Effect.die("unexpected individual write"),
        pull: Deferred.await(started).pipe(Effect.andThen(Effect.fail(failure))),
        addMembership: () => Effect.void,
        dropMembership: () => Effect.void,
        writeMany: () =>
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
  const bufferingOptions = [
    "receiveCapacity",
    "receiveCapacityBytes",
    "readBatchSize",
    "maxPacketBytes"
  ] as const

  it.effect.each(
    bufferingOptions.flatMap((option) =>
      [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY].map((value) => ({ option, value }))
    )
  )("rejects $option=$value before transport acquisition", ({ option, value }) =>
    Effect.gen(function*() {
      let acquired = false
      const failure = yield* Datagram.fromTransport({ localAddress: address, [option]: value }, () => {
        acquired = true
        return Effect.succeed(binding)
      }).pipe(Effect.flip)
      assert.strictEqual(failure.reason._tag, "DatagramSocketInvalidOptionsError")
      assert.strictEqual(failure.message, `${option} must be a positive safe integer`)
      assert.isFalse(acquired)
    }))

  it.effect("accepts minimum buffering limits", () =>
    Effect.gen(function*() {
      const { handlers, socket } = yield* transportFixture({
        receiveCapacity: 1,
        receiveCapacityBytes: 1,
        readBatchSize: 1,
        maxPacketBytes: 1
      })
      handlers.onMessage(new Uint8Array([1]), address)
      assert.deepStrictEqual(yield* socket.pull, [packet([1])])
      yield* socket.write(outgoing)
    }))

  it.effect("rejects ipv6Only with an IPv4 local address before acquisition", () =>
    Effect.gen(function*() {
      let acquired = false
      const failure = yield* Datagram.fromTransport({ localAddress: address, ipv6Only: true }, () => {
        acquired = true
        return Effect.succeed(binding)
      }).pipe(Effect.flip)
      assert.strictEqual(failure.reason._tag, "DatagramSocketInvalidOptionsError")
      assert.isFalse(acquired)
    }))

  it.effect.each([
    { name: "negative port", value: { ...address, port: -1 } },
    { name: "fractional port", value: { ...address, port: 1.5 } },
    { name: "oversized port", value: { ...address, port: 0x1_0000 } },
    {
      name: "fractional IPv6 scope",
      value: Object.assign(
        Object.create(Object.getPrototypeOf(NetAddress.inetAddressFromIpStringUnsafe("::1", 0))),
        NetAddress.inetAddressFromIpStringUnsafe("::1", 0),
        { scopeId: 1.5 }
      )
    },
    {
      name: "oversized IPv6 scope",
      value: Object.assign(
        Object.create(Object.getPrototypeOf(NetAddress.inetAddressFromIpStringUnsafe("::1", 0))),
        NetAddress.inetAddressFromIpStringUnsafe("::1", 0),
        { scopeId: 0x1_0000_0000 }
      )
    }
  ])("rejects a malformed local $name before acquisition", ({ value }) =>
    Effect.gen(function*() {
      let acquired = false
      const failure = yield* Datagram.fromTransport({
        localAddress: value as NetAddress.InetAddress
      }, () => {
        acquired = true
        return Effect.succeed(binding)
      }).pipe(Effect.flip)
      assert.strictEqual(failure.reason._tag, "DatagramSocketInvalidOptionsError")
      assert.isFalse(acquired)
    }))

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
      assert.deepStrictEqual(yield* socket.pull, [packet([1])])
      handlers.onMessage(new Uint8Array([2]), address)
      assert.deepStrictEqual(yield* socket.pull, [packet([2])])
    }))

  it.effect("reuses receive byte capacity after interruption at a scheduler yield", () =>
    Effect.gen(function*() {
      const { handlers, socket } = yield* transportFixture({
        receiveCapacityBytes: 2
      })
      const receiving = yield* socket.pull.pipe(
        Effect.provideService(Scheduler.MaxOpsBeforeYield, 3),
        Effect.forkChild({ startImmediately: true })
      )
      yield* Effect.yieldNow
      yield* Effect.yieldNow
      handlers.onMessage(new Uint8Array([1]), address)
      yield* Effect.yieldNow
      yield* Effect.yieldNow
      yield* Fiber.interrupt(receiving)

      handlers.onMessage(new Uint8Array([2]), address)
      yield* socket.pull
      handlers.onMessage(new Uint8Array([3]), address)
      handlers.onMessage(new Uint8Array([4]), address)
      assert.deepStrictEqual(yield* socket.pull, [packet([3]), packet([4])])
    }))

  it.effect("preserves interruption when closure races a scheduler-yielded pull", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Effect.scope)
      const { handlers, socket } = yield* transportFixture().pipe(Scope.provide(scope))
      const receiving = yield* socket.pull.pipe(
        Effect.provideService(Scheduler.MaxOpsBeforeYield, 3),
        Effect.forkChild({ startImmediately: true })
      )
      yield* Effect.yieldNow
      yield* Effect.yieldNow
      handlers.onMessage(new Uint8Array([1]), address)
      yield* Effect.yieldNow
      yield* Effect.yieldNow
      const closing = yield* Scope.close(scope, Exit.void).pipe(Effect.forkChild({ startImmediately: true }))
      yield* Fiber.interrupt(receiving)
      yield* Fiber.join(closing)
      const exit = yield* Fiber.await(receiving)
      assert.isTrue(Exit.hasInterrupts(exit))
    }))

  it.effect("reuses receive byte capacity after scheduler-yielded channel cancellation", () =>
    Effect.gen(function*() {
      const { handlers, socket } = yield* transportFixture({
        receiveCapacityBytes: 2
      })
      const channel = yield* Stream.never.pipe(
        Stream.pipeThroughChannel(Datagram.toChannel(socket)),
        Stream.runDrain,
        Effect.provideService(Scheduler.MaxOpsBeforeYield, 3),
        Effect.forkChild({ startImmediately: true })
      )
      yield* Effect.yieldNow
      yield* Effect.yieldNow
      handlers.onMessage(new Uint8Array([1]), address)
      yield* Effect.yieldNow
      yield* Effect.yieldNow
      yield* Fiber.interrupt(channel)

      handlers.onMessage(new Uint8Array([2]), address)
      yield* socket.pull
      handlers.onMessage(new Uint8Array([3]), address)
      handlers.onMessage(new Uint8Array([4]), address)
      assert.deepStrictEqual(yield* socket.pull, [packet([3]), packet([4])])
    }))

  it.effect("conserves packets across deterministic multi-reader interruptions", () =>
    Effect.gen(function*() {
      const { handlers, socket } = yield* transportFixture({ readBatchSize: 1 })
      const readers = yield* Effect.forEach(
        Array.from({ length: 6 }),
        () => socket.pull.pipe(Effect.forkChild({ startImmediately: true }))
      )
      yield* Fiber.interrupt(readers[1])
      yield* Fiber.interrupt(readers[4])
      for (const value of [1, 2, 3, 4]) handlers.onMessage(new Uint8Array([value]), address)
      const received = yield* Effect.forEach([readers[0], readers[2], readers[3], readers[5]], Fiber.join)
      assert.deepStrictEqual(received.flatMap((packets) => packets.map((packet) => packet.data[0])).sort(), [
        1,
        2,
        3,
        4
      ])
      handlers.onMessage(new Uint8Array([5]), address)
      assert.deepStrictEqual(yield* socket.pull, [packet([5])])
    }))

  it.effect("drains the final buffered batch before reporting a terminal receive error", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Effect.scope)
      const { handlers, socket } = yield* transportFixture().pipe(Scope.provide(scope))
      const cause = new Error("receive failed")
      handlers.onMessage(new Uint8Array([1]), address)
      handlers.onMessage(new Uint8Array([2]), address)
      handlers.onError(cause)
      handlers.onError(new Error("late failure"))
      handlers.onMessage(new Uint8Array([3]), address)

      assert.deepStrictEqual(yield* socket.pull, [packet([1]), packet([2])])
      const failure = yield* socket.pull.pipe(Effect.flip)
      assert.strictEqual(failure.reason._tag, "DatagramSocketReadError")
      assert.strictEqual(failure.cause, cause)
      assert.strictEqual(yield* socket.pull.pipe(Effect.flip), failure)
      yield* socket.write(outgoing)

      yield* Scope.close(scope, Exit.void)
      assert.strictEqual((yield* socket.pull.pipe(Effect.flip)).reason._tag, "DatagramSocketClosedError")
      assert.strictEqual(
        (yield* socket.write(outgoing).pipe(Effect.flip)).reason._tag,
        "DatagramSocketClosedError"
      )
    }))

  it.effect("drains terminal input one packet at a time and then resets byte accounting on close", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Effect.scope)
      const { handlers, socket } = yield* transportFixture({
        readBatchSize: 1,
        receiveCapacityBytes: 2
      }).pipe(Scope.provide(scope))
      handlers.onMessage(new Uint8Array([1]), address)
      handlers.onMessage(new Uint8Array([2]), address)
      handlers.onError("terminal")
      assert.deepStrictEqual(yield* socket.pull, [packet([1])])
      assert.deepStrictEqual(yield* socket.pull, [packet([2])])
      assert.strictEqual((yield* socket.pull.pipe(Effect.flip)).reason._tag, "DatagramSocketReadError")
      yield* Scope.close(scope, Exit.void)
      handlers.onMessage(new Uint8Array([3]), address)
      assert.strictEqual((yield* socket.pull.pipe(Effect.flip)).reason._tag, "DatagramSocketClosedError")
    }))

  it.effect("settles pending pulls on terminal failure and lets closure override a failure before drain", () =>
    Effect.gen(function*() {
      const firstScope = yield* Scope.fork(yield* Effect.scope)
      const first = yield* transportFixture().pipe(Scope.provide(firstScope))
      const pending = yield* first.socket.pull.pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
      const cause = new Error("terminal")
      first.handlers.onError(cause)
      const failure = yield* Fiber.join(pending)
      assert.strictEqual(failure.reason._tag, "DatagramSocketReadError")
      assert.strictEqual(failure.cause, cause)

      const secondScope = yield* Scope.fork(yield* Effect.scope)
      const second = yield* transportFixture().pipe(Scope.provide(secondScope))
      second.handlers.onMessage(new Uint8Array([1]), address)
      second.handlers.onError(new Error("unobserved"))
      yield* Scope.close(secondScope, Exit.void)
      assert.strictEqual((yield* second.socket.pull.pipe(Effect.flip)).reason._tag, "DatagramSocketClosedError")
    }))

  it.effect("rejects acquisition in a closed scope without invoking the transport", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Effect.scope)
      yield* Scope.close(scope, Exit.void)
      let acquired = false
      const failure = yield* Datagram.fromTransport({ localAddress: address }, () => {
        acquired = true
        return Effect.succeed(binding)
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
            Effect.as(binding)
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
        const adapterClosed = yield* Deferred.make<never, Datagram.DatagramSocketError>()
        const cleanupStarted = yield* Deferred.make<void>()
        const finishCleanup = yield* Deferred.make<void>()
        const adapterFailure = new Datagram.DatagramSocketError({
          reason: new Datagram.DatagramSocketClosedError()
        })
        const pending = Deferred.succeed(started, undefined).pipe(
          Effect.andThen(Effect.never),
          Effect.raceFirst(Deferred.await(adapterClosed))
        )
        let handlers!: Datagram.Handlers
        const acquire = Datagram.fromTransport({ localAddress: address }, (callbacks) =>
          Effect.gen(function*() {
            handlers = callbacks
            yield* Effect.addFinalizer(() =>
              Deferred.fail(adapterClosed, adapterFailure).pipe(
                Effect.andThen(Deferred.succeed(cleanupStarted, undefined)),
                Effect.andThen(Deferred.await(finishCleanup))
              )
            )
            if (phase === "acquisition") return yield* pending
            return { ...binding, send: () => pending }
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

describe("DatagramSocket.fromAssociatedTransport", () => {
  it.effect.each([-1, 0, 1.5, 0x1_0000])(
    "rejects malformed remote port $value before associated transport acquisition",
    (value) =>
      Effect.gen(function*() {
        let acquired = false
        const failure = yield* Datagram.fromAssociatedTransport({
          localAddress: address,
          remote: { ...address, port: value } as NetAddress.InetAddress
        }, () => {
          acquired = true
          return Effect.succeed(binding)
        }).pipe(Effect.flip)
        assert.strictEqual(failure.reason._tag, "DatagramSocketInvalidOptionsError")
        assert.isFalse(acquired)
      })
  )

  it.effect("rejects a cross-family peer before associated transport acquisition", () =>
    Effect.gen(function*() {
      let acquired = false
      const failure = yield* Datagram.fromAssociatedTransport({
        localAddress: address,
        remote: NetAddress.inetAddressFromIpStringUnsafe("::1", 12345)
      }, () => {
        acquired = true
        return Effect.succeed(binding)
      }).pipe(Effect.flip)
      assert.strictEqual(failure.reason._tag, "DatagramSocketInvalidOptionsError")
      assert.isFalse(acquired)
    }))

  it.effect("rejects invalid buffering limits before associated transport acquisition", () =>
    Effect.gen(function*() {
      let acquired = false
      const failure = yield* Datagram.fromAssociatedTransport({
        localAddress: address,
        remote: address,
        readBatchSize: 0
      }, () => {
        acquired = true
        return Effect.succeed(binding)
      }).pipe(Effect.flip)
      assert.strictEqual(failure.reason._tag, "DatagramSocketInvalidOptionsError")
      assert.isFalse(acquired)
    }))

  it.effect("filters packets to the associated peer address and port", () =>
    Effect.gen(function*() {
      const remote = NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 54321)
      let handlers!: Datagram.Handlers
      const socket = yield* Datagram.fromAssociatedTransport({ localAddress: address, remote }, (callbacks) => {
        handlers = callbacks
        return Effect.succeed(binding)
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

  it.effect("rejects ipv6Only with an IPv4 local address before associated acquisition", () =>
    Effect.gen(function*() {
      let acquired = false
      const failure = yield* Datagram.fromAssociatedTransport({
        localAddress: address,
        remote: address,
        ipv6Only: true
      }, () => {
        acquired = true
        return Effect.succeed(binding)
      }).pipe(Effect.flip)
      assert.strictEqual(failure.reason._tag, "DatagramSocketInvalidOptionsError")
      assert.isFalse(acquired)
    }))
})

describe("DatagramSocket.writeMany", () => {
  const packets = [outgoing, { ...outgoing, data: new Uint8Array() }, outgoing]
  const sendTransport = (
    send: (packet: Datagram.Packet) => Effect.Effect<void, Datagram.DatagramSocketError>,
    options: Omit<Datagram.BindOptions, "localAddress"> = {}
  ) =>
    Datagram.fromTransport(
      { localAddress: address, ...options },
      () => Effect.succeed({ ...binding, send })
    )

  const writeFailure = (
    destination: NetAddress.InetAddress,
    accepted: number,
    cause: unknown = new Error("send failed")
  ) =>
    new Datagram.DatagramSocketError({
      reason: new Datagram.DatagramSocketWriteError({ cause, destination, accepted })
    })

  it.effect.each([1, 65])(
    "rejects an oversized packet at index %s before any adapter call",
    (oversizedIndex) =>
      Effect.gen(function*() {
        let calls = 0
        const socket = yield* sendTransport(() =>
          Effect.sync(() => {
            calls++
          }), { maxPacketBytes: 1 })
        const group = Array.from({ length: 70 }, (_, index) => ({
          ...outgoing,
          data: new Uint8Array(index === oversizedIndex ? 2 : 1)
        }))
        const failure = yield* socket.writeMany(group).pipe(Effect.flip)
        assert.strictEqual(failure.reason._tag, "DatagramSocketMessageTooLargeError")
        assert.strictEqual(calls, 0)
      })
  )

  it.effect("preserves size, numeric destination and family error precedence for both writers", () =>
    Effect.gen(function*() {
      let calls = 0
      const socket = yield* sendTransport(() => Effect.sync(() => calls++), { maxPacketBytes: 1 })
      const peer = forgedInetAddress(addressV6, { port: 0 })
      for (const batch of [false, true]) {
        const write = (packet: Datagram.Packet) => batch ? socket.writeMany([outgoing, packet]) : socket.write(packet)
        const oversized = yield* write({ data: new Uint8Array(2), peer }).pipe(Effect.flip)
        assert.strictEqual(oversized.reason._tag, "DatagramSocketMessageTooLargeError")
        const numeric = yield* write({ data: new Uint8Array(1), peer }).pipe(Effect.flip)
        assert.strictEqual(numeric.message, "A datagram peer port must be an integer between 1 and 65535")
        const family = yield* write({ data: new Uint8Array(1), peer: addressV6 }).pipe(Effect.flip)
        assert.strictEqual(family.message, "Datagram destination must use the socket's address family")
      }
      assert.strictEqual(calls, 0)
    }))

  it.effect("rejects every cross-family peer before any batch submission", () =>
    Effect.gen(function*() {
      let calls = 0
      const socket = yield* sendTransport(() => Effect.sync(() => calls++))
      const wrongFamily = NetAddress.inetAddressFromIpStringUnsafe("::1", 12345)
      for (
        const operation of [
          socket.write({ data: new Uint8Array([1]), peer: wrongFamily }),
          socket.writeMany([outgoing, { data: new Uint8Array([2]), peer: wrongFamily }, outgoing])
        ]
      ) {
        const failure = yield* operation.pipe(Effect.flip)
        assert.strictEqual(failure.reason._tag, "DatagramSocketInvalidOptionsError")
      }
      assert.strictEqual(calls, 0)
    }))

  it.effect.each([
    { name: "zero port", localAddress: address, peer: forgedInetAddress(address, { port: 0 }) },
    { name: "negative port", localAddress: address, peer: forgedInetAddress(address, { port: -1 }) },
    { name: "fractional port", localAddress: address, peer: forgedInetAddress(address, { port: 1.5 }) },
    { name: "NaN port", localAddress: address, peer: forgedInetAddress(address, { port: Number.NaN }) },
    { name: "oversized port", localAddress: address, peer: forgedInetAddress(address, { port: 0x1_0000 }) },
    { name: "negative IPv6 scope", localAddress: addressV6, peer: forgedInetAddress(addressV6, { scopeId: -1 }) },
    {
      name: "fractional IPv6 scope",
      localAddress: addressV6,
      peer: forgedInetAddress(addressV6, { scopeId: 1.5 })
    },
    { name: "NaN IPv6 scope", localAddress: addressV6, peer: forgedInetAddress(addressV6, { scopeId: Number.NaN }) },
    {
      name: "oversized IPv6 scope",
      localAddress: addressV6,
      peer: forgedInetAddress(addressV6, { scopeId: 0x1_0000_0000 })
    }
  ])(
    "rejects a malformed destination $name before write or batch submission",
    ({ localAddress, peer }) =>
      Effect.gen(function*() {
        let calls = 0
        const socket = yield* Datagram.fromTransport({ localAddress }, () =>
          Effect.succeed({
            ...binding,
            address: localAddress,
            send: () => Effect.sync(() => calls++)
          }))
        const invalid = { data: new Uint8Array([2]), peer }
        const writeFailure = yield* socket.write(invalid).pipe(Effect.flip)
        assert.strictEqual(writeFailure.reason._tag, "DatagramSocketInvalidOptionsError")
        const batchFailure = yield* socket.writeMany([
          { data: new Uint8Array([1]), peer: localAddress },
          invalid,
          { data: new Uint8Array([3]), peer: localAddress }
        ]).pipe(Effect.flip)
        assert.strictEqual(batchFailure.reason._tag, "DatagramSocketInvalidOptionsError")
        assert.strictEqual(calls, 0)
      })
  )

  it.effect("accepts zero and maximum uint32 IPv6 destination scopes", () =>
    Effect.gen(function*() {
      const submitted: Array<NetAddress.InetAddress> = []
      const socket = yield* Datagram.fromTransport({ localAddress: addressV6 }, () =>
        Effect.succeed({
          ...binding,
          address: addressV6,
          send: (packet) => Effect.sync(() => submitted.push(packet.peer))
        }))
      const maximumScope = forgedInetAddress(addressV6, { scopeId: 0xffff_ffff })
      yield* socket.writeMany([
        { data: new Uint8Array([1]), peer: addressV6 },
        { data: new Uint8Array([2]), peer: maximumScope }
      ])
      assert.deepStrictEqual(submitted, [addressV6, maximumScope])
    }))

  it.effect("submits distinct datagrams in order, copying inputs at execution", () =>
    Effect.gen(function*() {
      const peer2 = NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 12346)
      const data = new Uint8Array([1])
      const submitted: Array<Datagram.Packet> = []
      const socket = yield* sendTransport((packet) =>
        Effect.sync(() => {
          submitted.push(packet)
        })
      )
      const operation = socket.writeMany([{ data, peer: address }, { data: new Uint8Array(), peer: peer2 }])
      data[0] = 2
      yield* operation
      assert.deepStrictEqual(submitted.map((packet) => Array.from(packet.data)), [[2], []])
      assert.deepStrictEqual(submitted.map((packet) => packet.peer), [address, peer2])
      assert.notStrictEqual(submitted[0].data, data)
      yield* socket.writeMany([])
      assert.strictEqual(submitted.length, 2)
    }))

  it.effect.each([-1, 1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "defects when a failed send reports invalid accepted progress %s",
    (accepted) =>
      Effect.gen(function*() {
        const socket = yield* sendTransport((packet) => Effect.fail(writeFailure(packet.peer, accepted)))
        assert.isTrue(Exit.hasDies(yield* socket.write(outgoing).pipe(Effect.exit)))
        assert.isTrue(Exit.hasDies(yield* socket.writeMany(packets).pipe(Effect.exit)))
      })
  )

  it.effect("interrupts a pending send without submitting the remainder", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      const interrupted = yield* Deferred.make<void>()
      let calls = 0
      const socket = yield* sendTransport(() => {
        calls++
        return Deferred.succeed(started, undefined).pipe(
          Effect.andThen(Effect.never),
          Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined))
        )
      })
      const writing = yield* socket.writeMany(packets).pipe(Effect.forkChild({ startImmediately: true }))
      yield* Deferred.await(started)
      yield* Fiber.interrupt(writing)
      yield* Deferred.await(interrupted)
      assert.strictEqual(calls, 1)
    }))

  it.effect("passes non-write failures through unchanged", () =>
    Effect.gen(function*() {
      const failure = new Datagram.DatagramSocketError({ reason: new Datagram.DatagramSocketClosedError({}) })
      const socket = yield* sendTransport(() => Effect.fail(failure))
      assert.strictEqual(yield* socket.writeMany(packets).pipe(Effect.flip), failure)
    }))

  it.effect("settles blocked batches on closure and rejects subsequent writes", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Effect.scope)
      const adapterClosed = yield* Deferred.make<void, Datagram.DatagramSocketError>()
      const socket = yield* Datagram.fromTransport(
        { localAddress: address },
        () =>
          Effect.gen(function*() {
            yield* Effect.addFinalizer(() => Deferred.fail(adapterClosed, writeFailure(address, 0)))
            return { ...binding, send: () => Deferred.await(adapterClosed) }
          })
      ).pipe(Scope.provide(scope))
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

  it.effect("retains ordinary scheduler fairness and permits cancellation between packets", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      let submitted = 0
      const socket = yield* sendTransport(() =>
        Effect.sync(() => {
          submitted++
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

  it.effect("copies associated payloads immediately before each sequential submission", () =>
    Effect.gen(function*() {
      const remote = NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 12346)
      const data = new Uint8Array([1])
      const received: Array<number> = []
      let submissions = 0
      const socket = yield* Datagram.fromAssociatedTransport({ localAddress: address, remote }, () =>
        Effect.succeed({
          ...binding,
          send: (packet) =>
            Effect.sync(() => {
              assert.deepStrictEqual(packet.peer, remote)
              received.push(packet.data[0])
              submissions++
              if (submissions === 1) data[0] = 3
            })
        }))
      const writing = socket.writeMany(Array.from({ length: 150 }, () => data))
      data[0] = 2
      yield* writing
      assert.deepStrictEqual(
        received,
        Array.from({ length: 150 }, (_, i) => i === 0 ? 2 : 3)
      )
    }))

  it.effect("reports the exact accepted prefix and stops at the failing packet", () =>
    Effect.gen(function*() {
      let submissions = 0
      const cause = new Error("sequential send failed")
      const socket = yield* sendTransport((packet) => {
        submissions++
        if (submissions < 3) return Effect.void
        return Effect.fail(
          new Datagram.DatagramSocketError({
            reason: new Datagram.DatagramSocketWriteError({
              cause,
              destination: packet.peer,
              accepted: 0
            })
          })
        )
      })
      const failure = yield* socket.writeMany([outgoing, outgoing, outgoing, outgoing]).pipe(Effect.flip)
      assert.strictEqual(failure.reason._tag, "DatagramSocketWriteError")
      if (failure.reason._tag === "DatagramSocketWriteError") {
        assert.strictEqual(failure.reason.accepted, 2)
        assert.strictEqual(failure.reason.cause, cause)
      }
      assert.strictEqual(submissions, 3)
    }))

  it.effect("passes channel groups through the batch capability and interrupts pending batches", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      const interrupted = yield* Deferred.make<void>()
      const socket = Datagram.makeUnassociated({
        ...binding,
        write: () => Effect.die("unexpected individual write"),
        pull: Deferred.await(started).pipe(Effect.andThen(Effect.succeed([packet([9])] as const))),
        addMembership: () => Effect.void,
        dropMembership: () => Effect.void,
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

  it.effect("reports channel write failures relative to the current group", () =>
    Effect.gen(function*() {
      const group1 = [packet([1]), packet([2])]
      const group2 = [packet([3]), packet([4]), packet([5])]
      const submitted: Array<number> = []
      const cause = new Error("second group failed")
      const socket = yield* sendTransport((packet) => {
        submitted.push(packet.data[0])
        return packet.data[0] === 4 ? Effect.fail(writeFailure(packet.peer, 0, cause)) : Effect.void
      })
      const failure = yield* Stream.fromIterable(group1).pipe(
        Stream.concat(Stream.fromIterable(group2)),
        Stream.pipeThroughChannel(Datagram.toChannel(socket)),
        Stream.runDrain,
        Effect.flip
      )
      assert.deepStrictEqual(submitted, [1, 2, 3, 4])
      assert.strictEqual(failure.reason._tag, "DatagramSocketWriteError")
      if (failure.reason._tag === "DatagramSocketWriteError") {
        assert.strictEqual(failure.reason.accepted, 1)
        assert.strictEqual(failure.reason.cause, cause)
      }
    }))
})

describe("DatagramSocket configuration", () => {
  const group = ipv4MulticastFixture("239.255.0.1")

  it.effect("settles pending controls on close and rejects subsequent controls before calling the binding", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Effect.scope)
      const adapterClosed = yield* Deferred.make<void, Datagram.DatagramSocketError>()
      let calls = 0
      const socket = yield* Datagram.fromTransport({ localAddress: address }, () =>
        Effect.gen(function*() {
          yield* Effect.addFinalizer(() =>
            Deferred.fail(
              adapterClosed,
              new Datagram.DatagramSocketError({ reason: new Datagram.DatagramSocketClosedError() })
            )
          )
          return {
            ...binding,
            send: () => Effect.void,
            setBroadcast: () =>
              Effect.suspend(() => {
                calls++
                return Effect.void
              }),
            setMulticastInterface: () =>
              Effect.suspend(() => {
                calls++
                return Deferred.await(adapterClosed)
              }),
            addMembership: () =>
              Effect.sync(() => {
                calls++
              }),
            dropMembership: () =>
              Effect.sync(() => {
                calls++
              })
          }
        })).pipe(Scope.provide(scope))
      const pending = yield* socket.setMulticastInterface(NetAddress.ipv4Loopback).pipe(
        Effect.flip,
        Effect.forkChild({ startImmediately: true })
      )
      assert.strictEqual(calls, 1)
      yield* Scope.close(scope, Exit.void)
      assert.strictEqual((yield* Fiber.join(pending)).reason._tag, "DatagramSocketClosedError")
      for (
        const effect of [
          socket.setBroadcast(false),
          socket.setMulticastInterface(NetAddress.ipv4Loopback),
          socket.addMembership(
            group,
            { interface: 1 } as unknown as Datagram.MembershipOptions<NetAddress.Ipv4Address>
          ),
          socket.dropMembership(
            group,
            { interface: 1 } as unknown as Datagram.MembershipOptions<NetAddress.Ipv4Address>
          )
        ]
      ) {
        assert.strictEqual((yield* Effect.flip(effect)).reason._tag, "DatagramSocketClosedError")
      }
      assert.strictEqual(calls, 1)
    }))

  it.effect("validates native multicast selectors before calling the binding", () =>
    Effect.gen(function*() {
      let calls = 0
      const socket = yield* Datagram.fromTransport({ localAddress: address }, () =>
        Effect.succeed({
          ...binding,
          setMulticastInterface: () => Effect.sync(() => calls++)
        }))
      for (const networkInterface of [0, -1, 1.5, 0x1_0000_0000, NetAddress.ipv6Loopback]) {
        const failure = yield* socket.setMulticastInterface(
          networkInterface as unknown as NetAddress.Ipv4Address
        ).pipe(Effect.flip)
        assert.strictEqual(failure.reason._tag, "DatagramSocketInvalidOptionsError")
      }
      yield* socket.setMulticastInterface(NetAddress.ipv4Unspecified)
      yield* socket.setMulticastInterface(NetAddress.ipv4Loopback)
      assert.strictEqual(calls, 2)
    }))
})

describe("DatagramSocket multicast memberships", () => {
  const groupV4 = ipv4MulticastFixture("239.255.0.1")
  const groupV6 = ipv6MulticastFixture("ff02::114")

  it.effect("validates cross-field membership options before calling the adapter", () =>
    Effect.gen(function*() {
      let calls = 0
      const socket = yield* Datagram.fromTransport({ localAddress: address }, () =>
        Effect.succeed({
          ...binding,
          addMembership: () =>
            Effect.sync(() => {
              calls++
            }),
          dropMembership: () =>
            Effect.sync(() => {
              calls++
            })
        }))
      const invalid: ReadonlyArray<readonly [NetAddress.MulticastAddress, Datagram.MembershipOptions]> = [
        [NetAddress.ipv4Loopback as NetAddress.MulticastAddress<NetAddress.Ipv4Address>, {}],
        [groupV4, { source: NetAddress.ipv4Unspecified }],
        [groupV4, { source: NetAddress.ipv4Broadcast }],
        [groupV4, { source: groupV4 }],
        [groupV4, { source: NetAddress.ipv6Loopback }],
        [groupV4, { interface: 1 } as unknown as Datagram.MembershipOptions],
        [groupV6, { source: NetAddress.ipv6Unspecified }],
        [groupV6, { source: groupV6 }],
        [groupV6, { source: NetAddress.ipv4Loopback }]
      ]
      for (const [group, options] of invalid) {
        const failure = yield* socket.addMembership(group, options).pipe(Effect.flip)
        assert.strictEqual(failure.reason._tag, "DatagramSocketInvalidOptionsError")
      }
      assert.strictEqual(calls, 0)
      yield* socket.addMembership(groupV4, { interface: NetAddress.ipv4Loopback })
      yield* socket.dropMembership(groupV4, { interface: NetAddress.ipv4Unspecified })
      assert.strictEqual(calls, 2)
    }))

  it.effect("validates IPv6 membership indices before calling the adapter", () =>
    Effect.gen(function*() {
      const localAddress = NetAddress.inetAddressFromIpStringUnsafe("::1", 12345)
      let calls = 0
      const socket = yield* Datagram.fromTransport({ localAddress }, () =>
        Effect.succeed({
          ...binding,
          address: localAddress,
          addMembership: () => Effect.sync(() => calls++),
          dropMembership: () => Effect.sync(() => calls++)
        }))
      for (const networkInterface of [-1, 1.5, 0x1_0000_0000, NetAddress.ipv4Loopback]) {
        const failure = yield* socket.addMembership(groupV6, {
          interface: networkInterface as unknown as number
        }).pipe(Effect.flip)
        assert.strictEqual(failure.reason._tag, "DatagramSocketInvalidOptionsError")
      }
      yield* socket.addMembership(groupV6, { interface: 0 })
      yield* socket.dropMembership(groupV6, { interface: 1 })
      assert.strictEqual(calls, 2)
    }))

  it.effect("reads options at execution and passes one frozen snapshot to the adapter", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      const finish = yield* Deferred.make<void>()
      let captured: Datagram.MembershipOptions | undefined
      const socket = yield* Datagram.fromTransport({ localAddress: address }, () =>
        Effect.succeed({
          ...binding,
          addMembership: (_group, options) => {
            captured = options
            Deferred.doneUnsafe(started, Exit.void)
            return Deferred.await(finish)
          }
        }))
      const options: { interface?: NetAddress.Ipv4Address } = { interface: NetAddress.ipv4Unspecified }
      const operation = socket.addMembership(groupV4, options)
      options.interface = NetAddress.ipv4Loopback
      const running = yield* operation.pipe(Effect.forkChild({ startImmediately: true }))
      yield* Deferred.await(started)
      options.interface = NetAddress.ipv4Broadcast
      assert.deepStrictEqual(captured?.interface, NetAddress.ipv4Loopback)
      assert.isTrue(Object.isFrozen(captured))
      yield* Deferred.succeed(finish, undefined)
      yield* Fiber.join(running)
    }))
})
