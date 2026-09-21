import { assert, describe, it } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Result from "effect/Result"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Datagram from "effect/unstable/socket/DatagramSocket"

const local = Result.getOrThrow(NetAddress.inetAddressV4(NetAddress.ipv4Loopback, 0))
const peer = Result.getOrThrow(NetAddress.inetAddressV4(NetAddress.ipv4Loopback, 4040))

const squash = (cause: Cause.Cause<unknown>) => Cause.squash(cause) as Datagram.DatagramSocketError

interface Fixture {
  readonly calls: Array<string>
  readonly sent: Array<Datagram.Packet<NetAddress.Ipv4Address>>
  handlers?: Datagram.Handlers<NetAddress.Ipv4Address>
  send?: (packet: Datagram.Packet<NetAddress.Ipv4Address>) => Effect.Effect<void, Datagram.DatagramSocketError>
}

const makeFixture = (): Fixture => ({ calls: [], sent: [] })

const acquire = (fixture: Fixture) =>
(handlers: Datagram.Handlers<NetAddress.Ipv4Address>): Effect.Effect<
  Datagram.Binding<NetAddress.Ipv4Address>,
  Datagram.DatagramSocketError,
  Scope.Scope
> =>
  Effect.gen(function*() {
    fixture.calls.push("acquire")
    fixture.handlers = handlers
    yield* Effect.addFinalizer(() => Effect.sync(() => fixture.calls.push("release")))
    const configure = (name: string) =>
      Effect.sync(() => {
        fixture.calls.push(name)
      })
    return {
      address: local,
      send: fixture.send ?? ((packet) =>
        Effect.sync(() => {
          fixture.sent.push(packet)
        })),
      setBroadcast: () => configure("setBroadcast"),
      setMulticastInterface: () => configure("setMulticastInterface"),
      addMembership: (_group, options) =>
        Effect.sync(() => {
          assert.isTrue(Object.isFrozen(options))
          fixture.calls.push(`add:${NetAddress.formatIp(options.source!)}`)
        }),
      dropMembership: () => configure("dropMembership")
    }
  })

const withSocket = <A, E>(
  fixture: Fixture,
  use: (socket: Datagram.Unassociated<NetAddress.Ipv4Address>, scope: Scope.Closeable) => Effect.Effect<A, E>
) =>
  Effect.gen(function*() {
    const scope = yield* Scope.make()
    const socket = yield* Datagram.fromTransport({ localAddress: local }, acquire(fixture)).pipe(Scope.provide(scope))
    return yield* use(socket, scope)
  })

describe("DatagramSocket", () => {
  it.effect("validates before acquisition and rejects a closed scope", () =>
    Effect.gen(function*() {
      const invalidFixture = makeFixture()
      const invalidExit = yield* Datagram.fromTransport(
        { localAddress: local, receiveCapacity: 0 },
        acquire(invalidFixture)
      ).pipe(Effect.scoped, Effect.exit)
      assert.isTrue(Exit.isFailure(invalidExit))
      if (Exit.isFailure(invalidExit)) {
        assert.strictEqual(squash(invalidExit.cause).reason._tag, "DatagramSocketInvalidOptionsError")
      }
      assert.deepStrictEqual(invalidFixture.calls, [])

      const closedScope = yield* Scope.make()
      yield* Scope.close(closedScope, Exit.void)
      const closedExit = yield* Datagram.fromTransport({ localAddress: local }, acquire(invalidFixture)).pipe(
        Scope.provide(closedScope),
        Effect.exit
      )
      assert.isTrue(Exit.isFailure(closedExit))
      if (Exit.isFailure(closedExit)) {
        assert.strictEqual(squash(closedExit.cause).reason._tag, "DatagramSocketClosedError")
      }
      assert.deepStrictEqual(invalidFixture.calls, [])
    }))

  it.effect("closes partial acquisition before reporting parent-scope closure", () =>
    Effect.gen(function*() {
      const parent = Scope.makeUnsafe("parallel")
      const started = Deferred.makeUnsafe<void>()
      const released = Deferred.makeUnsafe<void>()
      const acquisition = Deferred.makeUnsafe<Datagram.Binding<NetAddress.Ipv4Address>, Datagram.DatagramSocketError>()
      const fiber = yield* Datagram.fromTransport({ localAddress: local }, (handlers) =>
        Effect.gen(function*() {
          yield* Effect.addFinalizer(() =>
            Effect.sync(() => {
              Deferred.doneUnsafe(released, Effect.void)
              Deferred.doneUnsafe(
                acquisition,
                Effect.fail(
                  new Datagram.DatagramSocketError({
                    reason: new Datagram.DatagramSocketOpenError({ cause: new Error("released") })
                  })
                )
              )
            })
          )
          Deferred.doneUnsafe(started, Effect.void)
          const binding = yield* Deferred.await(acquisition)
          handlers.onMessage(new Uint8Array([1]), peer)
          return binding
        })).pipe(
          Scope.provide(parent),
          Effect.exit,
          Effect.forkChild({ startImmediately: true })
        )
      yield* Deferred.await(started)
      yield* Scope.close(parent, Exit.void)
      yield* Deferred.await(released)
      const exit = yield* Fiber.join(fiber)
      assert.isTrue(Exit.isFailure(exit))
      if (Exit.isFailure(exit)) {
        assert.strictEqual(squash(exit.cause).reason._tag, "DatagramSocketClosedError")
      }
    }))

  it.effect("bounds batches and buffers, preserves empty packets, and drains a stable terminal error", () => {
    const fixture = makeFixture()
    const nativeFailure = new Error("receive failed")
    return Effect.gen(function*() {
      const scope = yield* Scope.make()
      const socket = yield* Datagram.fromTransport({
        localAddress: local,
        receiveCapacity: 3,
        receiveCapacityBytes: 2,
        readBatchSize: 2,
        maxPacketBytes: 2
      }, acquire(fixture)).pipe(Scope.provide(scope))
      fixture.handlers!.onMessage(new Uint8Array(), peer)
      fixture.handlers!.onMessage(new Uint8Array([1]), peer)
      fixture.handlers!.onMessage(new Uint8Array([2]), peer)
      fixture.handlers!.onMessage(new Uint8Array([3]), peer)
      fixture.handlers!.onMessage(new Uint8Array([4, 5, 6]), peer)
      fixture.handlers!.onError(nativeFailure)

      assert.deepStrictEqual((yield* socket.pull).map((packet) => [...packet.data]), [[], [1]])
      assert.deepStrictEqual((yield* socket.pull).map((packet) => [...packet.data]), [[2]])
      const first = yield* Effect.flip(socket.pull)
      const second = yield* Effect.flip(socket.pull)
      assert.strictEqual(first, second)
      assert.strictEqual(first.reason._tag, "DatagramSocketReadError")
      if (first.reason._tag === "DatagramSocketReadError") assert.strictEqual(first.reason.cause, nativeFailure)

      yield* socket.write({ data: new Uint8Array([9]), peer })
      yield* Scope.close(scope, Exit.void)
      const afterClose = yield* Effect.flip(socket.pull)
      assert.strictEqual(afterClose.reason._tag, "DatagramSocketClosedError")
    })
  })

  it.effect("interrupts a waiting pull without losing its packet", () => {
    const fixture = makeFixture()
    return withSocket(fixture, (socket, scope) =>
      Effect.gen(function*() {
        const waiting = yield* socket.pull.pipe(Effect.forkChild({ startImmediately: true }))
        yield* Effect.yieldNow
        yield* Fiber.interrupt(waiting)
        fixture.handlers!.onMessage(new Uint8Array([1]), peer)
        assert.deepStrictEqual([...(yield* socket.pull)[0].data], [1])
        yield* Scope.close(scope, Exit.void)
      }))
  })

  it.effect("shares packets across concurrent readers and toStream without loss", () => {
    const fixture = makeFixture()
    return Effect.gen(function*() {
      const scope = yield* Scope.make()
      const socket = yield* Datagram.fromTransport(
        { localAddress: local, readBatchSize: 1 },
        acquire(fixture)
      ).pipe(Scope.provide(scope))
      const first = yield* socket.pull.pipe(Effect.forkChild({ startImmediately: true }))
      const interrupted = yield* socket.pull.pipe(Effect.forkChild({ startImmediately: true }))
      const second = yield* socket.pull.pipe(Effect.forkChild({ startImmediately: true }))
      yield* Fiber.interrupt(interrupted)
      fixture.handlers!.onMessage(new Uint8Array([1]), peer)
      fixture.handlers!.onMessage(new Uint8Array([2]), peer)
      const output = [
        [...(yield* Fiber.join(first))[0].data][0],
        [...(yield* Fiber.join(second))[0].data][0]
      ].sort()
      assert.deepStrictEqual(output, [1, 2])

      const streamed = yield* Datagram.toStream(socket).pipe(
        Stream.take(1),
        Stream.runCollect,
        Effect.forkChild({ startImmediately: true })
      )
      fixture.handlers!.onMessage(new Uint8Array([3]), peer)
      assert.deepStrictEqual([...(yield* Fiber.join(streamed))[0].data], [3])
      yield* Scope.close(scope, Exit.void)
    })
  })

  it.effect("rejects invalid peers and oversized writes before adapter work", () => {
    const fixture = makeFixture()
    return Effect.gen(function*() {
      const zeroPort = Result.getOrThrow(NetAddress.inetAddressV4(NetAddress.ipv4Loopback, 0))
      const unspecified = Result.getOrThrow(NetAddress.inetAddressV4(NetAddress.ipv4Unspecified, 1))
      for (const remote of [zeroPort, unspecified]) {
        const exit = yield* Datagram.fromAssociatedTransport(
          { localAddress: local, remote },
          acquire(fixture)
        ).pipe(Effect.scoped, Effect.exit)
        assert.isTrue(Exit.isFailure(exit))
        if (Exit.isFailure(exit)) {
          assert.strictEqual(squash(exit.cause).reason._tag, "DatagramSocketInvalidOptionsError")
        }
      }
      const crossFamily = Result.getOrThrow(NetAddress.inetAddressV6(NetAddress.ipv6Loopback, 4040))
      const crossFamilyExit = yield* Datagram.fromAssociatedTransport(
        { localAddress: local, remote: crossFamily as any },
        acquire(fixture)
      ).pipe(Effect.scoped, Effect.exit)
      assert.isTrue(Exit.isFailure(crossFamilyExit))
      if (Exit.isFailure(crossFamilyExit)) {
        assert.strictEqual(squash(crossFamilyExit.cause).reason._tag, "DatagramSocketInvalidOptionsError")
      }
      assert.deepStrictEqual(fixture.calls, [])

      const scope = yield* Scope.make()
      const socket = yield* Datagram.fromTransport({ localAddress: local, maxPacketBytes: 1 }, acquire(fixture)).pipe(
        Scope.provide(scope)
      )
      const oversized = yield* socket.write({ data: new Uint8Array([1, 2]), peer }).pipe(Effect.flip)
      assert.strictEqual(oversized.reason._tag, "DatagramSocketMessageTooLargeError")
      assert.deepStrictEqual(fixture.sent, [])
      yield* socket.write({ data: new Uint8Array([3]), peer })
      assert.deepStrictEqual([...fixture.sent[0].data], [3])
      yield* Scope.close(scope, Exit.void)
    })
  })

  it.effect("validates a whole batch, copies at submission, and rebases the accepted prefix", () => {
    const fixture = makeFixture()
    let attempt = 0
    const cause = new Error("third failed")
    fixture.send = (packet) =>
      Effect.suspend(() => {
        fixture.sent.push(packet)
        if (attempt++ !== 4) return Effect.void
        return Effect.fail(
          new Datagram.DatagramSocketError({
            reason: new Datagram.DatagramSocketWriteError({ cause, destination: packet.peer, accepted: 0 })
          })
        )
      })
    return withSocket(fixture, (socket, scope) =>
      Effect.gen(function*() {
        const crossFamily = NetAddress.inetAddressFromIpStringUnsafe("::1", 4040)
        const invalidExit = yield* socket.writeMany([
          { data: new Uint8Array([1]), peer },
          { data: new Uint8Array([2]), peer: crossFamily as any }
        ]).pipe(Effect.exit)
        assert.isTrue(Exit.isFailure(invalidExit))
        assert.deepStrictEqual(fixture.sent, [])

        const reusable = new Uint8Array([1])
        const write = socket.write({ data: reusable, peer })
        reusable[0] = 2
        yield* write
        reusable[0] = 3
        yield* write
        assert.deepStrictEqual(fixture.sent.slice(0, 2).map((packet) => [...packet.data]), [[2], [3]])

        const failure = yield* Effect.flip(socket.writeMany([
          { data: new Uint8Array([4]), peer },
          { data: new Uint8Array([5]), peer },
          { data: new Uint8Array([6]), peer }
        ]))
        assert.strictEqual(failure.reason._tag, "DatagramSocketWriteError")
        if (failure.reason._tag === "DatagramSocketWriteError") {
          assert.strictEqual(failure.reason.accepted, 2)
          assert.strictEqual(failure.reason.cause, cause)
        }
        yield* Scope.close(scope, Exit.void)
      }))
  })

  it.effect("stops a blocked batch on interruption without submitting its remainder", () => {
    const fixture = makeFixture()
    const blocked = Deferred.makeUnsafe<void>()
    const secondStarted = Deferred.makeUnsafe<void>()
    let attempts = 0
    fixture.send = () => {
      attempts++
      if (attempts !== 2) return Effect.void
      Deferred.doneUnsafe(secondStarted, Effect.void)
      return Deferred.await(blocked)
    }
    return withSocket(fixture, (socket, scope) =>
      Effect.gen(function*() {
        const fiber = yield* socket.writeMany([
          { data: new Uint8Array([1]), peer },
          { data: new Uint8Array([2]), peer },
          { data: new Uint8Array([3]), peer }
        ]).pipe(Effect.forkChild({ startImmediately: true }))
        yield* Deferred.await(secondStarted)
        yield* Fiber.interrupt(fiber)
        Deferred.doneUnsafe(blocked, Effect.void)
        yield* Effect.yieldNow
        assert.strictEqual(attempts, 2)
        yield* Scope.close(scope, Exit.void)
      }))
  })

  it.effect("snapshots membership options at execution and rejects adapter progress seam violations", () => {
    const fixture = makeFixture()
    fixture.send = (packet) =>
      Effect.fail(
        new Datagram.DatagramSocketError({
          reason: new Datagram.DatagramSocketWriteError({
            cause: new Error("bad adapter"),
            destination: packet.peer,
            accepted: 1
          })
        })
      )
    return withSocket(fixture, (socket, scope) =>
      Effect.gen(function*() {
        const group = NetAddress.ipFromStringUnsafe("239.255.0.1")
        assert.isTrue(NetAddress.isMulticast(group))
        if (!NetAddress.isMulticast(group) || !NetAddress.isIpv4Address(group)) return
        const options: Datagram.MembershipOptions<NetAddress.Ipv4Address> = { source: NetAddress.ipv4Loopback }
        const join = socket.addMembership(group, options)
        ;(options as any).source = NetAddress.ipFromStringUnsafe("127.0.0.2")
        yield* join
        assert.isTrue(fixture.calls.includes("add:127.0.0.2"))

        const exit = yield* socket.write({ data: new Uint8Array([1]), peer }).pipe(Effect.exit)
        assert.isTrue(Exit.isFailure(exit))
        if (Exit.isFailure(exit)) assert.match(String(Cause.squash(exit.cause)), /invalid accepted progress/)
        yield* Scope.close(scope, Exit.void)
      }))
  })

  it.effect("settles a pending send as Closed before adapter cleanup under a parallel parent scope", () => {
    const fixture = makeFixture()
    const pending = Deferred.makeUnsafe<void, Datagram.DatagramSocketError>()
    fixture.send = () => Deferred.await(pending)
    const parent = Scope.makeUnsafe("parallel")
    const program = Effect.gen(function*() {
      const socket = yield* Datagram.fromTransport({ localAddress: local }, (handlers) =>
        Effect.gen(function*() {
          fixture.handlers = handlers
          yield* Effect.addFinalizer(() =>
            Effect.sync(() => {
              fixture.calls.push("release")
              Deferred.doneUnsafe(
                pending,
                Effect.fail(
                  new Datagram.DatagramSocketError({
                    reason: new Datagram.DatagramSocketWriteError({
                      cause: new Error("released"),
                      destination: peer,
                      accepted: 0
                    })
                  })
                )
              )
            })
          )
          return yield* acquire(fixture)(handlers)
        })).pipe(Scope.provide(parent))
      return yield* socket.write({ data: new Uint8Array([1]), peer }).pipe(Effect.forkChild({ startImmediately: true }))
    })
    return Effect.gen(function*() {
      const fiber = yield* program
      yield* Scope.close(parent, Exit.void)
      const failure = yield* Fiber.join(fiber).pipe(Effect.flip)
      assert.strictEqual(failure.reason._tag, "DatagramSocketClosedError")
    })
  })

  it.effect("keeps the associated public remote in its declared family while filtering canonically", () => {
    const local6 = Result.getOrThrow(NetAddress.inetAddressV6(NetAddress.ipv6Unspecified, 0))
    const mapped = Result.getOrThrow(
      NetAddress.inetAddressV6(NetAddress.toIpv4Mapped(NetAddress.ipv4Loopback), 4040)
    )
    return Effect.gen(function*() {
      const scope = yield* Scope.make()
      let handlers: Datagram.Handlers<NetAddress.Ipv6Address> | undefined
      const socket = yield* Datagram.fromAssociatedTransport({ localAddress: local6, remote: mapped }, (value) => {
        handlers = value
        return Effect.succeed({
          address: local6,
          send: () => Effect.void,
          setBroadcast: () => Effect.void,
          setMulticastInterface: () => Effect.void,
          addMembership: () => Effect.void,
          dropMembership: () => Effect.void
        })
      }).pipe(Scope.provide(scope))
      assert.strictEqual(socket.remote._tag, "InetAddressV6")
      handlers!.onMessage(new Uint8Array([1]), mapped)
      const unrelatedV4 = NetAddress.ipFromStringUnsafe("127.0.0.2")
      assert.isTrue(NetAddress.isIpv4Address(unrelatedV4))
      if (!NetAddress.isIpv4Address(unrelatedV4)) return
      const unrelated = Result.getOrThrow(
        NetAddress.inetAddressV6(NetAddress.toIpv4Mapped(unrelatedV4), 4040)
      )
      handlers!.onMessage(new Uint8Array([2]), unrelated)
      const batch = yield* socket.pull
      assert.deepStrictEqual([...batch[0].data], [1])
      assert.strictEqual(batch[0].peer._tag, "InetAddressV6")
      yield* Scope.close(scope, Exit.void)
    })
  })

  it.effect("keeps reception alive after channel upstream completion and cancels only channel work", () => {
    const fixture = makeFixture()
    const submitted = Deferred.makeUnsafe<void>()
    fixture.send = (packet) =>
      Effect.sync(() => {
        fixture.sent.push(packet)
        Deferred.doneUnsafe(submitted, Effect.void)
      })
    return withSocket(fixture, (socket, scope) =>
      Effect.gen(function*() {
        const output = yield* Stream.make({ data: new Uint8Array([1]), peer }).pipe(
          Stream.pipeThroughChannel(Datagram.toChannel(socket)),
          Stream.take(1),
          Stream.runCollect,
          Effect.forkChild({ startImmediately: true })
        )
        yield* Deferred.await(submitted)
        fixture.handlers!.onMessage(new Uint8Array([2]), peer)
        const packets = yield* Fiber.join(output)
        assert.deepStrictEqual([...packets[0].data], [2])

        fixture.handlers!.onMessage(new Uint8Array([3]), peer)
        assert.deepStrictEqual([...(yield* socket.pull)[0].data], [3])
        yield* Scope.close(scope, Exit.void)
      }))
  })

  it.effect("propagates a channel upstream failure while leaving the endpoint usable", () => {
    const fixture = makeFixture()
    return withSocket(fixture, (socket, scope) =>
      Effect.gen(function*() {
        const outgoing: Stream.Stream<Datagram.Packet<NetAddress.Ipv4Address>, string> = Stream.fail("boom")
        const failure = yield* outgoing.pipe(
          Stream.pipeThroughChannel(Datagram.toChannelWith<string>()(socket)),
          Stream.runDrain,
          Effect.flip
        )
        assert.strictEqual(failure, "boom")
        fixture.handlers!.onMessage(new Uint8Array([1]), peer)
        assert.deepStrictEqual([...(yield* socket.pull)[0].data], [1])
        yield* Scope.close(scope, Exit.void)
      }))
  })

  it.effect("reports an oversized later channel group without undoing the first", () => {
    const fixture = makeFixture()
    return Effect.gen(function*() {
      const scope = yield* Scope.make()
      const socket = yield* Datagram.fromTransport(
        { localAddress: local, maxPacketBytes: 1 },
        acquire(fixture)
      ).pipe(Scope.provide(scope))
      const first: Datagram.Packet<NetAddress.Ipv4Address> = { data: new Uint8Array([1]), peer }
      const second: Datagram.Packet<NetAddress.Ipv4Address> = { data: new Uint8Array([2, 3]), peer }
      const failure = yield* Stream.make(first).pipe(
        Stream.concat(Stream.make(second)),
        Stream.pipeThroughChannel(Datagram.toChannel(socket)),
        Stream.runDrain,
        Effect.flip
      )
      assert.strictEqual(failure.reason._tag, "DatagramSocketMessageTooLargeError")
      assert.deepStrictEqual(fixture.sent.map((packet) => [...packet.data]), [[1]])
      yield* socket.write({ data: new Uint8Array([4]), peer })
      assert.deepStrictEqual(fixture.sent.map((packet) => [...packet.data]), [[1], [4]])
      yield* Scope.close(scope, Exit.void)
    })
  })
})
