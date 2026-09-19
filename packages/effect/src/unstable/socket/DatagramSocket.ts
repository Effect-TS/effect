/**
 * Scoped datagram endpoints with packet-preserving reads, writes, and streaming adapters.
 *
 * Binding acquires a ready-to-use endpoint owned by its scope. Read and write
 * operations share that endpoint; stopping a consumer leaves it open. Local
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
import * as Equal from "../../Equal.ts"
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
 * A datagram payload and its peer address.
 *
 * **Details**
 *
 * `peer` is the sender for a received packet and the destination for an outgoing
 * packet. Received payloads have independently owned storage.
 *
 * @category models
 * @since 4.0.0
 */
export interface Packet {
  readonly data: Uint8Array
  readonly peer: NetAddress.InetAddress
}

/**
 * A bound datagram socket whose writes specify a destination for each packet.
 *
 * @see {@link ConnectedSocket} for a fixed remote address
 * @category models
 * @since 4.0.0
 */
export interface UnconnectedSocket {
  readonly [TypeId]: typeof TypeId
  readonly _tag: "UnconnectedSocket"
  readonly address: NetAddress.InetAddress
  /**
   * Reads the next non-empty batch of complete packets. Concurrent pulls consume
   * distinct packets. Interrupting a pull leaves the endpoint open.
   */
  readonly pull: Effect.Effect<NonEmptyReadonlyArray<Packet>, DatagramSocketError>
  /**
   * Writes a packet to its peer, waiting for local acceptance.
   */
  readonly write: (packet: Packet) => Effect.Effect<void, DatagramSocketError>
  /**
   * Writes a group, using native batching when available and sequential sends otherwise.
   *
   * **Details**
   *
   * Keep inputs unchanged until settlement; copies are made lazily as sending
   * advances. Native backpressure
   * is handled internally. Other writes may interleave. Cancellation stops future
   * submissions but cannot retract packets. Errors may follow partial transmission;
   * retrying the group can duplicate packets. Native validation may reject a whole
   * window before submitting any of it. Application queues and retries remain caller concerns.
   */
  readonly writeMany: (packets: ReadonlyArray<Packet>) => Effect.Effect<void, DatagramSocketError>
}

/**
 * A bound datagram socket with a fixed remote address and payload-only writes.
 *
 * **Details**
 *
 * Peer association filters incoming packets but does not establish a handshake
 * or confirm reachability.
 *
 * @category models
 * @since 4.0.0
 */
export interface ConnectedSocket {
  readonly [TypeId]: typeof TypeId
  readonly _tag: "ConnectedSocket"
  readonly address: NetAddress.InetAddress
  /**
   * Reads the next non-empty batch of complete packets. Concurrent pulls consume
   * distinct packets. Interrupting a pull leaves the endpoint open.
   */
  readonly pull: Effect.Effect<NonEmptyReadonlyArray<Packet>, DatagramSocketError>
  readonly remote: NetAddress.InetAddress
  /**
   * Writes a payload to the fixed remote address, waiting for local acceptance.
   */
  readonly write: (data: Uint8Array) => Effect.Effect<void, DatagramSocketError>
  /**
   * Writes a group, using native batching when available and sequential sends otherwise.
   *
   * **Details**
   *
   * Keep inputs unchanged until settlement; copies are made lazily as sending
   * advances. Native backpressure
   * is handled internally. Other writes may interleave. Cancellation stops future
   * submissions but cannot retract packets. Errors may follow partial transmission;
   * retrying the group can duplicate packets. Native validation may reject a whole
   * window before submitting any of it. Application queues and retries remain caller concerns.
   */
  readonly writeMany: (payloads: ReadonlyArray<Uint8Array>) => Effect.Effect<void, DatagramSocketError>
}

/**
 * An unconnected or connected datagram socket, distinguished by its `_tag`.
 *
 * **Details**
 *
 * The socket is ready to send and receive when acquisition succeeds. `address`
 * is its actual local address, including the assigned port when binding to zero.
 * Read and write operations share the endpoint. Concurrent pulls consume distinct
 * batches, and interrupting an operation leaves the endpoint open.
 *
 * Closing the acquisition scope discards buffered packets and fails pending and
 * future operations with `DatagramSocketClosedError`. Writes are never replayed
 * on another endpoint. A terminal receive error fails pulls; the acquisition
 * scope continues to own the endpoint. Retry scoped binding and consumption to
 * create another socket after failure.
 *
 * @category models
 * @since 4.0.0
 */
export type DatagramSocket = UnconnectedSocket | ConnectedSocket

/**
 * Service identifying an unconnected or connected datagram socket.
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
 * @category guards
 * @since 4.0.0
 */
export const isDatagramSocket = (value: unknown): value is DatagramSocket => Predicate.hasProperty(value, TypeId)

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
  readonly bind: (options: BindOptions) => Effect.Effect<UnconnectedSocket, DatagramSocketError, Scope.Scope>
  readonly connect: (
    options: ConnectOptions
  ) => Effect.Effect<ConnectedSocket, DatagramSocketError, Scope.Scope>
}>()("effect/socket/DatagramSocketFactory") {}

/**
 * Acquires a bound datagram socket using the platform factory and the current scope.
 *
 * @category constructors
 * @since 4.0.0
 */
export const bind = (options: BindOptions): Effect.Effect<
  UnconnectedSocket,
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
  ConnectedSocket,
  DatagramSocketError,
  DatagramSocketFactory | Scope.Scope
> => DatagramSocketFactory.use((factory) => factory.connect(options))

/**
 * Operations for constructing an unconnected socket with optional batch submission.
 *
 * **Details**
 *
 * `pull` supplies complete incoming packets. `write` and optional `writeMany`
 * complete after local acceptance. Omit `writeMany` to select sequential writes
 * during construction. Implementations own resource cleanup and must settle
 * operations when their acquisition scope closes.
 *
 * @category models
 * @since 4.0.0
 */
export interface MakeUnconnectedOptions {
  readonly address: NetAddress.InetAddress
  readonly pull: Effect.Effect<NonEmptyReadonlyArray<Packet>, DatagramSocketError>
  readonly write: (packet: Packet) => Effect.Effect<void, DatagramSocketError>
  readonly writeMany?: ((packets: ReadonlyArray<Packet>) => Effect.Effect<void, DatagramSocketError>) | undefined
}

/**
 * Constructs an unconnected datagram socket from read and write operations.
 *
 * **Details**
 *
 * Operations must support caller interruption. If `writeMany` is omitted, a
 * sequential implementation is selected here. The returned socket exposes
 * `pull`, `write`, and `writeMany` directly.
 *
 * @see {@link makeConnected} for a fixed remote address
 * @see {@link fromTransport} to adapt packet callbacks with scoped cleanup and buffering
 * @category constructors
 * @since 4.0.0
 */
export const makeUnconnected = (options: MakeUnconnectedOptions): UnconnectedSocket =>
  makeSocket(options) as UnconnectedSocket

/**
 * Operations for constructing a socket associated with a fixed remote address.
 *
 * **Details**
 *
 * The supplied operations must implement the fixed-peer behavior and own resource
 * cleanup. `write` and optional `writeMany` complete after local acceptance.
 * Omit `writeMany` to select sequential writes during construction.
 *
 * @category models
 * @since 4.0.0
 */
export interface MakeConnectedOptions {
  readonly address: NetAddress.InetAddress
  readonly remote: NetAddress.InetAddress
  readonly pull: Effect.Effect<NonEmptyReadonlyArray<Packet>, DatagramSocketError>
  readonly write: (data: Uint8Array) => Effect.Effect<void, DatagramSocketError>
  readonly writeMany?: ((payloads: ReadonlyArray<Uint8Array>) => Effect.Effect<void, DatagramSocketError>) | undefined
}

/**
 * Constructs a connected datagram socket from read and write operations.
 *
 * **Details**
 *
 * Operations must support caller interruption and implement the fixed-peer
 * behavior. This constructor does not open or connect a native socket. If
 * `writeMany` is omitted, a sequential implementation is selected here.
 *
 * @see {@link makeUnconnected} for writes with per-packet destinations
 * @see {@link fromConnectedTransport} to adapt a scoped native transport
 * @category constructors
 * @since 4.0.0
 */
export const makeConnected = (options: MakeConnectedOptions): ConnectedSocket =>
  makeSocket(options, options.remote) as ConnectedSocket

const UnconnectedProto = {
  [TypeId]: TypeId,
  _tag: "UnconnectedSocket"
}

const ConnectedProto = {
  [TypeId]: TypeId,
  _tag: "ConnectedSocket"
}

const makeSocket = (
  options: MakeUnconnectedOptions | MakeConnectedOptions,
  remote?: NetAddress.InetAddress
): DatagramSocket => {
  // Each constructor fixes the input shape before normalizing batch submission.
  const write = options.write as (value: Packet | Uint8Array) => Effect.Effect<void, DatagramSocketError>
  const writeMany = (options.writeMany ??
    ((packets: ReadonlyArray<Packet | Uint8Array>) => Effect.forEach(packets, write, { discard: true }))) as (
      packets: ReadonlyArray<Packet | Uint8Array>
    ) => Effect.Effect<void, DatagramSocketError>

  const socket = Object.create(remote === undefined ? UnconnectedProto : ConnectedProto)
  socket.address = options.address
  socket.pull = options.pull
  socket.write = write
  socket.writeMany = writeMany
  if (remote !== undefined) socket.remote = remote
  return socket
}

/**
 * Callbacks through which a transport supplies incoming datagrams and
 * terminal receive errors.
 *
 * **Details**
 *
 * `onMessage` takes ownership of the payload without copying it. Adapters must
 * not mutate or reuse its backing memory after calling `onMessage`; copy native
 * receive buffers first if their memory is reused. Adapters convert native source
 * addresses to `NetAddress` and pass conversion failures to `onError`.
 *
 * @category models
 * @since 4.0.0
 */
export interface Handlers {
  readonly onMessage: (data: Uint8Array, peer: NetAddress.InetAddress) => void
  readonly onError: (cause: unknown) => void
}

/**
 * Bound endpoint operations supplied by a transport adapter.
 *
 * **Details**
 *
 * `send` completes when the runtime accepts the packet, including any wait for
 * native backpressure. Optional `sendMany` completes when every supplied packet
 * is accepted; it never returns partial progress. Without it, the constructor
 * sends packets sequentially. The adapter reports `DatagramSocketWriteError` with the
 * native cause and destination. The constructor interrupts pending sends and
 * reports `DatagramSocketClosedError` when the binding scope closes. The adapter
 * must support interruption and remove operation listeners on completion or
 * interruption. Its payload is already copied and may be retained by the runtime
 * after interruption. Resource cleanup belongs to the acquisition scope.
 * Batch failures with unknown progress use `DatagramSocketBatchWriteError`.
 *
 * @category models
 * @since 4.0.0
 */
export interface Binding {
  readonly address: NetAddress.InetAddress
  readonly send: (packet: Packet) => Effect.Effect<void, DatagramSocketError>
  readonly sendMany?: ((packets: ReadonlyArray<Packet>) => Effect.Effect<void, DatagramSocketError>) | undefined
}

/**
 * Acquires a scoped datagram endpoint from a transport binding.
 *
 * **Details**
 *
 * `acquire` registers resource cleanup in the provided scope and returns the
 * bound address and send operation. It must clean up partial acquisition,
 * including resources obtained after interruption.
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
 *   yield* socket.write({ data: new Uint8Array([1, 2]), peer: localAddress })
 *   const [packet] = yield* socket.pull
 *   return Array.from(packet.data)
 * })
 *
 * await Effect.runPromise(Effect.scoped(program)) // => [1, 2]
 * ```
 *
 * @see {@link makeUnconnected} to supply read and write operations directly
 * @see {@link fromConnectedTransport} for peer-associated sockets
 * @category constructors
 * @since 4.0.0
 */
export const fromTransport = (
  options: BindOptions,
  acquire: (handlers: Handlers) => Effect.Effect<Binding, DatagramSocketError, Scope.Scope>
): Effect.Effect<UnconnectedSocket, DatagramSocketError, Scope.Scope> =>
  fromTransportWith(options, acquire) as Effect.Effect<UnconnectedSocket, DatagramSocketError, Scope.Scope>

const fromTransportWith = (
  options: BindOptions,
  acquire: (handlers: Handlers) => Effect.Effect<Binding, DatagramSocketError, Scope.Scope>,
  remote?: NetAddress.InetAddress
): Effect.Effect<
  DatagramSocket,
  DatagramSocketError,
  Scope.Scope
> =>
  Effect.uninterruptibleMask(Effect.fnUntraced(function*(restore) {
    const parentScope = yield* Effect.scope
    const socketScope = Scope.forkUnsafe(parentScope)
    // The public constructor fixes the input shape for the lifetime of this socket.
    const toPacket = remote === undefined
      ? (value: Packet | Uint8Array) => value as Packet
      : (value: Packet | Uint8Array): Packet => ({ data: value as Uint8Array, peer: remote })

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

      const write = Effect.fnUntraced(function*(value: Packet | Uint8Array) {
        const packet = toPacket(value)
        if (packet.data.byteLength > maxPacketBytes) return yield* error(new DatagramSocketMessageTooLargeError({ size: packet.data.byteLength, maxPacketBytes }))
        return yield* binding.send({ ...packet, data: Uint8Array.from(packet.data) })
      }, guard)

      // Select preparation and submission once for this binding.
      const writeBatch = binding.sendMany === undefined
        ? Effect.fnUntraced(function*(packets: ReadonlyArray<Packet | Uint8Array>) {
          for (let offset = 0; offset < packets.length; offset++) {
            const packet = toPacket(packets[offset])
            if (packet.data.byteLength > maxPacketBytes) return yield* error(new DatagramSocketMessageTooLargeError({ size: packet.data.byteLength, maxPacketBytes }))
            yield* binding.send({ ...packet, data: Uint8Array.from(packet.data) })
            if (offset + 1 < packets.length && (offset + 1) % writeWindowPackets === 0) {
              yield* Effect.yieldNow
            }
          }
        }, guard)
        : Effect.fnUntraced(function*(packets: ReadonlyArray<Packet | Uint8Array>) {
          let offset = 0
          while (offset < packets.length) {
            const window: Array<Packet> = []
            let bytes = 0
            let invalidSize: number | undefined
            while (offset < packets.length && window.length < writeWindowPackets && bytes < writeWindowBytes) {
              const packet = toPacket(packets[offset])
              if (packet.data.byteLength > maxPacketBytes) {
                invalidSize = packet.data.byteLength
                break
              }
              window.push({ ...packet, data: Uint8Array.from(packet.data) })
              bytes += packet.data.byteLength
              offset++
            }
            if (window.length > 0) yield* binding.sendMany!(window)
            if (invalidSize !== undefined) return yield* error(new DatagramSocketMessageTooLargeError({ size: invalidSize, maxPacketBytes }))
            // Bound synchronous work and allow cancellation between native windows.
            if (offset < packets.length) yield* Effect.yieldNow
          }
        }, guard)

      return makeSocket({
        address: binding.address,
        pull: receiver.pull,
        write,
        writeMany: writeBatch
      }, remote)
    }).pipe(Effect.onError((cause) => Scope.close(socketScope, Exit.failCause(cause))))
  }))

/**
 * Acquires a scoped peer-associated socket with a byte-oriented writer.
 *
 * **Details**
 *
 * Validates the remote address before asking the adapter to bind and associate
 * the endpoint. Incoming packets are filtered to the canonical peer IP address,
 * port, and IPv6 scope. Peer association does not establish a handshake.
 *
 * @see {@link fromTransport} for acquisition ownership and adapter requirements
 * @category constructors
 * @since 4.0.0
 */
export const fromConnectedTransport = Effect.fnUntraced(function*(
  options: ConnectOptions,
  acquire: (handlers: Handlers) => Effect.Effect<Binding, DatagramSocketError, Scope.Scope>
): Effect.fn.Return<ConnectedSocket, DatagramSocketError, Scope.Scope> {
  const peer = canonicalPeer(options.remote)
  if (peer.port === 0 || NetAddress.isUnspecified(peer.address)) {
    return yield* error(
      new DatagramSocketInvalidOptionsError({
        message: "A datagram peer must have a nonzero port and a specified IP address"
      })
    )
  }

  const socket = yield* fromTransportWith(options, (handlers) =>
    acquire({
      ...handlers,
      onMessage(data, source) {
        if (Equal.equals(canonicalPeer(source), peer)) handlers.onMessage(data, source)
      }
    }), options.remote)
  return socket as ConnectedSocket
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
 * A native batch failure whose failing destination and transmission progress are unknown.
 *
 * **Details**
 *
 * Earlier packets, including some within the failing native call, may already
 * have been accepted. This error does not provide a safe retry offset.
 *
 * @category errors
 * @since 4.0.0
 */
export class DatagramSocketBatchWriteError extends Schema.TaggedError<DatagramSocketBatchWriteError>(
  "effect/socket/DatagramSocket/DatagramSocketBatchWriteError"
)("DatagramSocketBatchWriteError", {
  cause: Schema.Defect()
}) {
  override readonly message = "An error occurred while sending a datagram batch; transmission progress is unknown"
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
  | DatagramSocketBatchWriteError
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
  DatagramSocketBatchWriteError,
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
export const toStream = (self: DatagramSocket): Stream.Stream<Packet, DatagramSocketError> =>
  Stream.fromPull(Effect.succeed(self.pull))

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
 * Each outgoing group is submitted with `writeMany` before pulling the next.
 * Application queue policies apply before a group is pulled; the active write
 * owns its unsent remainder. Other writes may interleave.
 *
 * **Example** (Sending from a caller-owned queue)
 *
 * Queue admission and socket submission are separate: offering a packet can
 * complete before it is sent. A bounded queue controls pending application work;
 * the channel waits for each pulled group to finish sending.
 *
 * ```ts import.meta.vitest
 * import { Effect, Queue, Stream } from "effect"
 * import { NetAddress } from "effect/unstable/net"
 * import { DatagramSocket } from "effect/unstable/socket"
 *
 * const address = NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 12345)
 * const program = Effect.gen(function*() {
 *   const socket = yield* DatagramSocket.fromTransport({ localAddress: address }, (handlers) =>
 *     Effect.succeed({
 *       address,
 *       send: (packet) => Effect.sync(() => handlers.onMessage(packet.data, address))
 *     })
 *   )
 *   const outgoing = yield* Queue.bounded<DatagramSocket.Packet>(64)
 *   yield* Queue.offer(outgoing, { data: new Uint8Array([1]), peer: address })
 *   return yield* Stream.fromQueue(outgoing).pipe(
 *     Stream.pipeThroughChannel(DatagramSocket.toChannel(socket)),
 *     Stream.take(1),
 *     Stream.runCollect
 *   )
 * })
 *
 * Array.from((await Effect.runPromise(Effect.scoped(program)))[0].data) // => [1]
 * ```
 *
 * @see {@link toStream} for read-only consumption
 * @see {@link UnconnectedSocket} for batch completion and failure semantics
 * @category combinators
 * @since 4.0.0
 */
export const toChannel: {
  <IE = never>(self: UnconnectedSocket): Channel.Channel<
    NonEmptyReadonlyArray<Packet>,
    DatagramSocketError | IE,
    void,
    NonEmptyReadonlyArray<Packet>,
    IE
  >
  <IE = never>(self: ConnectedSocket): Channel.Channel<
    NonEmptyReadonlyArray<Packet>,
    DatagramSocketError | IE,
    void,
    NonEmptyReadonlyArray<Uint8Array>,
    IE
  >
} = <IE>(self: DatagramSocket) => {
  const pull = Channel.fromPull(Effect.succeed(self.pull))
  // Each overload restricts channel input to the corresponding socket's write shape.
  const writeBatch = self.writeMany.bind(self) as (
    packets: ReadonlyArray<Packet | Uint8Array>
  ) => Effect.Effect<void, DatagramSocketError>
  const identity = Channel.identity<NonEmptyReadonlyArray<Packet | Uint8Array>, IE, unknown>().pipe(
    Channel.mapEffect(writeBatch),
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
export const toChannelWith = <IE = never>() => toChannel<IE>

// Bound owned storage and native suffix formatting, including repeated tiny progress.
const writeWindowPackets = 64
const writeWindowBytes = 256 * 1024

const makeReceiver = Effect.fnUntraced(function*(options: BindOptions) {
  const maxPacketBytes = options.maxPacketBytes ?? defaultMaxPacketBytes
  const receiveCapacity = options.receiveCapacity ?? 256
  const receiveCapacityBytes = options.receiveCapacityBytes ?? 4 * 1024 * 1024
  const readBatchSize = options.readBatchSize ?? 16
  const incoming = yield* Queue.dropping<Packet, DatagramSocketError>(receiveCapacity)

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

  const onMessage = (data: Uint8Array, peer: NetAddress.InetAddress) => {
    const size = data.byteLength
    if (
      readError !== undefined || size > maxPacketBytes ||
      Queue.isFullUnsafe(incoming) ||
      queuedBytes + size > receiveCapacityBytes
    ) return

    if (Queue.offerUnsafe(incoming, { data, peer })) {
      queuedBytes += size
    }
  }

  const pull: DatagramSocket["pull"] = Effect.gen(function*() {
    while (true) {
      if (readError !== undefined) return yield* readError

      // Dequeue and byte accounting cannot be separated by a fiber interruption.
      const packets: Array<Packet> = []
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

const canonicalPeer = (peer: NetAddress.InetAddress): NetAddress.InetAddress => {
  const address = NetAddress.toCanonical(peer.address)
  return address === peer.address ? peer : NetAddress.inetAddressUnsafe(address, peer.port)
}

const defaultMaxPacketBytes = 65507
