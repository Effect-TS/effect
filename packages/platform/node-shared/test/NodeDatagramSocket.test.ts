import * as NodeDatagramSocket from "@effect/platform-node-shared/NodeDatagramSocket"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Deferred, Effect, Exit, Fiber, Option, Result, Scheduler, Scope } from "effect"
import * as NetAddress from "effect/unstable/net/NetAddress"
import type * as Datagram from "effect/unstable/socket/DatagramSocket"
import { Buffer } from "node:buffer"
import * as Dgram from "node:dgram"
import * as Os from "node:os"
import * as Process from "node:process"
import { vi } from "vitest"

vi.mock("node:os", { spy: true })

const localAddress = NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 0)
const localAddressV6 = NetAddress.inetAddressFromIpStringUnsafe("::1", 0)

const ipv6MulticastFixture = (input: string): NetAddress.MulticastAddress<NetAddress.Ipv6Address> => {
  const address = Result.getOrThrow(NetAddress.ipv6FromString(input))
  if (!NetAddress.isMulticast(address)) throw new Error("expected IPv6 multicast test address")
  return address
}

const interfaceSnapshot = (name: string, index: number): NodeJS.Dict<Array<Os.NetworkInterfaceInfo>> => ({
  [name]: [{
    address: "fe80::1",
    netmask: "ffff:ffff:ffff:ffff::",
    family: "IPv6",
    mac: "00:00:00:00:00:00",
    internal: false,
    cidr: "fe80::1/64",
    scopeid: index
  }]
})

const captureNativeSocket = (event: "error" | "message") =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const signal = Deferred.makeUnsafe<Dgram.Socket>()
      const closed = Deferred.makeUnsafe<void>()
      const originalOn = Dgram.Socket.prototype.on
      const spy = vi.spyOn(Dgram.Socket.prototype, "on").mockImplementation(function(
        this: Dgram.Socket,
        observed: string | symbol,
        listener: (...args: Array<any>) => void
      ) {
        if (observed === event) {
          Deferred.doneUnsafe(signal, Exit.succeed(this))
          this.once("close", () => Deferred.doneUnsafe(closed, Exit.void))
        }
        return originalOn.call(this, observed, listener)
      })
      return { closed, signal, spy }
    }),
    ({ spy }) => Effect.sync(() => spy.mockRestore())
  )

type SendImpl = (this: Dgram.Socket, ...args: Array<any>) => any

const withSendSpy = (impl: (original: SendImpl, sends: number, args: Array<any>, self: Dgram.Socket) => any) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const original = Dgram.Socket.prototype.send as unknown as SendImpl
      let sends = 0
      return vi.spyOn(Dgram.Socket.prototype, "send").mockImplementation(function(
        this: Dgram.Socket,
        ...args: Array<any>
      ) {
        return impl(original, ++sends, args, this)
      })
    }),
    (spy) => Effect.sync(() => spy.mockRestore())
  )

describe("NodeDatagramSocket acquisition", { concurrent: false }, () => {
  it.live("settles when interface enumeration fails during setup", () =>
    Effect.gen(function*() {
      const cause = new Error("interface enumeration failed")
      yield* Effect.acquireRelease(
        Effect.sync(() =>
          vi.mocked(Os.networkInterfaces).mockImplementationOnce(() => {
            throw cause
          })
        ),
        (spy) => Effect.sync(() => spy.mockRestore())
      )

      const opening = yield* NodeDatagramSocket.bind({ localAddress }).pipe(
        Effect.scoped,
        Effect.exit,
        Effect.forkDetach
      )
      const awaited = yield* Fiber.join(opening).pipe(Effect.timeoutOption("3 seconds"))
      assert.isTrue(Option.isSome(awaited), "bind hung after interface enumeration failed")
      if (Option.isNone(awaited)) return
      assert.isTrue(Exit.isFailure(awaited.value))
      if (Exit.isSuccess(awaited.value)) return
      const failure = Cause.squash(awaited.value.cause) as Datagram.DatagramSocketError
      assert.strictEqual(failure.reason._tag, "DatagramSocketOpenError")
      assert.strictEqual(failure.cause, cause)
    }))

  it.live("settles when the parent scope closes during native setup", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.make()
      const opening = yield* NodeDatagramSocket.bind({ localAddress }).pipe(
        Scope.provide(scope),
        // This bounded yield point lets parent finalization overtake native
        // setup, reproducing the closed-scope acquireRelease registration path.
        Effect.provideService(Scheduler.MaxOpsBeforeYield, 24),
        Effect.exit,
        Effect.forkDetach
      )
      const closing = yield* Scope.close(scope, Exit.void).pipe(Effect.forkDetach)
      const closed = yield* Fiber.join(closing).pipe(
        Effect.as(Option.some(undefined)),
        Effect.timeoutOption("2 seconds")
      )
      const opened = yield* Fiber.join(opening).pipe(Effect.timeoutOption("2 seconds"))
      assert.isTrue(Option.isSome(opened), "bind hung after its parent scope closed")
      assert.isTrue(Option.isSome(closed), "parent scope close hung during native setup")
      if (Option.isNone(opened)) return
      assert.isTrue(Exit.isFailure(opened.value))
      if (Exit.isSuccess(opened.value)) return
      const failure = Cause.squash(opened.value.cause) as Datagram.DatagramSocketError
      assert.strictEqual(failure.reason._tag, "DatagramSocketClosedError")
    }))

  it.effect("owns a created socket before setup interruption can escape", () =>
    Effect.gen(function*() {
      const created = Deferred.makeUnsafe<Dgram.Socket>()
      let closeCalls = 0
      let interruptRequested = false
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          const originalOn = Dgram.Socket.prototype.on
          const on = vi.spyOn(Dgram.Socket.prototype, "on").mockImplementation(function(
            this: Dgram.Socket,
            event: string | symbol,
            listener: (...args: Array<any>) => void
          ) {
            const result = originalOn.call(this, event, listener)
            if (event === "listening" && !interruptRequested) {
              Deferred.doneUnsafe(created, Exit.succeed(this))
              interruptRequested = true
              Fiber.getCurrent()!.interruptUnsafe()
            }
            return result
          })
          const originalClose = Dgram.Socket.prototype.close
          const close = vi.spyOn(Dgram.Socket.prototype, "close").mockImplementation(function(
            this: Dgram.Socket,
            callback?: () => void
          ) {
            closeCalls++
            return originalClose.call(this, callback)
          })
          return { close, on }
        }),
        ({ close, on }) =>
          Effect.sync(() => {
            close.mockRestore()
            on.mockRestore()
          })
      )

      const opening = yield* NodeDatagramSocket.bind({ localAddress }).pipe(
        Effect.forkChild({ startImmediately: true })
      )
      const exit = yield* Fiber.await(opening)
      const nativeSocket = yield* Deferred.await(created)
      assert.isTrue(interruptRequested)
      assert.isTrue(Exit.hasInterrupts(exit))
      assert.strictEqual(closeCalls, 1)
      assert.deepStrictEqual(nativeSocket.eventNames(), [])
    }))

  it.effect("closes a native socket whose bind completes after acquisition is interrupted", () =>
    Effect.gen(function*() {
      const started = Deferred.makeUnsafe<Dgram.Socket>()
      const closed = Deferred.makeUnsafe<void>()
      yield* Effect.acquireRelease(
        Effect.sync(() =>
          vi.spyOn(Dgram.Socket.prototype, "bind").mockImplementation(function(
            this: Dgram.Socket
          ) {
            Deferred.doneUnsafe(started, Exit.succeed(this))
            return this
          })
        ),
        (spy) => Effect.sync(() => spy.mockRestore())
      )

      const opening = yield* NodeDatagramSocket.bind({ localAddress }).pipe(
        Effect.forkChild({ startImmediately: true })
      )
      const nativeSocket = yield* Deferred.await(started)
      let nativeRunning = false
      yield* Effect.acquireRelease(
        Effect.sync(() =>
          vi.spyOn(nativeSocket, "close").mockImplementation((callback?: () => void) => {
            if (!nativeRunning) {
              throw Object.assign(new Error("Not running"), { code: "ERR_SOCKET_DGRAM_NOT_RUNNING" })
            }
            nativeSocket.emit("close")
            callback?.()
            return nativeSocket
          })
        ),
        (spy) => Effect.sync(() => spy.mockRestore())
      )
      nativeSocket.once("close", () => Deferred.doneUnsafe(closed, Exit.void))
      const interrupting = yield* Fiber.interrupt(opening).pipe(Effect.forkChild({ startImmediately: true }))
      assert.isUndefined(interrupting.pollUnsafe())

      nativeRunning = true
      nativeSocket.emit("listening")
      yield* Deferred.await(closed).pipe(Effect.timeout("5 seconds"))
      yield* Fiber.join(interrupting)
      assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(opening)))
      assert.deepStrictEqual(nativeSocket.eventNames(), [])
    }))

  it.effect("finishes interrupted acquisition when a pending bind terminates with an error", () =>
    Effect.gen(function*() {
      const started = Deferred.makeUnsafe<Dgram.Socket>()
      yield* Effect.acquireRelease(
        Effect.sync(() =>
          vi.spyOn(Dgram.Socket.prototype, "bind").mockImplementation(function(this: Dgram.Socket) {
            Deferred.doneUnsafe(started, Exit.succeed(this))
            return this
          })
        ),
        (spy) => Effect.sync(() => spy.mockRestore())
      )
      const opening = yield* NodeDatagramSocket.bind({ localAddress }).pipe(
        Effect.forkChild({ startImmediately: true })
      )
      const nativeSocket = yield* Deferred.await(started)
      yield* Effect.acquireRelease(
        Effect.sync(() =>
          vi.spyOn(nativeSocket, "close").mockImplementation(() => {
            throw Object.assign(new Error("Not running"), { code: "ERR_SOCKET_DGRAM_NOT_RUNNING" })
          })
        ),
        (spy) => Effect.sync(() => spy.mockRestore())
      )
      const interrupting = yield* Fiber.interrupt(opening).pipe(Effect.forkChild({ startImmediately: true }))
      assert.isUndefined(interrupting.pollUnsafe())
      nativeSocket.emit("error", Object.assign(new Error("bind failed"), { code: "EADDRINUSE" }))
      yield* Fiber.join(interrupting).pipe(Effect.timeout("5 seconds"))
      assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(opening)))
      assert.deepStrictEqual(nativeSocket.eventNames(), [])
    }))

  it.effect("settles an interrupted connect and ignores a late native completion", () =>
    Effect.gen(function*() {
      const peer = yield* NodeDatagramSocket.bind({ localAddress })
      const started = Deferred.makeUnsafe<Dgram.Socket>()
      const closed = Deferred.makeUnsafe<void>()
      let bound!: { readonly address: string; readonly port: number }
      yield* Effect.acquireRelease(
        Effect.sync(() =>
          vi.spyOn(Dgram.Socket.prototype, "connect").mockImplementation(function(this: Dgram.Socket) {
            bound = this.address()
            Deferred.doneUnsafe(started, Exit.succeed(this))
            return this
          })
        ),
        (spy) => Effect.sync(() => spy.mockRestore())
      )

      const opening = yield* NodeDatagramSocket.connect({ localAddress, remote: peer.address }).pipe(
        Effect.forkChild({ startImmediately: true })
      )
      const nativeSocket = yield* Deferred.await(started)
      nativeSocket.once("close", () => Deferred.doneUnsafe(closed, Exit.void))
      yield* Fiber.interrupt(opening)
      yield* Deferred.await(closed).pipe(Effect.timeout("5 seconds"))
      assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(opening)))
      assert.isFalse(nativeSocket.emit("connect"))

      const rebound = yield* NodeDatagramSocket.bind({
        localAddress: NetAddress.inetAddressFromIpStringUnsafe(bound.address, bound.port)
      })
      assert.strictEqual(rebound.address.port, bound.port)
    }))

  it.effect("preserves synchronous bind failures and cleans up the unopened socket", () =>
    Effect.gen(function*() {
      const cause = new Error("bind failed synchronously")
      const { closed, signal } = yield* captureNativeSocket("error")
      yield* Effect.acquireRelease(
        Effect.sync(() =>
          vi.spyOn(Dgram.Socket.prototype, "bind").mockImplementation(function() {
            throw cause
          })
        ),
        (spy) => Effect.sync(() => spy.mockRestore())
      )
      const failure = yield* NodeDatagramSocket.bind({ localAddress }).pipe(Effect.flip)
      assert.strictEqual(failure.reason._tag, "DatagramSocketOpenError")
      assert.strictEqual(failure.cause, cause)
      assert.isTrue(yield* Deferred.isDone(closed))
      assert.deepStrictEqual((yield* Deferred.await(signal)).eventNames(), [])
    }))

  it.effect.skipIf(Process.platform === "win32")(
    "closes the native socket when a scoped bind cannot resolve its interface",
    () =>
      Effect.gen(function*() {
        yield* Effect.acquireRelease(
          Effect.sync(() => vi.mocked(Os.networkInterfaces).mockReturnValue({})),
          (spy) => Effect.sync(() => spy.mockRestore())
        )
        const { closed, signal } = yield* captureNativeSocket("error")
        const scoped = Result.getOrThrow(NetAddress.inetAddressV6(
          NetAddress.ipv6Loopback,
          0,
          { scopeId: 44 }
        ))
        const failure = yield* NodeDatagramSocket.bind({ localAddress: scoped }).pipe(Effect.flip)
        assert.strictEqual(failure.reason._tag, "DatagramSocketOpenError")
        assert.isTrue(yield* Deferred.isDone(closed))
        assert.deepStrictEqual((yield* Deferred.await(signal)).eventNames(), [])
      })
  )

  it.effect("enables initial broadcast after binding and before connecting", () =>
    Effect.gen(function*() {
      const peer = yield* NodeDatagramSocket.bind({ localAddress })
      const original = Dgram.Socket.prototype.setBroadcast
      let configured = false
      yield* Effect.acquireRelease(
        Effect.sync(() =>
          vi.spyOn(Dgram.Socket.prototype, "setBroadcast").mockImplementation(function(this: Dgram.Socket, enabled) {
            assert.isAbove(this.address().port, 0)
            assert.throws(() => this.remoteAddress())
            configured = enabled
            return original.call(this, enabled)
          })
        ),
        (spy) => Effect.sync(() => spy.mockRestore())
      )
      const socket = yield* NodeDatagramSocket.connect({ localAddress, remote: peer.address, broadcast: true })
      assert.isTrue(configured)
      yield* socket.write(new Uint8Array([1]))
      assert.deepStrictEqual(Array.from((yield* peer.pull)[0].data), [1])
    }))

  it.effect("preserves initial broadcast causes and releases setup failures", () =>
    Effect.gen(function*() {
      const cause = new Error("broadcast setup failed")
      let bound!: NetAddress.InetAddress
      const spy = yield* Effect.acquireRelease(
        Effect.sync(() =>
          vi.spyOn(Dgram.Socket.prototype, "setBroadcast").mockImplementation(function(this: Dgram.Socket) {
            const address = this.address()
            bound = NetAddress.inetAddressFromIpStringUnsafe(address.address, address.port)
            throw cause
          })
        ),
        (spy) => Effect.sync(() => spy.mockRestore())
      )
      const failure = yield* NodeDatagramSocket.bind({ localAddress, broadcast: true }).pipe(Effect.flip)
      assert.strictEqual(failure.reason._tag, "DatagramSocketOpenError")
      assert.strictEqual(failure.cause, cause)
      spy.mockRestore()
      const socket = yield* NodeDatagramSocket.bind({ localAddress: bound })
      yield* socket.write({ data: new Uint8Array([1]), peer: socket.address })
      assert.deepStrictEqual(Array.from((yield* socket.pull)[0].data), [1])
    }))

  it.effect("finishes finalization when the native socket was already closed", () =>
    Effect.gen(function*() {
      const { signal } = yield* captureNativeSocket("error")
      const scope = yield* Scope.make()
      yield* NodeDatagramSocket.bind({ localAddress }).pipe(Scope.provide(scope))
      const nativeSocket = yield* Deferred.await(signal)
      yield* Effect.callback<void>((resume) => {
        nativeSocket.close(() => resume(Effect.void))
      })
      yield* Scope.close(scope, Exit.void)
    }))

  it.effect("preserves unrelated synchronous finalizer defects", () =>
    Effect.gen(function*() {
      const { signal } = yield* captureNativeSocket("error")
      const scope = yield* Scope.make()
      yield* NodeDatagramSocket.bind({ localAddress }).pipe(Scope.provide(scope))
      const nativeSocket = yield* Deferred.await(signal)
      const cause = new Error("close failed")
      const spy = vi.spyOn(nativeSocket, "close").mockImplementation(() => {
        throw cause
      })
      const exit = yield* Scope.close(scope, Exit.void).pipe(Effect.exit)
      spy.mockRestore()
      assert.deepStrictEqual(nativeSocket.eventNames(), [])
      yield* Effect.callback<void>((resume) => {
        nativeSocket.close(() => {
          nativeSocket.removeAllListeners()
          resume(Effect.void)
        })
      })
      assert.isTrue(Exit.hasDies(exit))
    }))
})

describe("NodeDatagramSocket native send settlement", { concurrent: false }, () => {
  it.effect("ignores late completion after send interruption and keeps the endpoint usable", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Effect.scope)
      const socket = yield* NodeDatagramSocket.bind({ localAddress }).pipe(Scope.provide(scope))
      const peer = yield* NodeDatagramSocket.bind({ localAddress })
      let captured: ((error: Error | null) => void) | undefined
      yield* withSendSpy((original, sends, args, self) => {
        if (sends === 1) {
          captured = args[args.length - 1]
          return
        }
        return original.apply(self, args)
      })
      const sending = yield* socket.write({ data: new Uint8Array([1]), peer: peer.address }).pipe(
        Effect.forkChild({ startImmediately: true })
      )
      assert.isDefined(captured)
      yield* Fiber.interrupt(sending)
      const exit = yield* Fiber.await(sending)
      assert.isTrue(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause))
      captured!(new Error("late failure"))
      captured!(null)
      yield* socket.write({ data: new Uint8Array([2]), peer: peer.address })
      assert.deepStrictEqual(Array.from((yield* peer.pull)[0].data), [2])
      yield* Scope.close(scope, Exit.void).pipe(Effect.timeout("5 seconds"))
    }))

  it.effect("maps a synchronous native send failure and keeps the endpoint usable", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Effect.scope)
      const socket = yield* NodeDatagramSocket.bind({ localAddress }).pipe(Scope.provide(scope))
      const peer = yield* NodeDatagramSocket.bind({ localAddress })
      yield* withSendSpy((original, sends, args, self) => {
        if (sends === 1) throw new Error("synchronous native failure")
        return original.apply(self, args)
      })
      const failure = yield* socket.writeMany([
        { data: new Uint8Array([1]), peer: peer.address },
        { data: new Uint8Array([2]), peer: peer.address }
      ]).pipe(Effect.flip)
      assert.strictEqual(failure.reason._tag, "DatagramSocketWriteError")
      if (failure.reason._tag === "DatagramSocketWriteError") assert.strictEqual(failure.reason.accepted, 0)
      yield* socket.write({ data: new Uint8Array([3]), peer: peer.address })
      assert.deepStrictEqual(Array.from((yield* peer.pull)[0].data), [3])
      yield* Scope.close(scope, Exit.void).pipe(Effect.timeout("5 seconds"))
    }))

  it.effect("settles once when the native send callback completes synchronously", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Effect.scope)
      const socket = yield* NodeDatagramSocket.bind({ localAddress }).pipe(Scope.provide(scope))
      const peer = yield* NodeDatagramSocket.bind({ localAddress })
      yield* withSendSpy((_original, _sends, args) => {
        const callback = args[args.length - 1]
        callback(null)
        callback(new Error("second completion must be ignored"))
      })
      yield* socket.writeMany([
        { data: new Uint8Array([1]), peer: peer.address },
        { data: new Uint8Array([2]), peer: peer.address }
      ])
      yield* Scope.close(scope, Exit.void).pipe(Effect.timeout("5 seconds"))
    }))

  it.effect("settles a pending native send as closed before finalization completes", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Effect.scope)
      const socket = yield* NodeDatagramSocket.bind({ localAddress }).pipe(Scope.provide(scope))
      const peer = yield* NodeDatagramSocket.bind({ localAddress })
      let captured: ((error: Error | null) => void) | undefined
      yield* withSendSpy((_original, _sends, args) => {
        captured = args[args.length - 1]
      })
      const sending = yield* socket.write({ data: new Uint8Array([1]), peer: peer.address }).pipe(
        Effect.flip,
        Effect.forkChild({ startImmediately: true })
      )
      assert.isDefined(captured)
      yield* Scope.close(scope, Exit.void).pipe(Effect.timeout("5 seconds"))
      assert.strictEqual((yield* Fiber.join(sending)).reason._tag, "DatagramSocketClosedError")
      captured!(null)
    }))
})

describe("NodeDatagramSocket native multicast selectors", { concurrent: false }, () => {
  it.effect("forwards IPv4 addresses and default selection to the native setter", () =>
    Effect.gen(function*() {
      const calls: Array<string> = []
      yield* Effect.acquireRelease(
        Effect.sync(() =>
          vi.spyOn(Dgram.Socket.prototype, "setMulticastInterface").mockImplementation((value) => {
            calls.push(value)
          })
        ),
        (spy) => Effect.sync(() => spy.mockRestore())
      )
      const socket = yield* NodeDatagramSocket.bind({ localAddress })
      yield* socket.setMulticastInterface(NetAddress.ipv4Loopback)
      yield* socket.setMulticastInterface(NetAddress.ipv4Unspecified)
      assert.deepStrictEqual(calls, ["127.0.0.1", "0.0.0.0"])
    }))

  it.effect("formats index zero and known Unix indices without numeric fallback", () =>
    Effect.gen(function*() {
      const calls: Array<string> = []
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          const interfaces = vi.mocked(Os.networkInterfaces).mockReturnValue(interfaceSnapshot("effect0", 42))
          const setter = vi.spyOn(Dgram.Socket.prototype, "setMulticastInterface").mockImplementation((value) => {
            calls.push(value)
          })
          return { interfaces, setter }
        }),
        ({ interfaces, setter }) =>
          Effect.sync(() => {
            interfaces.mockRestore()
            setter.mockRestore()
          })
      )
      const socket = yield* NodeDatagramSocket.bind({ localAddress: localAddressV6 })
      yield* socket.setMulticastInterface(0)
      yield* socket.setMulticastInterface(42)
      assert.deepStrictEqual(calls, Process.platform === "win32" ? ["::", "::%42"] : ["::", "::%effect0"])
    }))

  it.effect("uses numeric IPv6 indices on Windows", () =>
    Effect.gen(function*() {
      const descriptor = Object.getOwnPropertyDescriptor(globalThis.process, "platform")!
      const calls: Array<string> = []
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          Object.defineProperty(globalThis.process, "platform", { ...descriptor, value: "win32" })
          const interfaces = vi.mocked(Os.networkInterfaces).mockReturnValue({})
          const setter = vi.spyOn(Dgram.Socket.prototype, "setMulticastInterface").mockImplementation((value) => {
            calls.push(value)
          })
          return { interfaces, setter }
        }),
        ({ interfaces, setter }) =>
          Effect.sync(() => {
            Object.defineProperty(globalThis.process, "platform", descriptor)
            interfaces.mockRestore()
            setter.mockRestore()
          })
      )
      const socket = yield* NodeDatagramSocket.bind({ localAddress: localAddressV6 })
      yield* socket.setMulticastInterface(42)
      assert.deepStrictEqual(calls, ["::%42"])
    }))

  it.effect.skipIf(Process.platform === "win32")(
    "refreshes a missed Unix index once and rejects it when still unresolved",
    () =>
      Effect.gen(function*() {
        const calls: Array<string> = []
        const interfaces = yield* Effect.acquireRelease(
          Effect.sync(() =>
            vi.mocked(Os.networkInterfaces)
              .mockReturnValueOnce({})
              .mockReturnValueOnce(interfaceSnapshot("appeared0", 43))
              .mockReturnValue({})
          ),
          (spy) => Effect.sync(() => spy.mockRestore())
        )
        yield* Effect.acquireRelease(
          Effect.sync(() =>
            vi.spyOn(Dgram.Socket.prototype, "setMulticastInterface").mockImplementation((value) => {
              calls.push(value)
            })
          ),
          (spy) => Effect.sync(() => spy.mockRestore())
        )
        const socket = yield* NodeDatagramSocket.bind({ localAddress: localAddressV6 })
        yield* socket.setMulticastInterface(43)
        const failure = yield* socket.setMulticastInterface(44).pipe(Effect.flip)
        assert.strictEqual(failure.reason._tag, "DatagramSocketConfigurationError")
        assert.deepStrictEqual(calls, ["::%appeared0"])
        assert.strictEqual(interfaces.mock.calls.length, 3)
      })
  )

  it.effect.skipIf(Process.platform === "win32")(
    "fails a scoped send without numeric fallback and preserves accepted-prefix progress",
    () =>
      Effect.gen(function*() {
        const interfaces = yield* Effect.acquireRelease(
          Effect.sync(() => vi.mocked(Os.networkInterfaces).mockReturnValue({})),
          (spy) => Effect.sync(() => spy.mockRestore())
        )
        const socket = yield* NodeDatagramSocket.bind({ localAddress: localAddressV6 })
        const unresolved = Result.getOrThrow(NetAddress.inetAddressV6(
          NetAddress.ipv6Loopback,
          socket.address.port,
          { scopeId: 44 }
        ))
        const failure = yield* socket.writeMany([
          { data: new Uint8Array([1]), peer: socket.address },
          { data: new Uint8Array([2]), peer: unresolved },
          { data: new Uint8Array([3]), peer: socket.address }
        ]).pipe(Effect.flip)
        assert.strictEqual(failure.reason._tag, "DatagramSocketWriteError")
        if (failure.reason._tag === "DatagramSocketWriteError") assert.strictEqual(failure.reason.accepted, 1)
        assert.deepStrictEqual((yield* socket.pull).map((packet) => Array.from(packet.data)), [[1]])
        assert.strictEqual(interfaces.mock.calls.length, 2)
      })
  )

  it.effect.each(["addMembership", "dropMembership"] as const)(
    "%s forwards formatted selectors and omits the default index",
    (operation) =>
      Effect.gen(function*() {
        const calls: Array<readonly [string, string | undefined]> = []
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            const interfaces = vi.mocked(Os.networkInterfaces).mockReturnValue(interfaceSnapshot("effect0", 42))
            const membership = vi.spyOn(Dgram.Socket.prototype, operation).mockImplementation(
              (group, networkInterface) => {
                calls.push([group, networkInterface])
              }
            )
            return { interfaces, membership }
          }),
          ({ interfaces, membership }) =>
            Effect.sync(() => {
              interfaces.mockRestore()
              membership.mockRestore()
            })
        )
        const socket = yield* NodeDatagramSocket.bind({ localAddress: localAddressV6 })
        const group = ipv6MulticastFixture("ff02::114")
        yield* socket[operation](group, { interface: 0 })
        yield* socket[operation](group, { interface: 42 })
        assert.deepStrictEqual(
          calls,
          Process.platform === "win32"
            ? [["ff02::114", undefined], ["ff02::114", "::%42"]]
            : [["ff02::114", undefined], ["ff02::114", "::%effect0"]]
        )
      })
  )

  it.effect.each(["addMembership", "dropMembership"] as const)(
    "%s preserves source-specific argument order and configuration failures",
    (operation) =>
      Effect.gen(function*() {
        const calls: Array<ReadonlyArray<string | undefined>> = []
        const cause = new Error("native membership failed")
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            const interfaces = vi.mocked(Os.networkInterfaces).mockReturnValue(interfaceSnapshot("effect0", 42))
            const method = operation === "addMembership"
              ? "addSourceSpecificMembership"
              : "dropSourceSpecificMembership"
            const membership = vi.spyOn(Dgram.Socket.prototype, method).mockImplementation(
              (source, group, networkInterface) => {
                calls.push([source, group, networkInterface])
                if (calls.length === 3) throw cause
              }
            )
            return { interfaces, membership }
          }),
          ({ interfaces, membership }) =>
            Effect.sync(() => {
              interfaces.mockRestore()
              membership.mockRestore()
            })
        )
        const socket = yield* NodeDatagramSocket.bind({ localAddress: localAddressV6 })
        const group = ipv6MulticastFixture("ff02::114")
        const source = NetAddress.ipv6Loopback
        yield* socket[operation](group, { source })
        yield* socket[operation](group, { source, interface: 42 })
        const failure = yield* socket[operation](group, { source, interface: 0 }).pipe(Effect.flip)
        assert.deepStrictEqual(calls, [
          ["::1", "ff02::114", undefined],
          ["::1", "ff02::114", Process.platform === "win32" ? "::%42" : "::%effect0"],
          ["::1", "ff02::114", undefined]
        ])
        assert.strictEqual(failure.reason._tag, "DatagramSocketConfigurationError")
        if (failure.reason._tag === "DatagramSocketConfigurationError") {
          assert.strictEqual(failure.reason.operation, operation)
          assert.strictEqual(failure.reason.cause, cause)
        }
        if (Process.platform !== "win32") {
          const unresolved = yield* socket[operation](group, { source, interface: 43 }).pipe(Effect.flip)
          assert.strictEqual(unresolved.reason._tag, "DatagramSocketConfigurationError")
          if (unresolved.reason._tag === "DatagramSocketConfigurationError") {
            assert.strictEqual(unresolved.reason.operation, operation)
          }
          assert.strictEqual(calls.length, 3)
        }
      })
  )
})

describe("NodeDatagramSocket receive event fixture", { concurrent: false }, () => {
  it.effect.each(["EHOSTUNREACH", "ENETUNREACH", "EMSGSIZE"])(
    "drops synthetic recoverable recvmsg %s without poisoning reception",
    (code) =>
      Effect.gen(function*() {
        const { signal } = yield* captureNativeSocket("error")
        const socket = yield* NodeDatagramSocket.bind({ localAddress })
        const nativeSocket = yield* Deferred.await(signal)
        const info: Dgram.RemoteInfo = {
          address: "127.0.0.1",
          family: "IPv4",
          port: socket.address.port,
          size: 1
        }
        nativeSocket.emit("message", Buffer.from([1]), info)
        nativeSocket.emit("error", Object.assign(new Error(`${code} from recvmsg`), { code, syscall: "recvmsg" }))
        nativeSocket.emit("message", Buffer.from([2]), info)
        assert.deepStrictEqual((yield* socket.pull).map((packet) => Array.from(packet.data)), [[1], [2]])
      })
  )

  it.effect("keeps an unclassified event terminal after draining buffered input", () =>
    Effect.gen(function*() {
      const { signal } = yield* captureNativeSocket("error")
      const socket = yield* NodeDatagramSocket.bind({ localAddress })
      const nativeSocket = yield* Deferred.await(signal)
      const info: Dgram.RemoteInfo = {
        address: "127.0.0.1",
        family: "IPv4",
        port: socket.address.port,
        size: 1
      }
      nativeSocket.emit("message", Buffer.from([1]), info)
      const cause = Object.assign(new Error("terminal receive failure"), {
        code: "ECONNREFUSED",
        syscall: "send"
      })
      nativeSocket.emit("error", cause)
      nativeSocket.emit("message", Buffer.from([2]), info)
      assert.deepStrictEqual((yield* socket.pull).map((packet) => Array.from(packet.data)), [[1]])
      const failure = yield* socket.pull.pipe(Effect.flip)
      assert.strictEqual(failure.reason._tag, "DatagramSocketReadError")
      assert.strictEqual(failure.cause, cause)
    }))

  it.effect("drops an unresolvable source zone without discarding surrounding packets", () =>
    Effect.gen(function*() {
      const { signal } = yield* captureNativeSocket("message")
      const socket = yield* NodeDatagramSocket.bind({ localAddress, readBatchSize: 1 })
      const nativeSocket = yield* Deferred.await(signal)
      const info: Dgram.RemoteInfo = {
        address: "127.0.0.1",
        family: "IPv4",
        port: socket.address.port,
        size: 1
      }
      nativeSocket.emit("message", Buffer.from([1]), info)
      nativeSocket.emit("message", Buffer.from([9]), {
        ...info,
        address: "fe80::1%unknown_zone",
        family: "IPv6"
      })
      nativeSocket.emit("message", Buffer.from([2]), info)
      assert.deepStrictEqual((yield* socket.pull).map((packet) => Array.from(packet.data)), [[1]])
      assert.deepStrictEqual((yield* socket.pull).map((packet) => Array.from(packet.data)), [[2]])
      nativeSocket.emit("message", Buffer.from([3]), info)
      assert.deepStrictEqual((yield* socket.pull).map((packet) => Array.from(packet.data)), [[3]])
    }))
})

describe("NodeDatagramSocket real receive recovery", { concurrent: false }, () => {
  it.effect.skipIf(Process.platform !== "linux")(
    "recovers the same connected socket after a real ICMP port-unreachable",
    () =>
      Effect.gen(function*() {
        const peerAddress = yield* Effect.scoped(
          NodeDatagramSocket.bind({ localAddress }).pipe(Effect.map((socket) => socket.address))
        )
        const observedError = yield* Deferred.make<unknown>()
        const { signal } = yield* captureNativeSocket("error")
        const socket = yield* NodeDatagramSocket.connect({ localAddress, remote: peerAddress })
        const nativeSocket = yield* Deferred.await(signal)
        const clientAddress = socket.address
        nativeSocket.prependListener("error", (cause: unknown) => {
          const native = cause as { readonly code?: unknown; readonly syscall?: unknown }
          if (native.code === "ECONNREFUSED" && native.syscall === "recvmsg") {
            Deferred.doneUnsafe(observedError, Exit.succeed(cause))
          }
        })
        yield* socket.write(new Uint8Array([1]))
        const native = yield* Deferred.await(observedError).pipe(Effect.timeout("5 seconds"))
        assert.strictEqual((native as NodeJS.ErrnoException).code, "ECONNREFUSED")

        const peer = yield* NodeDatagramSocket.bind({ localAddress: peerAddress })
        yield* peer.write({ data: new Uint8Array([2]), peer: clientAddress })
        const [received] = yield* socket.pull.pipe(Effect.timeout("5 seconds"))
        assert.deepStrictEqual(Array.from(received.data), [2])
        assert.deepStrictEqual(received.peer, peer.address)
        assert.deepStrictEqual(socket.address, clientAddress)
      })
  )
})
