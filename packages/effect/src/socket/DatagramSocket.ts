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
 * scope discards the queue and fails a waiting `pull` with
 * `DatagramSocketClosedError`.
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
 * A send completes only when the runtime reports its result. Adapters
 * normalize their native errors before passing them to core. `close` must not
 * throw.
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
 * running, the handle it eventually produces is closed.
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
  open: (events: NativeEvents) => Effect.Effect<NativeHandle, DatagramSocketError>,
  options?: ReceiveBufferOptions & { readonly onError?: (error: DatagramSocketError) => void }
): DatagramSocket => {
  const capacity = options?.capacity ?? 1024
  if (!Number.isSafeInteger(capacity) || capacity < 1) {
    throw new RangeError(`DatagramSocket receive buffer capacity must be a positive integer, received ${capacity}`)
  }
  const sliding = options?.strategy === "sliding"
  const onError = options?.onError
  const latch = Latch.makeUnsafe(false)
  let current: ReaderState | undefined
  let readerOpen = false
  const readerWaiters = new Set<() => void>()

  const waitForReader = Effect.callback<void>((resume) => {
    if (!readerOpen) return resume(Effect.void)
    const wake = () => {
      readerWaiters.delete(wake)
      resume(Effect.void)
    }
    readerWaiters.add(wake)
    return Effect.sync(() => {
      readerWaiters.delete(wake)
    })
  })

  const takeReader = (
    restore: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  ): Effect.Effect<void> =>
    Effect.suspend(() => {
      if (readerOpen) return Effect.flatMap(restore(waitForReader), () => takeReader(restore))
      readerOpen = true
      return Effect.void
    })

  const release = (state: ReaderState) => {
    if (state.closed) return
    state.close()
    if (current === state) {
      current = undefined
      latch.closeUnsafe()
    }
    readerOpen = false
    // every waiter re-checks, so an interrupted waiter can't strand the rest
    for (const wake of Array.from(readerWaiters)) wake()
  }

  const reader: DatagramSocket["reader"] = Effect.uninterruptibleMask((restore) =>
    Effect.gen(function*() {
      const scope = yield* Effect.scope
      yield* takeReader(restore)
      const state = new ReaderState(capacity, sliding, onError)
      yield* Scope.addFinalizer(scope, Effect.sync(() => release(state)))
      const handle = yield* openHandle(open, state, restore).pipe(
        Effect.onError(() => Effect.sync(() => release(state)))
      )
      state.handle = handle
      if (handle.scopeIds !== undefined) state.scopeIds = handle.scopeIds
      current = state
      latch.openUnsafe()
      return state.reader
    })
  )

  const write = (datagram: OutgoingDatagram): Effect.Effect<void, DatagramSocketError> =>
    Effect.suspend(() => {
      const state = current
      return state === undefined ? latch.whenOpen(write(datagram)) : state.write(datagram)
    })
  const writeAll = (datagrams: NonEmptyReadonlyArray<OutgoingDatagram>): Effect.Effect<void, DatagramSocketError> =>
    Effect.suspend(() => {
      const state = current
      return state === undefined ? latch.whenOpen(writeAll(datagrams)) : state.writeAll(datagrams)
    })
  const writer: DatagramSocket["writer"] = Effect.succeed({ write, writeAll })

  return make({ reader, writer })
}

const openHandle = (
  open: (events: NativeEvents) => Effect.Effect<NativeHandle, DatagramSocketError>,
  state: ReaderState,
  restore: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
): Effect.Effect<NativeHandle, DatagramSocketError> =>
  // `open` may not be cancellable (Node's `lookup`), so it runs in its own
  // fiber. Interruption stops the wait, and `ReaderState.close` closes a
  // handle that arrives later.
  Effect.flatMap(Effect.forkDetach(open(state.events), { startImmediately: true }), (fiber) => {
    const exit = fiber.pollUnsafe()
    if (exit !== undefined) return exit
    state.opening = fiber
    return restore(Fiber.join(fiber))
  })

const encoder = new TextEncoder()
const emptyScopeIds: ReadonlyMap<string, number> = new Map()

const closedError = () => new DatagramSocketError({ reason: new DatagramSocketClosedError() })

const writeError = (message: string, address?: NetAddress.InetAddress) =>
  new DatagramSocketError({
    reason: new DatagramSocketWriteError({ kind: "Unknown", address, cause: new Error(message) })
  })

class DatagramImpl implements Datagram {
  readonly payload: Uint8Array
  readonly host: string
  readonly port: number
  readonly owner: ReaderState
  #address: NetAddress.InetAddress | undefined
  #destination: NativeAddress | undefined
  constructor(payload: Uint8Array, host: string, port: number, owner: ReaderState) {
    this.payload = payload
    this.host = host
    this.port = port
    this.owner = owner
  }
  get address(): NetAddress.InetAddress {
    return this.#address ??= NetAddress.inetAddressFromNativeUnsafe(this.host, this.port, this.owner.scopeIds)
  }
  get destination(): NativeAddress {
    return this.#destination ??= { host: this.host, port: this.port }
  }
}

type Destination = NetAddress.InetAddress | DatagramImpl | undefined

class ReaderState {
  readonly capacity: number
  readonly sliding: boolean
  readonly events: NativeEvents
  readonly reader: Reader
  // queued packets are buffer[head..]; `head` only moves under "sliding"
  buffer: Array<DatagramImpl | undefined> = []
  head = 0
  dropped = 0
  error: DatagramSocketError | undefined = undefined
  waiter: ((effect: Effect.Effect<NonEmptyReadonlyArray<Datagram>, DatagramSocketError>) => void) | undefined =
    undefined
  handle: NativeHandle | undefined = undefined
  opening: Fiber.Fiber<NativeHandle, DatagramSocketError> | undefined = undefined
  scopeIds: ReadonlyMap<string, number> = emptyScopeIds
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

  get address(): NetAddress.InetAddress {
    if (this.#address === undefined) {
      const { host, port } = this.handle!.address
      this.#address = NetAddress.inetAddressFromNativeUnsafe(host, port, this.scopeIds)
    }
    return this.#address
  }

  push(payload: Uint8Array, host: string, port: number) {
    if (this.closed || this.error !== undefined) return
    if (this.waiter !== undefined) {
      // a parked pull implies an empty queue
      const resume = this.waiter
      this.waiter = undefined
      resume(Effect.succeed([new DatagramImpl(payload, host, port, this)]))
      return
    }
    if (this.buffer.length - this.head >= this.capacity) {
      this.dropped++
      if (!this.sliding) return
      this.buffer[this.head++] = undefined
      // amortized O(1): compact once per `capacity` drops
      if (this.head >= this.capacity) this.compact()
    }
    this.buffer.push(new DatagramImpl(payload, host, port, this))
  }

  compact() {
    this.buffer.copyWithin(0, this.head)
    this.buffer.length -= this.head
    this.head = 0
  }

  take(): NonEmptyReadonlyArray<Datagram> {
    if (this.head > 0) this.compact()
    const batch = this.buffer
    this.buffer = []
    return batch as unknown as NonEmptyReadonlyArray<Datagram>
  }

  fail(error: DatagramSocketError) {
    if (this.closed || this.error !== undefined) return
    this.error = error
    if (this.waiter !== undefined) {
      const resume = this.waiter
      this.waiter = undefined
      resume(Effect.fail(error))
    }
  }

  close() {
    this.closed = true
    this.buffer = []
    this.head = 0
    this.error = closedError()
    if (this.waiter !== undefined) {
      const resume = this.waiter
      this.waiter = undefined
      resume(Effect.fail(this.error))
    }
    if (this.handle !== undefined) {
      this.handle.close()
    } else if (this.opening !== undefined) {
      this.opening.addObserver((exit) => {
        if (exit._tag === "Success") exit.value.close()
      })
    }
  }

  write(datagram: OutgoingDatagram): Effect.Effect<void, DatagramSocketError> {
    if (this.error !== undefined) return Effect.fail(this.error)
    const handle = this.handle!
    // a received datagram passed whole is echoed to its sender
    const target: Destination = datagram instanceof DatagramImpl ? datagram : datagram.address as Destination
    const destination = this.destination(handle, target)
    if (destination instanceof DatagramSocketError) return Effect.fail(destination)
    const payload = typeof datagram.payload === "string" ? encoder.encode(datagram.payload) : datagram.payload
    return Effect.mapError(handle.send(payload, destination), (error) => this.withAddress(error, handle, target))
  }

  writeAll(datagrams: NonEmptyReadonlyArray<OutgoingDatagram>): Effect.Effect<void, DatagramSocketError> {
    if (this.error !== undefined) return Effect.fail(this.error)
    const handle = this.handle!
    const batch = new Array<{ readonly payload: Uint8Array; readonly destination: NativeAddress | undefined }>(
      datagrams.length
    )
    for (let i = 0; i < datagrams.length; i++) {
      const datagram = datagrams[i]
      const destination = this.destination(
        handle,
        datagram instanceof DatagramImpl ? datagram : datagram.address as Destination
      )
      if (destination instanceof DatagramSocketError) return Effect.fail(destination)
      batch[i] = {
        payload: typeof datagram.payload === "string" ? encoder.encode(datagram.payload) : datagram.payload,
        destination
      }
    }
    return handle.sendMany(batch as unknown as NonEmptyReadonlyArray<typeof batch[number]>)
  }

  destination(handle: NativeHandle, target: Destination): NativeAddress | undefined | DatagramSocketError {
    if (target === undefined) {
      if (handle.connected || handle.peer !== undefined) return handle.peer
      return writeError("DatagramSocket write has no destination and the socket has no peer")
    }
    if (target instanceof DatagramImpl) return handle.connected ? undefined : target.destination
    if (handle.connected) return writeError("an explicit address cannot be used on a connected DatagramSocket", target)
    if (target === this.#lastTarget) return this.#lastDestination
    const destination = { host: NetAddress.formatNativeHost(target, this.scopeIds), port: target.port }
    this.#lastTarget = target
    this.#lastDestination = destination
    return destination
  }

  withAddress(error: DatagramSocketError, handle: NativeHandle, target: Destination): DatagramSocketError {
    const reason = error.reason
    if (reason._tag !== "DatagramSocketWriteError" || reason.address !== undefined) return error
    let address: NetAddress.InetAddress | undefined
    try {
      address = target instanceof DatagramImpl
        ? target.address
        : target !== undefined
        ? target
        : handle.peer !== undefined
        ? NetAddress.inetAddressFromNativeUnsafe(handle.peer.host, handle.peer.port, this.scopeIds)
        : undefined
    } catch {
      // an unknown IPv6 zone leaves the address out
    }
    if (address === undefined) return error
    return new DatagramSocketError({
      reason: new DatagramSocketWriteError({ kind: reason.kind, address, cause: reason.cause })
    })
  }
}

const makeReader = (state: ReaderState): Reader => ({
  pull: Effect.callback((resume) => {
    if (state.buffer.length > state.head) return resume(Effect.succeed(state.take()))
    if (state.error !== undefined) return resume(Effect.fail(state.error))
    state.waiter = resume
    return Effect.sync(() => {
      if (state.waiter === resume) state.waiter = undefined
    })
  }),
  get address() {
    return state.address
  },
  dropped: () => state.dropped,
  joinMulticast: (options) =>
    Effect.suspend(() => {
      if (state.error !== undefined) return Effect.fail(state.error)
      return Effect.acquireRelease(
        state.handle!.joinMulticast(options),
        (leave) => state.closed ? Effect.void : Effect.ignoreCause(leave())
      )
    })
})
