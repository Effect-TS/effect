/**
 * Pull-based UDP sockets with scoped native handles.
 *
 * A `DatagramSocket` exposes a scoped `reader` and a scoped `writer`.
 * Acquiring the reader opens and binds a new native socket, and the reader's
 * scope owns it. Only one reader is open at a time: a second acquisition waits,
 * interruptibly, until the first reader's scope closes. Retrying is a plain
 * `Effect.retry` around the scoped consume loop, and every retry opens a new
 * socket.
 *
 * Writes wait while no reader is open, so a send-only client must still
 * acquire a reader.
 *
 * **Example** (Portable request/reply client)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { NetAddress } from "effect/net"
 * import { DatagramSocket } from "effect/socket"
 *
 * const server = NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 5353)
 *
 * // Works with any platform layer that provides `DatagramSocket`
 * export const request = (payload: string) =>
 *   Effect.gen(function*() {
 *     const socket = yield* DatagramSocket.DatagramSocket
 *     // The reader owns the native socket, so acquire it even to send
 *     const reader = yield* socket.reader
 *     const writer = yield* socket.writer
 *     yield* writer.write({ payload, address: server })
 *     const [response] = yield* reader.pull
 *     return response.payload
 *   }).pipe(Effect.scoped)
 * ```
 *
 * @stability unstable
 * @since 4.0.0
 */
import type { NonEmptyReadonlyArray } from "../Array.ts"
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Fiber from "../Fiber.ts"
import * as Latch from "../Latch.ts"
import * as NetAddress from "../net/NetAddress.ts"
import * as Schema from "../Schema.ts"
import * as Scope from "../Scope.ts"

/**
 * Runtime type identifier attached to `DatagramSocket` services.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId = "~effect/socket/DatagramSocket"

/**
 * Service tag for UDP socket transports.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export const DatagramSocket: Context.Service<DatagramSocket, DatagramSocket> = Context.Service<DatagramSocket>(
  "effect/socket/DatagramSocket"
)

/**
 * A UDP socket with a scoped, exclusive `reader` and a latch-gated `writer`.
 *
 * **Details**
 *
 * Acquiring `reader` opens and binds a new native socket owned by the
 * acquisition's scope. A second acquisition waits until the first reader's
 * scope closes. Acquiring `writer` cannot fail; its writes wait until a reader
 * is open.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface DatagramSocket {
  readonly [TypeId]: typeof TypeId
  readonly reader: Effect.Effect<Reader, DatagramSocketError, Scope.Scope>
  readonly writer: Effect.Effect<Writer, never, Scope.Scope>
}

/**
 * A received packet.
 *
 * **Details**
 *
 * The payload is safe to retain. The sender's `address` is parsed from the
 * runtime's raw host and port on first read and cached, so a consumer that
 * never reads it pays for no parsing.
 *
 * To reply, pass the datagram itself as the destination:
 * `writer.write({ payload, address: received })`. This reuses the raw host and
 * port without parsing or formatting anything.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Datagram {
  readonly payload: Uint8Array
  readonly address: NetAddress.InetAddress
}

/**
 * A packet to send.
 *
 * **Details**
 *
 * String payloads are encoded as UTF-8. `address` can be omitted when the
 * socket has a `peer` or is connected. On a connected socket an explicit
 * `InetAddress` fails the write, while a received `Datagram` is allowed and
 * goes out on the connected path.
 *
 * A received `Datagram` used as the destination (the reply path) reuses the
 * sender's raw host and port. Passing a received `Datagram` as the whole
 * argument echoes it back to its sender.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface OutgoingDatagram {
  readonly payload: Uint8Array | string
  readonly address?: NetAddress.InetAddress | Datagram | undefined
}

/**
 * The receive side of an open native socket.
 *
 * **Details**
 *
 * `pull` returns everything queued since the last pull, or waits for the next
 * packet. After a terminal error, `pull` first returns the queued packets and
 * then fails with the same error until the reader's scope closes. Closing the
 * scope discards the queue and fails every waiting `pull` with
 * `DatagramSocketClosedError`.
 *
 * Several fibers may pull at once. Waiting pulls are served in the order they
 * started waiting, each incoming packet going to the oldest one, and a
 * terminal error fails all of them.
 *
 * `address` is the bound local address, parsed on first read and cached.
 *
 * `dropped` counts packets discarded by the receive buffer's overflow
 * strategy since this reader opened. Kernel and network loss is not counted,
 * and neither are packets discarded when the scope closes.
 *
 * `joinMulticast` joins a group until the returned effect's scope closes.
 * Its `interface` selects the receiving (ingress) interface, which is a
 * different socket option from a platform's sender-side (egress)
 * `multicast.interface` option. Failures while leaving are ignored.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Reader {
  readonly pull: Effect.Effect<NonEmptyReadonlyArray<Datagram>, DatagramSocketError>
  readonly address: NetAddress.InetAddress
  readonly dropped: () => number
  readonly joinMulticast: <A extends NetAddress.IpAddress>(options: {
    readonly group: NetAddress.MulticastAddress<A>
    readonly interface?: NetAddress.MulticastInterface<A> | undefined
    readonly source?: A | undefined
  }) => Effect.Effect<void, DatagramSocketError, Scope.Scope>
}

/**
 * The send side of a `DatagramSocket`. Writes wait until a reader is open, so
 * a send-only client must still acquire a reader.
 *
 * **Details**
 *
 * A write completes when the runtime reports the send's result, and send
 * errors fail it with a `DatagramSocketWriteError` carrying the destination
 * `address`. After a terminal reader error, writes fail with that error until
 * the reader's scope closes, and then wait for the next reader.
 *
 * `writeAll` fails with the first error. Which of the remaining datagrams went
 * out is unspecified, nothing is resent, and the error does not say which
 * datagram failed. Its `address` may be absent, depending on the runtime.
 *
 * **Gotchas**
 *
 * A send-only client must still acquire a reader. The reader owns the native
 * socket, so writes made while no reader is open wait for one, forever if none
 * is acquired. There is no built-in timeout; use `Effect.timeout`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Writer {
  readonly write: (datagram: OutgoingDatagram) => Effect.Effect<void, DatagramSocketError>
  readonly writeAll: (datagrams: NonEmptyReadonlyArray<OutgoingDatagram>) => Effect.Effect<void, DatagramSocketError>
}

/**
 * Receive queue options.
 *
 * **Details**
 *
 * The queue is bounded in packets, with no byte cap. `capacity` defaults to
 * 1024 and must be a positive integer; `Infinity` is rejected. The worst-case
 * memory is capacity × 64 KiB, about 64 MiB at the default.
 *
 * When the queue is full, `"dropping"` (the default) discards the incoming
 * packet and `"sliding"` discards the oldest queued one. Both count the
 * packet in `Reader.dropped`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface ReceiveBufferOptions {
  readonly capacity?: number | undefined
  readonly strategy?: "dropping" | "sliding" | undefined
}

/**
 * Creates a `DatagramSocket` from its `reader` and `writer` effects.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = (options: {
  readonly reader: DatagramSocket["reader"]
  readonly writer: DatagramSocket["writer"]
}): DatagramSocket =>
  DatagramSocket.of({
    [TypeId]: TypeId,
    reader: options.reader,
    writer: options.writer
  })

/**
 * The raw host and port reported by a native transport. Core parses it on
 * demand.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface NativeAddress {
  readonly host: string
  readonly port: number
}

/**
 * Native transport contract used by platform adapters.
 *
 * **Details**
 *
 * `address` is the raw bound address, read once at open. `scopeIds` maps IPv6
 * zone names to scope IDs, for parsing named zones and formatting
 * destinations. `peer` is the default destination, and `connected` marks a
 * natively connected socket, whose sends receive no destination.
 *
 * `send` and `sendMany` hand datagrams to the runtime and call `done` exactly
 * once, synchronously or later, when the runtime reports the result. They must
 * not throw. `sendMany` passes the index of the failing datagram to `done`
 * when the runtime knows it, so core can attach its address. Adapters
 * normalize their native errors before passing them to core. A destination
 * may be a received datagram record, so read its `host` and `port` during the
 * call and don't keep a reference to it.
 *
 * `close` must not throw.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface NativeHandle {
  readonly address: NativeAddress
  readonly scopeIds?: ReadonlyMap<string, number> | undefined
  readonly peer?: NativeAddress | undefined
  readonly connected?: boolean | undefined
  readonly send: (
    payload: Uint8Array,
    destination: NativeAddress | undefined,
    done: (error?: DatagramSocketError) => void
  ) => void
  readonly sendMany: (
    payloads: ReadonlyArray<Uint8Array>,
    destinations: ReadonlyArray<NativeAddress | undefined>,
    done: (error?: DatagramSocketError, index?: number) => void
  ) => void
  readonly joinMulticast: <A extends NetAddress.IpAddress>(options: {
    readonly group: NetAddress.MulticastAddress<A>
    readonly interface?: NetAddress.MulticastInterface<A> | undefined
    readonly source?: A | undefined
  }) => Effect.Effect<() => Effect.Effect<void, never>, DatagramSocketError>
  readonly close: () => void
}

/**
 * Callbacks installed before opening a native handle; packets can arrive
 * synchronously.
 *
 * **Details**
 *
 * `onPacket` queues a received packet. `onReadError` is a terminal receive
 * error and `onClose` reports the native socket closing underneath the
 * reader; both are sticky. `onError` forwards errors with no write left to
 * fail, such as ICMP reports, to the user's `onError` option.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface NativeEvents {
  readonly onPacket: (payload: Uint8Array, host: string, port: number) => void
  readonly onReadError: (error: DatagramSocketError) => void
  readonly onError: (error: DatagramSocketError) => void
  readonly onClose: () => void
}

/**
 * The normalized kind of a send or receive failure.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export type IoErrorKind = "MessageTooLarge" | "Unreachable" | "ConnectionRefused" | "PermissionDenied" | "Unknown"

/**
 * Opening or binding the native socket, applying its options, or resolving
 * a name failed.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class DatagramSocketOpenError
  extends Schema.Error<DatagramSocketOpenError>("effect/socket/DatagramSocket/OpenError")({
    _tag: Schema.tag("DatagramSocketOpenError"),
    kind: Schema.Literals(["AddressInUse", "AddressNotAvailable", "PermissionDenied", "Unknown"]),
    cause: Schema.Defect()
  })
{}

/**
 * A receive failed, or an ICMP report arrived with no write left to fail.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class DatagramSocketReadError
  extends Schema.Error<DatagramSocketReadError>("effect/socket/DatagramSocket/ReadError")({
    _tag: Schema.tag("DatagramSocketReadError"),
    kind: Schema.Literals(["MessageTooLarge", "Unreachable", "ConnectionRefused", "PermissionDenied", "Unknown"]),
    cause: Schema.Defect()
  })
{}

/**
 * A send failed. `address` is the destination when it is known.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class DatagramSocketWriteError
  extends Schema.Error<DatagramSocketWriteError>("effect/socket/DatagramSocket/WriteError")({
    _tag: Schema.tag("DatagramSocketWriteError"),
    kind: Schema.Literals(["MessageTooLarge", "Unreachable", "ConnectionRefused", "PermissionDenied", "Unknown"]),
    address: Schema.optional(Schema.InetAddress),
    cause: Schema.Defect()
  })
{}

/**
 * The native socket closed underneath the reader, or the reader's scope
 * closed.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class DatagramSocketClosedError
  extends Schema.Error<DatagramSocketClosedError>("effect/socket/DatagramSocket/ClosedError")({
    _tag: Schema.tag("DatagramSocketClosedError")
  })
{}

/**
 * The runtime lacks a capability, such as source-specific multicast on Deno.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class DatagramSocketUnsupportedError
  extends Schema.Error<DatagramSocketUnsupportedError>("effect/socket/DatagramSocket/UnsupportedError")({
    _tag: Schema.tag("DatagramSocketUnsupportedError"),
    capability: Schema.String,
    runtime: Schema.String
  })
{}

/**
 * Schema for the union of `DatagramSocketError` reasons.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export const DatagramSocketErrorReason = Schema.Union([
  DatagramSocketOpenError,
  DatagramSocketReadError,
  DatagramSocketWriteError,
  DatagramSocketClosedError,
  DatagramSocketUnsupportedError
])
/**
 * The union of `DatagramSocketError` reasons.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export type DatagramSocketErrorReason = typeof DatagramSocketErrorReason.Type

/**
 * Runtime type identifier attached to `DatagramSocketError` values.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export const DatagramSocketErrorTypeId = "~effect/socket/DatagramSocket/DatagramSocketError"
/**
 * The error raised by `DatagramSocket` operations, wrapping a specific
 * reason. Its `cause` and `message` come from the reason.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class DatagramSocketError
  extends Schema.TaggedError<DatagramSocketError>(DatagramSocketErrorTypeId)("DatagramSocketError", {
    _tag: Schema.tag("DatagramSocketError"),
    reason: DatagramSocketErrorReason
  })
{
  // @effect-diagnostics-next-line overriddenSchemaConstructor:off
  constructor(props: { readonly reason: DatagramSocketErrorReason }) {
    if ("cause" in props.reason) {
      super({ ...props, cause: props.reason.cause } as any)
    } else {
      super(props)
    }
  }
  readonly [DatagramSocketErrorTypeId] = DatagramSocketErrorTypeId
  override get message() {
    return this.reason.message
  }
}

/**
 * Builds a `DatagramSocket` over a native handle, opening a new handle for
 * each reader acquisition.
 *
 * **Details**
 *
 * `open` receives the event callbacks before the handle exists, so packets can
 * be queued while it opens. Core owns the receive queue and its overflow
 * strategy, reader exclusivity, sticky errors, lazy address parsing, the
 * writer latch and destination formatting. The handle is closed when the
 * reader's scope closes. If acquisition is interrupted while `open` is still
 * running, the interruption returns at once, `open` is left to finish, and
 * the handle it produces is closed. The next reader waits until that open has
 * settled, so two native sockets never exist at once. An adopted `acquire`
 * must therefore finish in bounded time.
 *
 * `open` runs in the reader's scope, so an adopted `acquire` can register
 * finalizers that run when the reader closes.
 *
 * Concurrent pulls are served in the order they started waiting.
 *
 * `onError` receives errors with no write left to fail. It runs
 * synchronously, and anything it throws is ignored.
 *
 * A `capacity` below 1, a fractional one or `Infinity` throws a `RangeError`
 * here.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const fromNativeHandle = (
  open: (events: NativeEvents) => Effect.Effect<NativeHandle, DatagramSocketError, Scope.Scope>,
  options?: ReceiveBufferOptions & { readonly onError?: ((error: DatagramSocketError) => void) | undefined }
): DatagramSocket => {
  const capacity = options?.capacity ?? 1024
  if (!Number.isSafeInteger(capacity) || capacity < 1) {
    throw new RangeError(`DatagramSocket receive buffer capacity must be a positive integer, received ${capacity}`)
  }
  const sliding = options?.strategy === "sliding"
  const onError = options?.onError
  // open while a reader may be acquired; closed while one holds the socket
  const free = Latch.makeUnsafe(true)
  // open while a reader is current, so writes can go out
  const latch = Latch.makeUnsafe(false)
  let current: ReaderState | undefined

  // acquisition failed or was interrupted while `open` was still running
  const abandon = (state: ReaderState, opening: Fiber.Fiber<NativeHandle, DatagramSocketError>) => {
    state.close()
    // keep ownership until the orphaned open settles, then close its handle
    opening.addObserver((exit) => {
      if (exit._tag === "Success") exit.value.close()
      free.openUnsafe()
    })
  }

  const release = (state: ReaderState) => {
    state.close()
    current = undefined
    latch.closeUnsafe()
    free.openUnsafe()
  }

  const reader: DatagramSocket["reader"] = Effect.uninterruptibleMask((restore) =>
    Effect.gen(function*() {
      while (!free.closeUnsafe()) yield* restore(free.await)
      const scope = yield* Effect.scope
      const state = new ReaderState(capacity, sliding, onError)
      // `open` may not be cancellable (Node's `lookup`), so it runs in its own
      // fiber and is never interrupted. Interruption only stops the wait, and
      // `abandon` closes a handle that arrives later.
      const opening = yield* Effect.forkDetach(Scope.provide(open(state.events), scope), { startImmediately: true })
      state.handle = yield* restore(Fiber.join(opening)).pipe(
        Effect.onError(() => Effect.sync(() => abandon(state, opening)))
      )
      current = state
      latch.openUnsafe()
      yield* Effect.addFinalizer(() => Effect.sync(() => release(state)))
      return state.reader
    })
  )

  // one callback per write: it is both the lazy wrapper and the resume
  const write = (datagram: OutgoingDatagram): Effect.Effect<void, DatagramSocketError> =>
    Effect.callback((resume) => {
      const state = current
      if (state === undefined) resume(latch.whenOpen(write(datagram)))
      else state.write(datagram, resume)
    })
  const writeAll = (datagrams: NonEmptyReadonlyArray<OutgoingDatagram>): Effect.Effect<void, DatagramSocketError> =>
    Effect.callback((resume) => {
      const state = current
      if (state === undefined) resume(latch.whenOpen(writeAll(datagrams)))
      else state.writeAll(datagrams, resume)
    })
  const writer: DatagramSocket["writer"] = Effect.succeed({ write, writeAll })

  return make({ reader, writer })
}

const encoder = new TextEncoder()
const encode = (payload: Uint8Array | string) => typeof payload === "string" ? encoder.encode(payload) : payload
const emptyScopeIds: ReadonlyMap<string, number> = new Map()

const closedError = () => new DatagramSocketError({ reason: new DatagramSocketClosedError() })

const writeError = (message: string, address?: NetAddress.InetAddress) =>
  new DatagramSocketError({
    reason: new DatagramSocketWriteError({ kind: "Unknown", address, cause: new Error(message) })
  })

// Also a `NativeAddress`, so the reply path passes the record itself
class DatagramImpl implements Datagram, NativeAddress {
  payload: Uint8Array
  host: string
  port: number
  readonly owner: ReaderState
  #address: NetAddress.InetAddress | undefined
  constructor(payload: Uint8Array, host: string, port: number, owner: ReaderState) {
    this.payload = payload
    this.host = host
    this.port = port
    this.owner = owner
  }
  get address(): NetAddress.InetAddress {
    return this.#address ??= NetAddress.inetAddressFromNativeUnsafe(this.host, this.port, this.owner.scopeIds)
  }
  // only for a queued record, which no pull has returned yet
  reuse(payload: Uint8Array, host: string, port: number) {
    this.payload = payload
    this.host = host
    this.port = port
    this.#address = undefined
  }
}

type Destination = NetAddress.InetAddress | DatagramImpl | undefined
type Resume<A> = (effect: Effect.Effect<A, DatagramSocketError>) => void
type Failure = Effect.Effect<never, DatagramSocketError>

const targetOf = (datagram: OutgoingDatagram): Destination =>
  datagram instanceof DatagramImpl ? datagram : datagram.address as Destination

class ReaderState {
  readonly capacity: number
  readonly sliding: boolean
  readonly events: NativeEvents
  readonly reader: Reader
  // queued packets, oldest first from `head`. `head` only moves under
  // "sliding" once the buffer is full, when it becomes a ring
  buffer: Array<DatagramImpl> = []
  head = 0
  dropped = 0
  // the sticky error as a failed exit, shared by every pull and write after it
  failure: Failure | undefined = undefined
  // parked pulls, oldest first: the oldest sits in the slot and the rest wait
  // in `waiters`, so a single consumer never touches the array
  waiter: Resume<NonEmptyReadonlyArray<Datagram>> | undefined = undefined
  waiterFiber: Fiber.Fiber<unknown, unknown> | undefined = undefined
  waiters: Array<Resume<NonEmptyReadonlyArray<Datagram>>> = []
  waiterFibers: Array<Fiber.Fiber<unknown, unknown>> = []
  // shared by every parked pull; it runs on the interrupted fiber
  readonly cancel: Effect.Effect<void> = Effect.withFiber((fiber) => {
    this.removeWaiter(fiber)
    return Effect.void
  })
  handle: NativeHandle | undefined = undefined
  closed = false
  #address: NetAddress.InetAddress | undefined = undefined
  #lastTarget: NetAddress.InetAddress | undefined = undefined
  #lastDestination: NativeAddress | undefined = undefined

  constructor(capacity: number, sliding: boolean, onError: ((error: DatagramSocketError) => void) | undefined) {
    this.capacity = capacity
    this.sliding = sliding
    this.events = {
      onPacket: (payload, host, port) => this.push(payload, host, port),
      onReadError: (error) => this.fail(error),
      onError: (error) => {
        if (onError === undefined || this.closed) return
        try {
          onError(error)
        } catch {
          // listener failures are ignored
        }
      },
      onClose: () => this.fail(closedError())
    }
    this.reader = makeReader(this)
  }

  // packets can arrive before the handle does, so they read this lazily
  get scopeIds(): ReadonlyMap<string, number> {
    return this.handle?.scopeIds ?? emptyScopeIds
  }

  get address(): NetAddress.InetAddress {
    if (this.#address === undefined) {
      const { host, port } = this.handle!.address
      this.#address = NetAddress.inetAddressFromNativeUnsafe(host, port, this.scopeIds)
    }
    return this.#address
  }

  push(payload: Uint8Array, host: string, port: number) {
    if (this.failure !== undefined) return
    // a parked pull implies an empty queue, so it never overflows
    if (this.buffer.length >= this.capacity) return this.overflow(payload, host, port)
    const datagram = new DatagramImpl(payload, host, port, this)
    if (this.waiter !== undefined) return this.wake(datagram)
    this.buffer.push(datagram)
  }

  wake(datagram: DatagramImpl) {
    const waiter = this.waiter!
    this.promoteWaiter()
    waiter(Effect.succeed([datagram]))
  }

  overflow(payload: Uint8Array, host: string, port: number) {
    this.dropped++
    if (!this.sliding) return
    // the oldest record becomes the newest in the same ring slot
    const buffer = this.buffer
    const head = this.head
    buffer[head].reuse(payload, host, port)
    this.head = head + 1 === buffer.length ? 0 : head + 1
  }

  take(): NonEmptyReadonlyArray<Datagram> {
    const buffer = this.buffer
    const head = this.head
    this.buffer = []
    if (head === 0) return buffer as unknown as NonEmptyReadonlyArray<Datagram>
    this.head = 0
    const length = buffer.length
    // unroll the ring, oldest first
    const batch = new Array<DatagramImpl>(length)
    let j = 0
    for (let i = head; i < length; i++) batch[j++] = buffer[i]
    for (let i = 0; i < head; i++) batch[j++] = buffer[i]
    return batch as unknown as NonEmptyReadonlyArray<Datagram>
  }

  park(resume: Resume<NonEmptyReadonlyArray<Datagram>>, fiber: Fiber.Fiber<unknown, unknown>) {
    if (this.waiter === undefined) {
      this.waiter = resume
      this.waiterFiber = fiber
    } else {
      this.waiters.push(resume)
      this.waiterFibers.push(fiber)
    }
  }

  promoteWaiter() {
    if (this.waiters.length === 0) {
      this.waiter = undefined
      this.waiterFiber = undefined
    } else {
      this.waiter = this.waiters.shift()
      this.waiterFiber = this.waiterFibers.shift()
    }
  }

  removeWaiter(fiber: Fiber.Fiber<unknown, unknown>) {
    if (this.waiterFiber === fiber) return this.promoteWaiter()
    const index = this.waiterFibers.indexOf(fiber)
    if (index === -1) return
    this.waiters.splice(index, 1)
    this.waiterFibers.splice(index, 1)
  }

  fail(error: DatagramSocketError) {
    if (this.failure !== undefined) return
    this.failure = Effect.fail(error)
    this.failWaiters(this.failure)
  }

  failWaiters(failure: Failure) {
    const waiter = this.waiter
    if (waiter === undefined) return
    const waiters = this.waiters
    this.waiter = undefined
    this.waiterFiber = undefined
    this.waiters = []
    this.waiterFibers = []
    waiter(failure)
    for (let i = 0; i < waiters.length; i++) waiters[i](failure)
  }

  close() {
    this.closed = true
    this.buffer = []
    this.head = 0
    this.failure = Effect.fail(closedError())
    this.failWaiters(this.failure)
    this.handle?.close()
  }

  write(datagram: OutgoingDatagram, resume: Resume<void>) {
    if (this.failure !== undefined) return resume(this.failure)
    // a received datagram passed whole is echoed to its sender
    const target = targetOf(datagram)
    const destination = this.destination(target)
    if (destination instanceof DatagramSocketError) return resume(Effect.fail(destination))
    this.handle!.send(encode(datagram.payload), destination, (error) => {
      resume(error === undefined ? Effect.void : Effect.fail(this.withAddress(error, target)))
    })
  }

  writeAll(datagrams: NonEmptyReadonlyArray<OutgoingDatagram>, resume: Resume<void>) {
    if (this.failure !== undefined) return resume(this.failure)
    const payloads = new Array<Uint8Array>(datagrams.length)
    const destinations = new Array<NativeAddress | undefined>(datagrams.length)
    for (let i = 0; i < datagrams.length; i++) {
      const datagram = datagrams[i]
      const destination = this.destination(targetOf(datagram))
      if (destination instanceof DatagramSocketError) return resume(Effect.fail(destination))
      payloads[i] = encode(datagram.payload)
      destinations[i] = destination
    }
    this.handle!.sendMany(payloads, destinations, (error, index) => {
      if (error === undefined) return resume(Effect.void)
      resume(Effect.fail(index === undefined ? error : this.withAddress(error, targetOf(datagrams[index]!))))
    })
  }

  destination(target: Destination): NativeAddress | undefined | DatagramSocketError {
    const handle = this.handle!
    if (target === undefined) {
      if (handle.connected || handle.peer !== undefined) return handle.peer
      return writeError("DatagramSocket write has no destination and the socket has no peer")
    }
    if (target instanceof DatagramImpl) return handle.connected ? undefined : target
    if (handle.connected) return writeError("an explicit address cannot be used on a connected DatagramSocket", target)
    if (target === this.#lastTarget) return this.#lastDestination
    const destination = { host: NetAddress.formatNativeHost(target, this.scopeIds), port: target.port }
    this.#lastTarget = target
    this.#lastDestination = destination
    return destination
  }

  withAddress(error: DatagramSocketError, target: Destination): DatagramSocketError {
    const reason = error.reason
    if (reason._tag !== "DatagramSocketWriteError" || reason.address !== undefined) return error
    const address = this.addressOf(target)
    if (address === undefined) return error
    return new DatagramSocketError({
      reason: new DatagramSocketWriteError({ kind: reason.kind, address, cause: reason.cause })
    })
  }

  addressOf(target: Destination): NetAddress.InetAddress | undefined {
    try {
      if (target instanceof DatagramImpl) return target.address
      if (target !== undefined) return target
      const peer = this.handle!.peer
      return peer === undefined
        ? undefined
        : NetAddress.inetAddressFromNativeUnsafe(peer.host, peer.port, this.scopeIds)
    } catch {
      // an unknown IPv6 zone leaves the address out
      return undefined
    }
  }
}

const makeReader = (state: ReaderState): Reader => ({
  pull: Effect.callback((resume) => {
    if (state.buffer.length !== 0) return resume(Effect.succeed(state.take()))
    if (state.failure !== undefined) return resume(state.failure)
    state.park(resume, Fiber.getCurrent()!)
    return state.cancel
  }),
  get address() {
    return state.address
  },
  dropped: () => state.dropped,
  joinMulticast: (options) =>
    Effect.suspend(() => {
      if (state.failure !== undefined) return state.failure
      return Effect.acquireRelease(
        state.handle!.joinMulticast(options),
        (leave) => state.closed ? Effect.void : Effect.ignoreCause(leave())
      )
    })
})
