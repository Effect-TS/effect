/**
 * Scoped datagram endpoints with packet-preserving readers, writers, and streaming adapters.
 *
 * Binding acquires a ready-to-use endpoint owned by its scope. Readers and
 * writers share that endpoint; stopping a consumer leaves it open. Local
 * buffering cannot provide remote backpressure, and successful writes do not
 * acknowledge delivery.
 *
 * @since 4.0.0
 */
import { isArrayNonEmpty, type NonEmptyReadonlyArray } from "../../Array.ts"
import * as Cause from "../../Cause.ts"
import * as Channel from "../../Channel.ts"
import * as Context from "../../Context.ts"
import * as Deferred from "../../Deferred.ts"
import * as Effect from "../../Effect.ts"
import * as Exit from "../../Exit.ts"
import * as Predicate from "../../Predicate.ts"
import * as Queue from "../../Queue.ts"
import * as Schema from "../../Schema.ts"
import * as Scope from "../../Scope.ts"
import * as Stream from "../../Stream.ts"
import * as NetAddress from "../net/NetAddress.ts"

/**
 * Runtime identifier for datagram sockets.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId = "~effect/socket/DatagramSocket"

/**
 * A received datagram and its sender, with independently owned payload storage.
 *
 * @category models
 * @since 4.0.0
 */
export interface IncomingPacket<out A = Uint8Array> {
  readonly data: A
  readonly source: NetAddress.InetAddress
}

/**
 * A single outgoing datagram and its destination.
 *
 * @category models
 * @since 4.0.0
 */
export interface OutgoingPacket<out A = Uint8Array> {
  readonly data: A
  readonly destination: NetAddress.InetAddress
}

/**
 * The read side of a bound datagram endpoint.
 *
 * **Details**
 *
 * `pull` yields non-empty batches of complete packets, including empty payloads.
 * Concurrent pulls consume distinct batches. Interrupting a pull leaves the
 * endpoint open; closing the socket acquisition scope closes the binding and
 * fails pending and future pulls.
 * `In` is the complete incoming value; it defaults to a byte packet with its source.
 *
 * @category models
 * @since 4.0.0
 */
export interface Reader<out In = IncomingPacket> {
  readonly pull: Effect.Effect<NonEmptyReadonlyArray<In>, DatagramSocketError>
}

/**
 * The write side of a bound datagram endpoint.
 *
 * **Details**
 *
 * `write` submits one datagram. Callers must not mutate payloads until the write
 * settles. Interruption cannot retract submitted datagrams.
 *
 * @category models
 * @since 4.0.0
 */
export interface Writer<in Out = OutgoingPacket> {
  readonly write: (packet: Out) => Effect.Effect<void, DatagramSocketError>
}

/**
 * A bound datagram socket whose acquisition scope owns its endpoint.
 *
 * **Details**
 *
 * The socket is ready to send and receive when acquisition succeeds. `address`
 * is its actual local address, including the assigned port when binding to zero.
 * Readers and writers share the endpoint. Concurrent pulls consume distinct
 * batches, and interrupting an operation leaves the endpoint open.
 *
 * Closing the acquisition scope discards buffered packets and fails pending and
 * future operations with `DatagramSocketClosedError`. Writes are never replayed
 * on another endpoint. A terminal receive error fails pulls; the acquisition
 * scope continues to own the endpoint. Retry scoped binding and consumption to
 * create another socket after failure.
 * `Out` is the written value and `In` is the received value; both default to
 * byte packets with destination or source addresses, respectively.
 *
 * @category models
 * @since 4.0.0
 */
export interface DatagramSocket<in Out = OutgoingPacket, out In = IncomingPacket> {
  readonly [TypeId]: typeof TypeId
  readonly address: NetAddress.InetAddress
  readonly reader: Reader<In>
  readonly writer: Writer<Out>
}

/**
 * A bound socket associated with a single peer and a byte-oriented writer.
 *
 * **Details**
 *
 * Peer association filters incoming packets but does not establish a handshake
 * or confirm reachability.
 *
 * @category models
 * @since 4.0.0
 */
export interface ConnectedDatagramSocket<out In = IncomingPacket> extends DatagramSocket<Uint8Array, In> {
  readonly remote: NetAddress.InetAddress
}

/**
 * Service identifying an unconnected datagram socket.
 *
 * @category services
 * @since 4.0.0
 */
export const DatagramSocket: Context.Service<DatagramSocket, DatagramSocket> = Context.Service<DatagramSocket>(
  "effect/socket/DatagramSocket"
)

/**
 * Returns whether a value is a datagram socket.
 *
 * **Details**
 *
 * The socket brand does not establish its incoming or outgoing value types.
 * The narrowed socket therefore reads `unknown` values and accepts no writes.
 *
 * @category guards
 * @since 4.0.0
 */
export const isDatagramSocket = (value: unknown): value is DatagramSocket<never, unknown> =>
  Predicate.hasProperty(value, TypeId)

/**
 * Binding address and finite receive limits for a datagram socket.
 *
 * **Details**
 *
 * Defaults are 256 queued packets, 4 MiB queued payload bytes, 16 packets per
 * pull, and a 65,507-byte maximum payload. Overflow drops new packets. These
 * limits do not include packets already handed to consumers or kernel buffers.
 * The payload limit is not a path MTU guarantee. Numeric addresses avoid implicit
 * DNS resolution.
 * Supply positive safe integers for numeric limits; they are not validated.
 *
 * @category models
 * @since 4.0.0
 */
export interface BindOptions {
  readonly localAddress: NetAddress.InetAddress
  readonly receiveCapacity?: number | undefined
  readonly receiveCapacityBytes?: number | undefined
  readonly readBatchSize?: number | undefined
  readonly maxPacketBytes?: number | undefined
}

/**
 * Binding options with a resolved peer for connected UDP.
 *
 * **Details**
 *
 * The peer must have a nonzero port and a specified IP address. Unspecified
 * addresses such as `0.0.0.0` and `::` are valid bindings but invalid peers.
 *
 * @category models
 * @since 4.0.0
 */
export interface ConnectOptions extends BindOptions {
  readonly remote: NetAddress.InetAddress
}

/**
 * Transport service that acquires scoped datagram endpoints from binding options.
 *
 * @category services
 * @since 4.0.0
 */
export class DatagramSocketFactory extends Context.Service<DatagramSocketFactory, {
  readonly bind: (options: BindOptions) => Effect.Effect<DatagramSocket, DatagramSocketError, Scope.Scope>
  readonly connect: (
    options: ConnectOptions
  ) => Effect.Effect<ConnectedDatagramSocket, DatagramSocketError, Scope.Scope>
}>()("effect/socket/DatagramSocketFactory") {}

/**
 * Acquires a bound datagram socket using the platform factory and the current scope.
 *
 * @category constructors
 * @since 4.0.0
 */
export const bind = (options: BindOptions): Effect.Effect<
  DatagramSocket,
  DatagramSocketError,
  DatagramSocketFactory | Scope.Scope
> => DatagramSocketFactory.use((factory) => factory.bind(options))

/**
 * Acquires a bound, peer-associated socket using the platform factory and the current scope.
 *
 * @category constructors
 * @since 4.0.0
 */
export const connect = (options: ConnectOptions): Effect.Effect<
  ConnectedDatagramSocket,
  DatagramSocketError,
  DatagramSocketFactory | Scope.Scope
> => DatagramSocketFactory.use((factory) => factory.connect(options))

/**
 * Constructs a bound datagram socket from its address, reader, and writer.
 *
 * **Details**
 *
 * Implementations own native cleanup and must settle pending operations when
 * the socket acquisition scope closes. Operations must support caller interruption.
 *
 * @see {@link fromTransport} to adapt packet callbacks with scoped cleanup and buffering
 * @category constructors
 * @since 4.0.0
 */
export const make = <Out = OutgoingPacket, In = IncomingPacket>(options: {
  readonly address: NetAddress.InetAddress
  readonly reader: Reader<In>
  readonly writer: Writer<Out>
}): DatagramSocket<Out, In> => ({ [TypeId]: TypeId, ...options })

/**
 * Callbacks through which a transport supplies incoming datagrams and
 * terminal receive errors.
 *
 * **Details**
 *
 * `onMessage` copies accepted payloads before returning. Adapters convert native
 * source addresses to `NetAddress` and pass conversion failures to `onError`.
 * A connected adapter must supply only packets from its associated peer.
 *
 * @category models
 * @since 4.0.0
 */
export interface Handlers {
  readonly onMessage: (data: Uint8Array, source: NetAddress.InetAddress) => void
  readonly onError: (cause: unknown) => void
}

/**
 * Bound endpoint operations supplied by a transport adapter.
 *
 * **Details**
 *
 * `send` completes when the runtime accepts the packet, including any wait for
 * native backpressure. The adapter reports `DatagramSocketWriteError` with the
 * native cause and destination. The constructor interrupts pending sends and
 * reports `DatagramSocketClosedError` when the binding scope closes. The adapter
 * must support interruption and remove operation listeners on completion or
 * interruption. Its payload is already copied and may be retained by the runtime
 * after interruption. Resource cleanup belongs to the acquisition scope.
 *
 * @category models
 * @since 4.0.0
 */
export interface Binding {
  readonly address: NetAddress.InetAddress
  readonly send: Writer["write"]
}

/**
 * Acquires a scoped datagram endpoint from a transport binding.
 *
 * **Details**
 *
 * `acquire` registers resource cleanup in the provided scope and returns the
 * bound address and send operation. It must clean up partial acquisition,
 * including resources obtained after interruption. Connected adapters must
 * filter incoming packets before delivering them.
 *
 * The constructor owns buffering and closure signaling for pending acquisition,
 * reads, and sends. Adapters own native resources and interruptible I/O. Failure
 * or interruption during acquisition releases partially acquired resources
 * before returning. Closing the owning scope settles operations before awaiting
 * native cleanup; subsequent operations fail instead of waiting for a new socket.
 *
 * **Example** (Creating a loopback test transport)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { NetAddress } from "effect/unstable/net"
 * import { DatagramSocket } from "effect/unstable/socket"
 *
 * const localAddress = NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 12345)
 * const program = Effect.gen(function*() {
 *   const socket = yield* DatagramSocket.fromTransport({ localAddress }, (handlers) =>
 *     Effect.succeed({
 *       address: localAddress,
 *       send: (packet) => Effect.sync(() => handlers.onMessage(packet.data, localAddress))
 *     })
 *   )
 *   yield* socket.writer.write({ data: new Uint8Array([1, 2]), destination: localAddress })
 *   const [packet] = yield* socket.reader.pull
 *   return Array.from(packet.data)
 * })
 *
 * await Effect.runPromise(Effect.scoped(program)) // => [1, 2]
 * ```
 *
 * @see {@link make} to supply a reader and writer directly
 * @see {@link fromConnectedTransport} for peer-associated sockets
 * @category constructors
 * @since 4.0.0
 */
export const fromTransport = (
  options: BindOptions,
  acquire: (handlers: Handlers) => Effect.Effect<Binding, DatagramSocketError, Scope.Scope>
): Effect.Effect<DatagramSocket, DatagramSocketError, Scope.Scope> =>
  Effect.uninterruptibleMask(Effect.fnUntraced(function*(restore) {
    const parentScope = yield* Effect.scope
    const socketScope = Scope.forkUnsafe(parentScope)

    return yield* Effect.gen(function*() {
      const transportScope = Scope.makeUnsafe()
      const receiver = yield* makeReceiver(options)
      const closed = Deferred.makeUnsafe<never, DatagramSocketError>()

      // In an already closed scope this runs immediately, before acquisition.
      yield* Scope.addFinalizerExit(
        socketScope,
        Effect.fnUntraced(function*(exit) {
          // Settle I/O and discard buffered packets before native cleanup can suspend.
          const err = error(new DatagramSocketClosedError({}))
          receiver.fail(err)
          Deferred.doneUnsafe(closed, Exit.fail(err))
          yield* Scope.close(transportScope, exit)
        })
      )

      const guard = <A>(operation: Effect.Effect<A, DatagramSocketError>) =>
        Effect.raceFirst(
          Effect.suspend(() =>
            Deferred.isDoneUnsafe(closed) ? Effect.fail(error(new DatagramSocketClosedError({}))) : operation
          ),
          Deferred.await(closed)
        )

      const scoped = Scope.provide(transportScope)
      const binding = yield* Effect.suspend(() => acquire(receiver)).pipe(scoped, guard, restore)

      if (Deferred.isDoneUnsafe(closed)) return yield* error(new DatagramSocketClosedError({}))

      const maxPacketBytes = options.maxPacketBytes ?? defaultMaxPacketBytes
      const write = Effect.fnUntraced(function*(packet: OutgoingPacket) {
        if (packet.data.byteLength > maxPacketBytes) {
          return yield* error(
            new DatagramSocketMessageTooLargeError({
              size: packet.data.byteLength,
              maxPacketBytes
            })
          )
        }

        return yield* binding.send({ ...packet, data: Uint8Array.from(packet.data) })
      }, guard)

      return make({
        address: binding.address,
        reader: { pull: receiver.pull },
        writer: { write }
      })
    }).pipe(Effect.onError((cause) => Scope.close(socketScope, Exit.failCause(cause))))
  }))

/**
 * Acquires a scoped peer-associated socket with a byte-oriented writer.
 *
 * **Details**
 *
 * Validates the remote address before asking the adapter to bind and associate
 * the endpoint. Peer association does not establish a handshake.
 *
 * @see {@link fromTransport} for acquisition ownership and adapter requirements
 * @category constructors
 * @since 4.0.0
 */
export const fromConnectedTransport = Effect.fnUntraced(function*(
  options: ConnectOptions,
  acquire: (handlers: Handlers) => Effect.Effect<Binding, DatagramSocketError, Scope.Scope>
): Effect.fn.Return<ConnectedDatagramSocket, DatagramSocketError, Scope.Scope> {
  if (options.remote.port === 0 || NetAddress.isUnspecified(options.remote.address)) {
    return yield* error(
      new DatagramSocketInvalidOptionsError({
        message: "A datagram peer must have a nonzero port and a specified IP address"
      })
    )
  }

  const socket = yield* fromTransport(options, acquire)
  return {
    ...socket,
    remote: options.remote,
    writer: {
      write: (data: Uint8Array) => socket.writer.write({ data, destination: options.remote })
    }
  }
})

/**
 * Failures while opening or associating a datagram socket.
 *
 * @category errors
 * @since 4.0.0
 */
export class DatagramSocketOpenError extends Schema.TaggedError<DatagramSocketOpenError>(
  "effect/socket/DatagramSocket/DatagramSocketOpenError"
)("DatagramSocketOpenError", {
  cause: Schema.Defect()
}) {
  override readonly message = "An error occurred while opening the datagram socket"
}

/**
 * Failures while receiving datagrams from a socket.
 *
 * @category errors
 * @since 4.0.0
 */
export class DatagramSocketReadError extends Schema.TaggedError<DatagramSocketReadError>(
  "effect/socket/DatagramSocket/DatagramSocketReadError"
)("DatagramSocketReadError", {
  cause: Schema.Defect()
}) {
  override readonly message = "An error occurred while receiving datagrams"
}

/**
 * Failures while sending a datagram to a destination.
 *
 * @category errors
 * @since 4.0.0
 */
export class DatagramSocketWriteError extends Schema.TaggedError<DatagramSocketWriteError>(
  "effect/socket/DatagramSocket/DatagramSocketWriteError"
)("DatagramSocketWriteError", {
  cause: Schema.Defect(),
  destination: Schema.InetAddressFromString
}) {
  override get message(): string {
    return `An error occurred while sending a datagram to ${this.destination}`
  }
}

/**
 * An operation interrupted by endpoint closure or attempted after closure.
 *
 * @category errors
 * @since 4.0.0
 */
export class DatagramSocketClosedError extends Schema.TaggedError<DatagramSocketClosedError>(
  "effect/socket/DatagramSocket/DatagramSocketClosedError"
)("DatagramSocketClosedError", {}) {
  override readonly message = "Datagram socket is closed"
}

/**
 * Invalid datagram binding, peer, or buffering options.
 *
 * @category errors
 * @since 4.0.0
 */
export class DatagramSocketInvalidOptionsError extends Schema.TaggedError<DatagramSocketInvalidOptionsError>(
  "effect/socket/DatagramSocket/DatagramSocketInvalidOptionsError"
)("DatagramSocketInvalidOptionsError", {
  message: Schema.String
}) {}

/**
 * A datagram payload exceeding the configured size limit.
 *
 * @category errors
 * @since 4.0.0
 */
export class DatagramSocketMessageTooLargeError extends Schema.TaggedError<DatagramSocketMessageTooLargeError>(
  "effect/socket/DatagramSocket/DatagramSocketMessageTooLargeError"
)("DatagramSocketMessageTooLargeError", {
  size: Schema.Int,
  maxPacketBytes: Schema.Int
}) {
  override get message(): string {
    return `Datagram payload of ${this.size} bytes exceeds the ${this.maxPacketBytes}-byte limit`
  }
}

/**
 * Union of datagram acquisition, I/O, and lifetime failure reasons.
 *
 * @category errors
 * @since 4.0.0
 */
export type DatagramSocketErrorReason =
  | DatagramSocketOpenError
  | DatagramSocketReadError
  | DatagramSocketWriteError
  | DatagramSocketClosedError
  | DatagramSocketInvalidOptionsError
  | DatagramSocketMessageTooLargeError

/**
 * Schema for all datagram socket failure reasons.
 *
 * @category schemas
 * @since 4.0.0
 */
export const DatagramSocketErrorReason = Schema.Union([
  DatagramSocketOpenError,
  DatagramSocketReadError,
  DatagramSocketWriteError,
  DatagramSocketClosedError,
  DatagramSocketInvalidOptionsError,
  DatagramSocketMessageTooLargeError
])

/**
 * A datagram failure retaining its schema-backed reason and underlying cause.
 *
 * @category errors
 * @since 4.0.0
 */
export class DatagramSocketError extends Schema.TaggedError<DatagramSocketError>(
  "effect/socket/DatagramSocket/DatagramSocketError"
)("DatagramSocketError", {
  reason: DatagramSocketErrorReason
}) {
  override get cause(): unknown {
    return "cause" in this.reason ? this.reason.cause : undefined
  }

  override get message(): string {
    return this.reason.message
  }
}

/**
 * Converts a bound socket's reader into a stream of packets.
 *
 * **Details**
 *
 * Stopping the stream interrupts its pending pull without closing the socket.
 * The socket's acquisition scope continues to own the endpoint. Multiple
 * consumers share the reader and consume distinct packets rather than broadcast.
 * To let a stream own the endpoint, acquire it inside `Stream.unwrap` and map
 * the acquired socket to `toStream`.
 *
 * @see {@link toChannel} for duplex I/O
 * @category combinators
 * @since 4.0.0
 */
export const toStream = <Out, In = IncomingPacket>(
  self: DatagramSocket<Out, In>
): Stream.Stream<In, DatagramSocketError> => Stream.fromPull(Effect.succeed(self.reader.pull))

/**
 * Converts a bound socket into a duplex channel of packet batches.
 *
 * **Details**
 *
 * Normal upstream completion leaves reception running. Upstream and send
 * failures fail the channel, interrupting a suspended receive. Receive failure
 * interrupts sending. Downstream termination interrupts both directions without
 * closing the socket; its acquisition scope continues to own the endpoint.
 * A finite outgoing stream does not imply a finite number of responses.
 * Outgoing batches are sent sequentially, stopping at the first failure and
 * propagating the original write error. Other writes may interleave.
 *
 * @see {@link toStream} for read-only consumption
 * @category combinators
 * @since 4.0.0
 */
export const toChannel = <Out, IE = never, In = IncomingPacket>(self: DatagramSocket<Out, In>): Channel.Channel<
  NonEmptyReadonlyArray<In>,
  DatagramSocketError | IE,
  void,
  NonEmptyReadonlyArray<Out>,
  IE
> => {
  const pull = Channel.fromPull(Effect.succeed(self.reader.pull))
  const identity = Channel.identity<NonEmptyReadonlyArray<Out>, IE, unknown>().pipe(
    Channel.mapEffect((packets) => Effect.forEach(packets, self.writer.write, { discard: true })),
    Channel.drain,
    Channel.mapDone(() => undefined)
  )

  return Channel.merge(pull, identity, { haltStrategy: "left" })
}

/**
 * Creates a duplex channel adapter with a fixed upstream error type.
 *
 * @category combinators
 * @since 4.0.0
 */
export const toChannelWith = <IE = never>() => <Out, In = IncomingPacket>(self: DatagramSocket<Out, In>) =>
  toChannel<Out, IE, In>(self)

const makeReceiver = Effect.fnUntraced(function*(options: BindOptions) {
  const maxPacketBytes = options.maxPacketBytes ?? defaultMaxPacketBytes
  const receiveCapacity = options.receiveCapacity ?? 256
  const receiveCapacityBytes = options.receiveCapacityBytes ?? 4 * 1024 * 1024
  const readBatchSize = options.readBatchSize ?? 16
  const incoming = yield* Queue.dropping<IncomingPacket, DatagramSocketError>(receiveCapacity)

  // The endpoint owns the buffer, independently of the fibers receiving packets.
  let queuedBytes = 0
  let readError: DatagramSocketError | undefined

  const fail = (cause: DatagramSocketError) => {
    readError = cause
    queuedBytes = 0
    Queue.failCauseUnsafe(incoming, Cause.fail(cause))
    Queue.shutdownUnsafe(incoming)
  }

  const onError = (cause: unknown) => {
    if (readError !== undefined) return
    fail(error(new DatagramSocketReadError({ cause })))
  }

  const onMessage = (data: Uint8Array, source: NetAddress.InetAddress) => {
    const size = data.byteLength
    if (
      readError !== undefined || size > maxPacketBytes ||
      Queue.isFullUnsafe(incoming) ||
      queuedBytes + size > receiveCapacityBytes
    ) return

    if (Queue.offerUnsafe(incoming, { data: Uint8Array.from(data), source })) {
      queuedBytes += size
    }
  }

  const pull: Reader["pull"] = Effect.gen(function*() {
    while (true) {
      if (readError !== undefined) return yield* readError

      // Dequeue and byte accounting cannot be separated by a fiber interruption.
      const packets: Array<IncomingPacket> = []
      while (packets.length < readBatchSize) {
        const next = Queue.takeUnsafe(incoming)
        if (next === undefined) break
        if (Exit.isFailure(next)) return yield* Effect.failCause(next.cause)
        queuedBytes -= next.value.data.byteLength
        packets.push(next.value)
      }

      if (isArrayNonEmpty(packets)) return packets

      // Wait without reserving a packet; the queue schedules reader wakeups.
      yield* Queue.peek(incoming)
    }
  })

  return { onError, onMessage, pull, fail }
})

const error = (reason: DatagramSocketErrorReason) => new DatagramSocketError({ reason })
const defaultMaxPacketBytes = 65507
