import { assert, describe, it } from "@effect/vitest"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as NetAddress from "effect/net/NetAddress"
import * as Scope from "effect/Scope"
import * as DatagramSocket from "effect/socket/DatagramSocket"

const bytes = (text: string) => new TextEncoder().encode(text)
const address = NetAddress.inetAddressFromNativeUnsafe("127.0.0.1", 1234)
const failure = () =>
  new DatagramSocket.DatagramSocketError({
    reason: new DatagramSocket.DatagramSocketReadError({ kind: "Unknown", cause: new Error("read") })
  })

class TestHandle implements DatagramSocket.NativeHandle {
  readonly address = { host: "127.0.0.1", port: 1234 }
  events!: DatagramSocket.NativeEvents
  sends: Array<{ payload: Uint8Array; destination?: DatagramSocket.NativeAddress | undefined }> = []
  closes = 0
  leaves = 0
  joins = 0
  failAt = 0
  sendCount = 0
  readonly send: DatagramSocket.NativeHandle["send"] = (payload, destination) =>
    Effect.try(() => {
      if (++this.sendCount === this.failAt) throw new Error("send failed")
      this.sends.push({ payload, destination })
    }).pipe(Effect.mapError(() =>
      new DatagramSocket.DatagramSocketError({
        reason: new DatagramSocket.DatagramSocketWriteError({ kind: "Unknown", cause: new Error("send") })
      })
    ))
  readonly sendMany: DatagramSocket.NativeHandle["sendMany"] = (batch) =>
    Effect.forEach(batch, ({ payload, destination }) => this.send(payload, destination), { discard: true })
  readonly joinMulticast: DatagramSocket.NativeHandle["joinMulticast"] = () =>
    Effect.sync(() => {
      this.joins++
      return () =>
        Effect.sync(() => {
          this.leaves++
        })
    })
  close() {
    this.closes++
  }
  packet(text: string, host = "127.0.0.1", port = 9876) {
    this.events.onPacket(bytes(text), host, port)
  }
  error(error = failure()) {
    this.events.onReadError(error)
  }
}

const fixture = (
  options?: DatagramSocket.ReceiveBufferOptions & {
    readonly onError?: (error: DatagramSocket.DatagramSocketError) => void
  }
) => {
  const handles: Array<TestHandle> = []
  const socket = DatagramSocket.fromNativeHandle((events) =>
    Effect.sync(() => {
      const handle = new TestHandle()
      handle.events = events
      handles.push(handle)
      return handle
    }), options)
  return { socket, handles }
}

const texts = (batch: ReadonlyArray<DatagramSocket.Datagram>) =>
  batch.map((packet) => new TextDecoder().decode(packet.payload))

describe("DatagramSocket native handle", () => {
  for (const strategy of ["dropping", "sliding"] as const) {
    it.effect(`overflow using ${strategy}`, () =>
      Effect.scoped(Effect.gen(function*() {
        const { socket, handles } = fixture({ capacity: 2, strategy })
        const reader = yield* socket.reader
        const handle = handles[0]!
        handle.packet("a")
        handle.packet("b")
        handle.packet("c")
        assert.deepStrictEqual(texts(yield* reader.pull), strategy === "dropping" ? ["a", "b"] : ["b", "c"])
        assert.strictEqual(reader.dropped(), 1)
        handle.packet("d")
        assert.deepStrictEqual(texts(yield* reader.pull), ["d"])
        assert.strictEqual(reader.dropped(), 1)
      })))
  }

  it.effect("delivers queued packets before a sticky read error", () =>
    Effect.scoped(Effect.gen(function*() {
      const { socket, handles } = fixture()
      const reader = yield* socket.reader
      const error = failure()
      handles[0]!.packet("queued")
      handles[0]!.error(error)
      assert.deepStrictEqual(texts(yield* reader.pull), ["queued"])
      assert.strictEqual(Exit.isFailure(yield* Effect.exit(reader.pull)), true)
      assert.deepStrictEqual(yield* Effect.exit(reader.pull), yield* Effect.exit(reader.pull))
    })))

  it.effect("discards queued packets without counting them as overflow", () =>
    Effect.gen(function*() {
      const { socket, handles } = fixture()
      const scope = yield* Scope.make()
      const reader = yield* socket.reader.pipe(Scope.provide(scope))
      handles[0]!.packet("discard")
      assert.strictEqual(reader.dropped(), 0)
      yield* Scope.close(scope, Exit.void)
      assert.strictEqual(reader.dropped(), 0)
      assert.strictEqual(handles[0]!.closes, 1)
    }))

  it.effect("fails a parked pull on scope close", () =>
    Effect.gen(function*() {
      const { socket, handles } = fixture()
      const scope = yield* Scope.make()
      const reader = yield* socket.reader.pipe(Scope.provide(scope))
      const pending = yield* reader.pull.pipe(Effect.exit, Effect.forkChild({ startImmediately: true }))
      yield* Effect.yieldNow
      handles[0]!.packet("discard")
      assert.isTrue(Exit.isSuccess(yield* Fiber.join(pending)))
      const parked = yield* reader.pull.pipe(Effect.exit, Effect.forkChild({ startImmediately: true }))
      yield* Effect.yieldNow
      yield* Scope.close(scope, Exit.void)
      assert.isTrue(Exit.isFailure(yield* Fiber.join(parked)))
      assert.strictEqual(handles[0]!.closes, 1)
    }))

  it.effect("waits for the first reader to release before rebinding", () =>
    Effect.scoped(Effect.gen(function*() {
      const { socket, handles } = fixture()
      const scope = yield* Scope.make()
      yield* socket.reader.pipe(Scope.provide(scope))
      const second = yield* socket.reader.pipe(Effect.forkChild({ startImmediately: true }))
      yield* Effect.yieldNow
      assert.strictEqual(handles.length, 1)
      yield* Scope.close(scope, Exit.void)
      yield* Fiber.join(second)
      assert.strictEqual(handles.length, 2)
      assert.strictEqual(handles[0]!.closes, 1)
    })))

  it.effect("waits for a reader before writing", () =>
    Effect.scoped(Effect.gen(function*() {
      const { socket, handles } = fixture()
      const writer = yield* socket.writer
      const send = yield* writer.write({ payload: "hello", address }).pipe(Effect.forkChild({ startImmediately: true }))
      yield* Effect.yieldNow
      assert.strictEqual(handles.length, 0)
      yield* socket.reader
      yield* Fiber.join(send)
      assert.deepStrictEqual(handles[0]!.sends[0]!.payload, bytes("hello"))
    })))

  it.effect("reports a failed write's destination and stops writeAll at the first failure", () =>
    Effect.scoped(Effect.gen(function*() {
      const { socket, handles } = fixture()
      yield* socket.reader
      const writer = yield* socket.writer
      const handle = handles[0]!
      handle.failAt = 1
      const exit = yield* Effect.exit(writer.write({ payload: "one", address }))
      assert.isTrue(Exit.isFailure(exit))
      if (Exit.isFailure(exit)) {
        const error = exit.cause
        assert.include(JSON.stringify(error), "127.0.0.1")
      }
      handle.failAt = 3
      const batch = [{ payload: "a", address }, { payload: "b", address }, { payload: "c", address }] as const
      assert.isTrue(Exit.isFailure(yield* Effect.exit(writer.writeAll(batch))))
      assert.strictEqual(handle.sends.length, 1)
    })))

  it.effect("ignores errors thrown by onError", () =>
    Effect.scoped(Effect.gen(function*() {
      let count = 0
      const { socket, handles } = fixture({
        onError: () => {
          count++
          throw new Error("listener")
        }
      })
      yield* socket.reader
      handles[0]!.events.onError(failure())
      handles[0]!.events.onError(failure())
      assert.strictEqual(count, 2)
    })))

  it.effect("leaves a multicast group when its scope closes", () =>
    Effect.scoped(Effect.gen(function*() {
      const { socket, handles } = fixture()
      const reader = yield* socket.reader
      const group = NetAddress.ipv4FromBytesUnsafe(new Uint8Array([224, 0, 0, 1])) as NetAddress.MulticastAddress<
        NetAddress.Ipv4Address
      >
      yield* Effect.scoped(reader.joinMulticast({ group }))
      assert.strictEqual(handles[0]!.joins, 1)
      assert.strictEqual(handles[0]!.leaves, 1)
    })))

  it.effect("caches the bound address and reply destination without eager parsing", () =>
    Effect.scoped(Effect.gen(function*() {
      const { socket, handles } = fixture()
      const reader = yield* socket.reader
      assert.strictEqual(reader.address, reader.address)
      const handle = handles[0]!
      handle.packet("reply", "127.0.0.2", 3000)
      const [packet] = yield* reader.pull
      assert.strictEqual(packet.address, packet.address)
      const writer = yield* socket.writer
      yield* writer.write({ payload: packet.payload, address: packet })
      assert.deepStrictEqual(handle.sends[0]!.destination, { host: "127.0.0.2", port: 3000 })
    })))

  it.effect("closes a handle that arrives after interrupted acquisition", () =>
    Effect.scoped(Effect.gen(function*() {
      let finish!: (handle: TestHandle) => void
      const opened = yield* Deferred.make<void>()
      const handle = new TestHandle()
      const socket = DatagramSocket.fromNativeHandle((events) => {
        handle.events = events
        return Effect.promise(() =>
          new Promise<TestHandle>((resolve) => {
            finish = resolve
            Effect.runSync(Deferred.succeed(opened, undefined))
          })
        )
      })
      const fiber = yield* socket.reader.pipe(Effect.forkChild({ startImmediately: true }))
      yield* Deferred.await(opened)
      const interrupted = yield* Fiber.interrupt(fiber).pipe(Effect.forkChild({ startImmediately: true }))
      yield* Effect.yieldNow
      finish(handle)
      yield* Fiber.join(interrupted)
      yield* Effect.yieldNow
      assert.strictEqual(handle.closes, 1)
    })))
})
