/**
 * Scoped datagram endpoints with packet-preserving reads, writes, and streaming adapters.
 *
 * **Details**
 *
 * Binding acquires a ready-to-use endpoint owned by its scope. Read and write
 * operations share that endpoint; stopping a consumer leaves it open. Local
 * buffering cannot provide remote backpressure, and successful writes do not
 * acknowledge delivery. Transport adapters implementing {@link Binding} must
 * settle pending operations when their scope closes; otherwise callers and
 * scope closure can remain suspended.
 *
 * @since 4.0.0
 */
import type { NonEmptyReadonlyArray } from "../../Array.ts"
import * as Cause from "../../Cause.ts"
import * as Channel from "../../Channel.ts"
import * as Context from "../../Context.ts"
import * as Deferred from "../../Deferred.ts"
import * as Effect from "../../Effect.ts"
import * as Equal from "../../Equal.ts"
import * as Exit from "../../Exit.ts"
import { identity } from "../../Function.ts"
import * as Predicate from "../../Predicate.ts"
import * as Pull from "../../Pull.ts"
import * as Queue from "../../Queue.ts"
import * as Schema from "../../Schema.ts"
import * as Scope from "../../Scope.ts"
import * as Stream from "../../Stream.ts"
import type * as Types from "../../Types.ts"
import * as NetAddress from "../net/NetAddress.ts"

/**
 * Runtime identifier for datagram sockets.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId = "~effect/socket/DatagramSocket"

/**
 * Normalizes an address type to its IPv4 or IPv6 family.
 *
 * @category models
 * @since 4.0.0
 */
export type Family<A extends NetAddress.IpAddress> = A extends NetAddress.Ipv4Address ? NetAddress.Ipv4Address
  : NetAddress.Ipv6Address

/**
 * The internet endpoint type for an address family.
 *
 * @category models
 * @since 4.0.0
 */
export type Inet<A extends NetAddress.IpAddress> = A extends NetAddress.Ipv4Address ? NetAddress.InetAddressV4
  : NetAddress.InetAddressV6

/**
 * The family carried by a local internet endpoint type.
 *
 * @category models
 * @since 4.0.0
 */
export type FamilyOf<L extends NetAddress.InetAddress> = L extends NetAddress.InetAddressV4 ? NetAddress.Ipv4Address
  : NetAddress.Ipv6Address

/**
 * A native multicast interface selector. IPv4 uses an interface address and
 * IPv6 uses an interface index. `ipv4Unspecified` and index `0` ask the OS to
 * choose its default interface.
 *
 * @category models
 * @since 4.0.0
 */
export type MulticastInterface<A extends NetAddress.IpAddress> = A extends NetAddress.Ipv4Address
  ? NetAddress.Ipv4Address
  : number

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
export interface Packet<A extends NetAddress.IpAddress = NetAddress.IpAddress> {
  readonly data: Uint8Array
  readonly peer: Inet<A>
}

/**
 * Optional inputs for one multicast membership operation.
 *
 * **Details**
 *
 * `interface` uses the operating system's native selector: an interface address
 * for IPv4 or an interface index for IPv6. Omit it, use `ipv4Unspecified`, or
 * use index `0` to let the operating system choose. `source` restricts the
 * membership to one sender and must be a specified unicast address of the
 * group's family. Inputs are read and validated when the operation executes;
 * the operation works on a snapshot, so later changes are not observed.
 * Membership affects reception, not the outgoing multicast interface.
 *
 * **Gotchas**
 *
 * Positive IPv6 indices are resolved from a point-in-time interface snapshot.
 * Adapters may cache interface enumeration and refresh it on a miss; an index
 * that stays unresolved fails with `DatagramSocketConfigurationError`.
 * Interface enumeration is not a permanent OS identity. Incoming packets
 * identify the sender, not the destination multicast group.
 *
 * @category models
 * @since 4.0.0
 */
export interface MembershipOptions<A extends NetAddress.IpAddress = NetAddress.IpAddress> {
  readonly interface?: MulticastInterface<A> | undefined
  readonly source?: A | undefined
}

interface Socket<A extends NetAddress.IpAddress, W> {
  readonly [TypeId]: { readonly _A: Types.Invariant<A> }
  readonly address: Inet<A>
  /**
   * Reads the next non-empty batch of complete packets. Concurrent pulls consume
   * distinct packets. Interrupting while waiting leaves the endpoint open and
   * reserves or removes no packet. Once a result is computed, ordinary Effect
   * interruption rules apply before the caller observes it.
   */
  readonly pull: Effect.Effect<NonEmptyReadonlyArray<Packet<A>>, DatagramSocketError>
  /**
   * Writes one datagram, waiting for local acceptance.
   *
   * **Details**
   *
   * The payload is copied when this effect executes, not when it is created.
   * Keep the input stable until execution settles. Validation precedence is
   * payload size, numeric destination validity, then address-family agreement.
   */
  readonly write: (payload: W) => Effect.Effect<void, DatagramSocketError>
  /**
   * Writes a group of separate datagrams, waiting for local acceptance.
   *
   * **Details**
   *
   * Creating the effect does not snapshot inputs. The whole batch is validated
   * before submission. Payloads are copied immediately before each sequential,
   * input-order submission. Other batches may interleave at submission
   * granularity. The first failure reports the exact accepted prefix and stops
   * later submissions. Validation precedence for each packet is payload size,
   * numeric destination validity, then address-family agreement.
   */
  readonly writeMany: (payloads: ReadonlyArray<W>) => Effect.Effect<void, DatagramSocketError>
  /**
   * Enables or disables permission to send IPv4 broadcasts without affecting
   * unicast traffic or a pending receive.
   */
  readonly setBroadcast: (enabled: boolean) => Effect.Effect<void, DatagramSocketError>
  /**
   * Selects the outgoing multicast interface. Unknown but well-formed selectors
   * fail with `DatagramSocketConfigurationError`.
   */
  readonly setMulticastInterface: (
    networkInterface: MulticastInterface<A>
  ) => Effect.Effect<void, DatagramSocketError>
  /**
   * Joins a multicast group until explicitly dropped or the socket closes.
   * Memberships are not reference counted.
   */
  readonly addMembership: <G extends A>(
    group: NetAddress.MulticastAddress<G>,
    options?: NoInfer<MembershipOptions<Family<G>>>
  ) => Effect.Effect<void, DatagramSocketError>
  /**
   * Leaves a multicast group using the same group, interface, and source as the
   * join. Buffered packets remain readable.
   */
  readonly dropMembership: <G extends A>(
    group: NetAddress.MulticastAddress<G>,
    options?: NoInfer<MembershipOptions<Family<G>>>
  ) => Effect.Effect<void, DatagramSocketError>
}

/**
 * A bound, unassociated datagram socket whose writes specify a destination for
 * each packet.
 *
 * @see {@link Associated} for a fixed peer association
 *
 * @category models
 * @since 4.0.0
 */
export interface Unassociated<A extends NetAddress.IpAddress = NetAddress.IpAddress> extends Socket<A, Packet<A>> {
  readonly _tag: "Unassociated"
}

/**
 * A bound datagram socket with a fixed remote address and payload-only writes.
 *
 * **Details**
 *
 * Peer association filters incoming packets but establishes no handshake and
 * confirms no reachability. Recoverable receive-side network errors may be
 * silently dropped for an otherwise healthy endpoint.
 *
 * @category models
 * @since 4.0.0
 */
export interface Associated<A extends NetAddress.IpAddress = NetAddress.IpAddress> extends Socket<A, Uint8Array> {
  readonly _tag: "Associated"
  readonly remote: Inet<A>
}

/**
 * An unassociated or associated datagram socket, distinguished by its `_tag`.
 *
 * **Details**
 *
 * The socket is ready when acquisition succeeds. Its scope owns the endpoint.
 * Closing that scope discards buffered packets and fails pending and future
 * operations with `DatagramSocketClosedError`. Terminal receive failures drain
 * buffered packets before repeating the same read error; writes remain
 * independent until closure. The family parameter is invariant because writes
 * and configuration consume family-specific values.
 *
 * @category models
 * @since 4.0.0
 */
export type DatagramSocket<A extends NetAddress.IpAddress = NetAddress.IpAddress> =
  | Unassociated<A>
  | Associated<A>

/**
 * Service identifying a datagram socket.
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
 * pull, and a 65,507-byte maximum payload. Overflow and oversized incoming
 * packets are silently tail-dropped. Numeric limits, ports, scopes, and
 * `ipv6Only` family compatibility are validated before transport acquisition.
 * Numeric addresses avoid implicit DNS resolution.
 *
 * @category models
 * @since 4.0.0
 */
export interface BindOptions<L extends NetAddress.InetAddress = NetAddress.InetAddress> {
  /**
   * Enables IPv4 broadcast sending during acquisition, before peer association.
   * Broadcast reception does not require this flag.
   */
  readonly broadcast?: boolean | undefined
  /**
   * Enables `SO_REUSEADDR`, commonly needed by multicast listeners sharing a port.
   */
  readonly reuseAddress?: boolean | undefined
  /**
   * Restricts an IPv6 binding to IPv6 traffic. It is invalid for IPv4 bindings.
   */
  readonly ipv6Only?: boolean | undefined
  readonly localAddress: L
  readonly receiveCapacity?: number | undefined
  readonly receiveCapacityBytes?: number | undefined
  readonly readBatchSize?: number | undefined
  readonly maxPacketBytes?: number | undefined
}

/**
 * Binding options with a resolved peer for associated UDP.
 *
 * **Details**
 *
 * The peer must have a nonzero port and an address that remains specified after
 * canonicalization; this also rejects IPv4-mapped unspecified addresses.
 * `broadcast` is meaningful when the fixed remote is a broadcast address.
 *
 * @category models
 * @since 4.0.0
 */
export interface ConnectOptions<L extends NetAddress.InetAddress = NetAddress.InetAddress> extends BindOptions<L> {
  readonly remote: NoInfer<Inet<FamilyOf<L>>>
}

/**
 * A failure while opening or associating a datagram socket.
 *
 * @category errors
 * @since 4.0.0
 */
export class DatagramSocketOpenError extends Schema.TaggedError<DatagramSocketOpenError>(
  "effect/socket/DatagramSocket/DatagramSocketOpenError"
)("DatagramSocketOpenError", { cause: Schema.Defect() }) {
  override readonly message = "An error occurred while opening the datagram socket"
}

/**
 * A failure while configuring a datagram socket.
 *
 * @category errors
 * @since 4.0.0
 */
export class DatagramSocketConfigurationError extends Schema.TaggedError<DatagramSocketConfigurationError>(
  "effect/socket/DatagramSocket/DatagramSocketConfigurationError"
)("DatagramSocketConfigurationError", {
  operation: Schema.Literals(["setBroadcast", "setMulticastInterface", "addMembership", "dropMembership"]),
  cause: Schema.Defect()
}) {
  override get message() {
    return `An error occurred while configuring the datagram socket (${this.operation})`
  }
}

/**
 * A terminal failure while receiving datagrams.
 *
 * @category errors
 * @since 4.0.0
 */
export class DatagramSocketReadError extends Schema.TaggedError<DatagramSocketReadError>(
  "effect/socket/DatagramSocket/DatagramSocketReadError"
)("DatagramSocketReadError", { cause: Schema.Defect() }) {
  override readonly message = "An error occurred while receiving datagrams"
}

/**
 * A failure while sending a datagram.
 *
 * @category errors
 * @since 4.0.0
 */
export class DatagramSocketWriteError extends Schema.TaggedError<DatagramSocketWriteError>(
  "effect/socket/DatagramSocket/DatagramSocketWriteError"
)("DatagramSocketWriteError", {
  cause: Schema.Defect(),
  destination: Schema.InetAddressFromString,
  accepted: Schema.Int
}) {
  override get message() {
    return `An error occurred while sending a datagram to ${this.destination}`
  }
}

/**
 * An operation attempted after endpoint closure.
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
 * Invalid binding, peer, buffering, or configuration options.
 *
 * @category errors
 * @since 4.0.0
 */
export class DatagramSocketInvalidOptionsError extends Schema.TaggedError<DatagramSocketInvalidOptionsError>(
  "effect/socket/DatagramSocket/DatagramSocketInvalidOptionsError"
)("DatagramSocketInvalidOptionsError", { message: Schema.String }) {}

/**
 * A payload exceeding the configured datagram size limit.
 *
 * @category errors
 * @since 4.0.0
 */
export class DatagramSocketMessageTooLargeError extends Schema.TaggedError<DatagramSocketMessageTooLargeError>(
  "effect/socket/DatagramSocket/DatagramSocketMessageTooLargeError"
)("DatagramSocketMessageTooLargeError", { size: Schema.Int, maxPacketBytes: Schema.Int }) {
  override get message() {
    return `Datagram payload of ${this.size} bytes exceeds the ${this.maxPacketBytes}-byte limit`
  }
}

/**
 * Schema for all datagram socket failure reasons.
 *
 * @category schemas
 * @since 4.0.0
 */
export const DatagramSocketErrorReason = Schema.Union([
  DatagramSocketOpenError,
  DatagramSocketConfigurationError,
  DatagramSocketReadError,
  DatagramSocketWriteError,
  DatagramSocketClosedError,
  DatagramSocketInvalidOptionsError,
  DatagramSocketMessageTooLargeError
])

/**
 * Union of datagram acquisition, I/O, and lifetime failure reasons.
 *
 * @category errors
 * @since 4.0.0
 */
export type DatagramSocketErrorReason =
  | DatagramSocketOpenError
  | DatagramSocketConfigurationError
  | DatagramSocketReadError
  | DatagramSocketWriteError
  | DatagramSocketClosedError
  | DatagramSocketInvalidOptionsError
  | DatagramSocketMessageTooLargeError

/**
 * A datagram failure retaining its schema-backed reason.
 *
 * @category errors
 * @since 4.0.0
 */
export class DatagramSocketError extends Schema.TaggedError<DatagramSocketError>(
  "effect/socket/DatagramSocket/DatagramSocketError"
)("DatagramSocketError", { reason: DatagramSocketErrorReason }) {
  override get cause(): unknown {
    return "cause" in this.reason ? this.reason.cause : undefined
  }

  override get message(): string {
    return this.reason.message
  }
}

/**
 * Transport service that acquires scoped datagram endpoints.
 *
 * @category services
 * @since 4.0.0
 */
export class DatagramSocketFactory extends Context.Service<DatagramSocketFactory, {
  readonly bind: <L extends NetAddress.InetAddress>(
    options: BindOptions<L>
  ) => Effect.Effect<Unassociated<FamilyOf<L>>, DatagramSocketError, Scope.Scope>
  readonly connect: <L extends NetAddress.InetAddress>(
    options: ConnectOptions<L>
  ) => Effect.Effect<Associated<FamilyOf<L>>, DatagramSocketError, Scope.Scope>
}>()("effect/socket/DatagramSocketFactory") {}

/**
 * Acquires an unassociated socket through the platform factory.
 *
 * @category constructors
 * @since 4.0.0
 */
export const bind = <L extends NetAddress.InetAddress>(options: BindOptions<L>): Effect.Effect<
  Unassociated<FamilyOf<L>>,
  DatagramSocketError,
  DatagramSocketFactory | Scope.Scope
> => Effect.flatMap(DatagramSocketFactory, (factory) => factory.bind(options))

/**
 * Acquires an associated socket through the platform factory.
 *
 * @category constructors
 * @since 4.0.0
 */
export const connect = <L extends NetAddress.InetAddress>(options: ConnectOptions<L>): Effect.Effect<
  Associated<FamilyOf<L>>,
  DatagramSocketError,
  DatagramSocketFactory | Scope.Scope
> => Effect.flatMap(DatagramSocketFactory, (factory) => factory.connect(options))

/**
 * Operations for constructing a raw unassociated socket.
 *
 * **Details**
 *
 * Implementations supply every operation, own cleanup, and settle operations
 * when their acquisition scope closes. These operations are exposed as given:
 * the raw constructor adds no lifetime guard, membership validation, or
 * membership-options snapshot.
 *
 * @category models
 * @since 4.0.0
 */
export interface MakeUnassociatedOptions<A extends NetAddress.IpAddress = NetAddress.IpAddress> {
  readonly address: Inet<A>
  readonly pull: Effect.Effect<NonEmptyReadonlyArray<Packet<A>>, DatagramSocketError>
  readonly write: (packet: Packet<A>) => Effect.Effect<void, DatagramSocketError>
  readonly writeMany: (packets: ReadonlyArray<Packet<A>>) => Effect.Effect<void, DatagramSocketError>
  readonly setBroadcast: (enabled: boolean) => Effect.Effect<void, DatagramSocketError>
  readonly setMulticastInterface: (networkInterface: MulticastInterface<A>) => Effect.Effect<void, DatagramSocketError>
  readonly addMembership: <G extends A>(
    group: NetAddress.MulticastAddress<G>,
    options?: NoInfer<MembershipOptions<Family<G>>>
  ) => Effect.Effect<void, DatagramSocketError>
  readonly dropMembership: <G extends A>(
    group: NetAddress.MulticastAddress<G>,
    options?: NoInfer<MembershipOptions<Family<G>>>
  ) => Effect.Effect<void, DatagramSocketError>
}

/**
 * Operations for constructing a raw associated socket.
 *
 * **Details**
 *
 * Implementations supply every operation, own cleanup, and implement fixed-peer
 * behavior. The raw constructor does not open or connect a native socket and
 * adds no guards.
 *
 * @category models
 * @since 4.0.0
 */
export interface MakeAssociatedOptions<A extends NetAddress.IpAddress = NetAddress.IpAddress> {
  readonly address: Inet<A>
  readonly remote: Inet<A>
  readonly pull: Effect.Effect<NonEmptyReadonlyArray<Packet<A>>, DatagramSocketError>
  readonly write: (payload: Uint8Array) => Effect.Effect<void, DatagramSocketError>
  readonly writeMany: (payloads: ReadonlyArray<Uint8Array>) => Effect.Effect<void, DatagramSocketError>
  readonly setBroadcast: (enabled: boolean) => Effect.Effect<void, DatagramSocketError>
  readonly setMulticastInterface: (networkInterface: MulticastInterface<A>) => Effect.Effect<void, DatagramSocketError>
  readonly addMembership: <G extends A>(
    group: NetAddress.MulticastAddress<G>,
    options?: NoInfer<MembershipOptions<Family<G>>>
  ) => Effect.Effect<void, DatagramSocketError>
  readonly dropMembership: <G extends A>(
    group: NetAddress.MulticastAddress<G>,
    options?: NoInfer<MembershipOptions<Family<G>>>
  ) => Effect.Effect<void, DatagramSocketError>
}

const variance = { _A: identity }

/**
 * Constructs a raw unassociated socket.
 *
 * **When to use**
 *
 * Use to build test doubles and in-memory transports. Supplied operations are
 * exposed directly and must support caller interruption.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeUnassociated = <A extends NetAddress.IpAddress>(
  options: MakeUnassociatedOptions<A>
): Unassociated<A> => ({ [TypeId]: variance, _tag: "Unassociated", ...options })

/**
 * Constructs a raw associated socket.
 *
 * **When to use**
 *
 * Use to build test doubles and in-memory transports. Supplied operations are
 * exposed directly and must support caller interruption.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeAssociated = <A extends NetAddress.IpAddress>(
  options: MakeAssociatedOptions<A>
): Associated<A> => ({ [TypeId]: variance, _tag: "Associated", ...options })

/**
 * Callbacks through which a transport supplies packets and terminal errors.
 *
 * **Details**
 *
 * `onMessage` takes ownership of the payload without copying it. Adapters must
 * not reuse the backing memory and must copy views over materially larger
 * native allocations. `onError` is only for terminal receive failures;
 * adapters classify and drop recoverable failures. Reported peers truthfully
 * retain the binding family, including IPv4-mapped IPv6 peers.
 *
 * @category models
 * @since 4.0.0
 */
export interface Handlers<A extends NetAddress.IpAddress = NetAddress.IpAddress> {
  readonly onMessage: (data: Uint8Array, peer: Inet<A>) => void
  readonly onError: (cause: unknown) => void
}

/**
 * Bound endpoint operations supplied by a transport adapter.
 *
 * **Details**
 *
 * `send` completes on runtime acceptance, including native backpressure.
 * Failed sends report `accepted: 0`; the core rebases batch progress. The
 * adapter owns native resources and settles its pending operations when its
 * scope closes; the constructor reports `DatagramSocketClosedError`.
 * Membership operations receive branded groups and frozen, validated options.
 *
 * @category models
 * @since 4.0.0
 */
export interface Binding<A extends NetAddress.IpAddress = NetAddress.IpAddress> {
  readonly setBroadcast: (enabled: boolean) => Effect.Effect<void, DatagramSocketError>
  readonly setMulticastInterface: (networkInterface: MulticastInterface<A>) => Effect.Effect<void, DatagramSocketError>
  readonly addMembership: (
    group: NetAddress.MulticastAddress<A>,
    options: MembershipOptions<A>
  ) => Effect.Effect<void, DatagramSocketError>
  readonly dropMembership: (
    group: NetAddress.MulticastAddress<A>,
    options: MembershipOptions<A>
  ) => Effect.Effect<void, DatagramSocketError>
  readonly address: Inet<A>
  readonly send: (packet: Packet<A>) => Effect.Effect<void, DatagramSocketError>
}

const defaults = {
  receiveCapacity: 256,
  receiveCapacityBytes: 4 * 1024 * 1024,
  readBatchSize: 16,
  maxPacketBytes: 65_507
} as const

const error = (reason: DatagramSocketErrorReason) => new DatagramSocketError({ reason })
const invalid = (message: string) => error(new DatagramSocketInvalidOptionsError({ message }))
const closed = () => error(new DatagramSocketClosedError())

const validU32 = (value: number) => Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff
const validPort = (value: number, allowZero: boolean) =>
  Number.isInteger(value) && value >= (allowZero ? 0 : 1) && value <= 0xffff

const validateOptions = (options: BindOptions): DatagramSocketError | undefined => {
  for (const key of ["receiveCapacity", "receiveCapacityBytes", "readBatchSize", "maxPacketBytes"] as const) {
    const value = options[key]
    if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0)) {
      return invalid(`${key} must be a positive safe integer`)
    }
  }
  if (!validPort(options.localAddress.port, true)) {
    return invalid("Datagram local port must be an integer from 0 through 65535")
  }
  if (NetAddress.isInetAddressV6(options.localAddress) && !validU32(options.localAddress.scopeId)) {
    return invalid("Datagram IPv6 scopeId must be an unsigned 32-bit integer")
  }
  if (options.ipv6Only === true && NetAddress.isInetAddressV4(options.localAddress)) {
    return invalid("ipv6Only cannot be enabled for an IPv4 local address")
  }
}

const validateRemote = (
  local: NetAddress.InetAddress,
  remote: NetAddress.InetAddress
): DatagramSocketError | undefined => {
  if (local._tag !== remote._tag) return invalid("Datagram peer must use the socket's address family")
  if (!validPort(remote.port, false)) return invalid("Datagram peer port must be an integer from 1 through 65535")
  if (NetAddress.isInetAddressV6(remote) && !validU32(remote.scopeId)) {
    return invalid("Datagram IPv6 scopeId must be an unsigned 32-bit integer")
  }
  const canonical = NetAddress.toCanonical(remote)
  if (NetAddress.isUnspecified(canonical.address)) return invalid("Datagram peer address must be specified")
}

interface Endpoint<A extends NetAddress.IpAddress> extends MakeUnassociatedOptions<A> {}

const makeEndpoint = <L extends NetAddress.InetAddress>(
  options: BindOptions<L>,
  acquire: (
    handlers: Handlers<FamilyOf<L>>
  ) => Effect.Effect<Binding<FamilyOf<L>>, DatagramSocketError, Scope.Scope>,
  remote?: Inet<FamilyOf<L>>
): Effect.Effect<Endpoint<FamilyOf<L>>, DatagramSocketError, Scope.Scope> =>
  Effect.gen(function*() {
    const validation = validateOptions(options) ??
      (remote === undefined ? undefined : validateRemote(options.localAddress, remote))
    if (validation !== undefined) return yield* Effect.fail(validation)

    const parent = yield* Effect.scope
    if (parent.state._tag === "Closed") return yield* Effect.fail(closed())

    type A = FamilyOf<L>
    const inbox = yield* Queue.make<Packet<A>, DatagramSocketError>()
    const adapterScope = yield* Scope.make("sequential")
    const limits = {
      receiveCapacity: options.receiveCapacity ?? defaults.receiveCapacity,
      receiveCapacityBytes: options.receiveCapacityBytes ?? defaults.receiveCapacityBytes,
      readBatchSize: options.readBatchSize ?? defaults.readBatchSize,
      maxPacketBytes: options.maxPacketBytes ?? defaults.maxPacketBytes
    }
    let status: "Open" | "Closed" = "Open"
    const isClosed = () => status === "Closed"
    let queuedBytes = 0
    const closedError = closed()
    const canonicalRemote = remote === undefined ? undefined : NetAddress.toCanonical(remote)

    const closeCore = Effect.sync(() => {
      if (status === "Closed") return
      status = "Closed"
      queuedBytes = 0
      Queue.failCauseUnsafe(inbox, Cause.fail(closedError))
      Queue.shutdownUnsafe(inbox)
    })

    // One finalizer owns the order, so core settlement precedes adapter cleanup
    // even when the parent scope itself uses the parallel finalizer strategy.
    yield* Scope.addFinalizerExit(parent, (exit_) => Effect.andThen(closeCore, Scope.close(adapterScope, exit_)))
    if (isClosed()) return yield* Effect.fail(closedError)

    const handlers: Handlers<A> = {
      onMessage(data, peer) {
        if (status === "Closed") return
        if (canonicalRemote !== undefined && !Equal.equals(NetAddress.toCanonical(peer), canonicalRemote)) return
        const size = data.byteLength
        if (
          size > limits.maxPacketBytes ||
          Queue.sizeUnsafe(inbox) >= limits.receiveCapacity ||
          queuedBytes + size > limits.receiveCapacityBytes
        ) return
        if (Queue.offerUnsafe(inbox, { data, peer })) queuedBytes += size
      },
      onError(cause) {
        if (status === "Closed") return
        Queue.failCauseUnsafe(inbox, Cause.fail(error(new DatagramSocketReadError({ cause }))))
      }
    }

    const binding = yield* Scope.provide(acquire(handlers), adapterScope).pipe(
      Effect.onExit((exit_) => Exit.isSuccess(exit_) ? Effect.void : Scope.close(adapterScope, exit_)),
      Effect.catch((cause) => isClosed() ? Effect.fail(closedError) : Effect.fail(cause))
    )
    if (isClosed()) {
      yield* Scope.close(adapterScope, Exit.void)
      return yield* Effect.fail(closedError)
    }

    const guard = (operation: Effect.Effect<void, DatagramSocketError>): Effect.Effect<void, DatagramSocketError> =>
      operation.pipe(
        Effect.flatMap(() => status === "Closed" ? Effect.fail(closedError) : Effect.void),
        Effect.catch((cause) => status === "Closed" ? Effect.fail(closedError) : Effect.fail(cause))
      )

    const validatePacket = (packet: Packet<A>): DatagramSocketError | undefined => {
      if (packet.data.byteLength > limits.maxPacketBytes) {
        return error(
          new DatagramSocketMessageTooLargeError({
            size: packet.data.byteLength,
            maxPacketBytes: limits.maxPacketBytes
          })
        )
      }
      if (!validPort(packet.peer.port, false)) {
        return invalid("A datagram peer port must be an integer between 1 and 65535")
      }
      if (NetAddress.isInetAddressV6(packet.peer) && !validU32(packet.peer.scopeId)) {
        return invalid("Datagram destination scopeId must be an unsigned 32-bit integer")
      }
      if (options.localAddress._tag !== packet.peer._tag) {
        return invalid("Datagram destination must use the socket's address family")
      }
    }

    const send = (packet: Packet<A>, accepted: number): Effect.Effect<void, DatagramSocketError> =>
      guard(binding.send({ data: new Uint8Array(packet.data), peer: packet.peer })).pipe(
        Effect.catch((cause) => {
          if (cause.reason._tag !== "DatagramSocketWriteError") return Effect.fail(cause)
          if (cause.reason.accepted !== 0) {
            return Effect.die(new Error("Datagram transport send reported invalid accepted progress"))
          }
          return Effect.fail(error(
            new DatagramSocketWriteError({
              cause: cause.reason.cause,
              destination: cause.reason.destination,
              accepted
            })
          ))
        })
      )

    const write = (packet: Packet<A>): Effect.Effect<void, DatagramSocketError> =>
      Effect.suspend(() => {
        if (status === "Closed") return Effect.fail(closedError)
        const failure = validatePacket(packet)
        return failure === undefined ? send(packet, 0) : Effect.fail(failure)
      })

    const writeMany = (packets: ReadonlyArray<Packet<A>>): Effect.Effect<void, DatagramSocketError> =>
      Effect.suspend(() => {
        if (status === "Closed") return Effect.fail(closedError)
        for (const packet of packets) {
          const failure = validatePacket(packet)
          if (failure !== undefined) return Effect.fail(failure)
        }
        let accepted = 0
        return Effect.whileLoop({
          while: () => accepted < packets.length,
          body: () => status === "Closed" ? Effect.fail(closedError) : send(packets[accepted], accepted),
          step: () => accepted++
        })
      })

    const pull: Effect.Effect<NonEmptyReadonlyArray<Packet<A>>, DatagramSocketError> = Effect.suspend(() => {
      if (status === "Closed") return Effect.fail(closedError)
      return Queue.peek(inbox).pipe(
        Effect.flatMap(() =>
          Effect.suspend((): Effect.Effect<NonEmptyReadonlyArray<Packet<A>>, DatagramSocketError> => {
            if (status === "Closed") return Effect.fail(closedError)
            const batch: Array<Packet<A>> = []
            while (batch.length < limits.readBatchSize) {
              const next = Queue.takeUnsafe(inbox)
              if (next === undefined) break
              if (Exit.isFailure(next)) {
                if (batch.length === 0) return Effect.failCause(next.cause)
                break
              }
              batch.push(next.value)
            }
            // Another puller may consume the item observed by `peek` before this
            // continuation runs. Wait again without reserving anything.
            if (batch.length === 0) return pull
            for (const packet of batch) queuedBytes -= packet.data.byteLength
            return Effect.succeed(batch as unknown as NonEmptyReadonlyArray<Packet<A>>)
          })
        ),
        Effect.catch((cause) => status === "Closed" ? Effect.fail(closedError) : Effect.fail(cause))
      )
    })

    const ensureOpen = (operation: () => Effect.Effect<void, DatagramSocketError>) =>
      Effect.suspend(() => status === "Closed" ? Effect.fail(closedError) : guard(operation()))

    const validateInterface = (networkInterface: MulticastInterface<A>): DatagramSocketError | undefined => {
      if (NetAddress.isInetAddressV4(options.localAddress)) {
        if (!NetAddress.isIpv4Address(networkInterface)) {
          return invalid("IPv4 multicast interfaces must be IPv4 addresses")
        }
      } else if (typeof networkInterface !== "number" || !validU32(networkInterface)) {
        return invalid("IPv6 multicast interfaces must be unsigned 32-bit integers")
      }
    }

    const membership = (
      operation: "addMembership" | "dropMembership",
      group: NetAddress.MulticastAddress<A>,
      options_: MembershipOptions<A> | undefined
    ): Effect.Effect<void, DatagramSocketError> =>
      Effect.suspend(() => {
        if (status === "Closed") return Effect.fail(closedError)
        if (
          !NetAddress.isMulticast(group) ||
          NetAddress.isIpv4Address(group) !== NetAddress.isInetAddressV4(options.localAddress)
        ) {
          return Effect.fail(invalid("Datagram multicast group must use the socket's address family"))
        }
        const networkInterface = options_?.interface
        const source = options_?.source
        if (networkInterface !== undefined) {
          const failure = validateInterface(networkInterface)
          if (failure !== undefined) return Effect.fail(failure)
        }
        if (
          source !== undefined &&
          (NetAddress.isIpv4Address(source) !== NetAddress.isIpv4Address(group) ||
            !NetAddress.isUnicast(source) || NetAddress.isUnspecified(source))
        ) return Effect.fail(invalid("Datagram membership source must be specified unicast of the group's family"))
        const snapshot = Object.freeze({ interface: networkInterface, source }) as MembershipOptions<A>
        return guard(binding[operation](group, snapshot))
      })

    return {
      address: binding.address,
      pull,
      write,
      writeMany,
      setBroadcast: (enabled) => ensureOpen(() => binding.setBroadcast(enabled)),
      setMulticastInterface: (networkInterface) =>
        Effect.suspend(() => {
          if (status === "Closed") return Effect.fail(closedError)
          const failure = validateInterface(networkInterface)
          return failure === undefined ? guard(binding.setMulticastInterface(networkInterface)) : Effect.fail(failure)
        }),
      addMembership: (group, options_) =>
        membership("addMembership", group as NetAddress.MulticastAddress<A>, options_ as MembershipOptions<A>),
      dropMembership: (group, options_) =>
        membership("dropMembership", group as NetAddress.MulticastAddress<A>, options_ as MembershipOptions<A>)
    }
  })

/**
 * Acquires a scoped endpoint from a transport binding.
 *
 * **Details**
 *
 * Options are validated before transport work. Acquisition in an already closed
 * scope fails `DatagramSocketClosedError` without invoking the transport.
 * `acquire` registers resource cleanup in its provided scope and must clean up
 * partial and late acquisition. Closing the owner settles core state before the
 * adapter's native cleanup is awaited.
 *
 * @category constructors
 * @since 4.0.0
 */
export const fromTransport = <L extends NetAddress.InetAddress>(
  options: BindOptions<L>,
  acquire: (handlers: Handlers<FamilyOf<L>>) => Effect.Effect<Binding<FamilyOf<L>>, DatagramSocketError, Scope.Scope>
): Effect.Effect<Unassociated<FamilyOf<L>>, DatagramSocketError, Scope.Scope> =>
  Effect.map(makeEndpoint(options, acquire), makeUnassociated)

/**
 * Acquires a scoped peer-associated endpoint.
 *
 * **Details**
 *
 * The remote is validated before acquisition. Incoming packets are compared
 * using canonical IP, port, and scope values, while the public `remote` and
 * delivered peer retain the socket's declared address family.
 *
 * @category constructors
 * @since 4.0.0
 */
export const fromAssociatedTransport = <L extends NetAddress.InetAddress>(
  options: ConnectOptions<L>,
  acquire: (handlers: Handlers<FamilyOf<L>>) => Effect.Effect<Binding<FamilyOf<L>>, DatagramSocketError, Scope.Scope>
): Effect.Effect<Associated<FamilyOf<L>>, DatagramSocketError, Scope.Scope> =>
  Effect.map(makeEndpoint(options, acquire, options.remote), (endpoint) => {
    const remote = options.remote
    return makeAssociated({
      ...endpoint,
      remote,
      write: (payload) => endpoint.write({ data: payload, peer: remote }),
      writeMany: (payloads) =>
        Effect.suspend(() => endpoint.writeMany(payloads.map((data) => ({ data, peer: remote }))))
    })
  })

/**
 * Converts a socket's reader into a stream of packets.
 *
 * **Details**
 *
 * Stopping the stream interrupts its pull without closing the socket. Multiple
 * consumers share the reader and consume distinct packets.
 *
 * @category combinators
 * @since 4.0.0
 */
export const toStream = <A extends NetAddress.IpAddress>(
  self: DatagramSocket<A>
): Stream.Stream<Packet<A>, DatagramSocketError> => Stream.fromPull(Effect.succeed(self.pull))

const toChannelInternal = <A extends NetAddress.IpAddress, IE, W>(
  self: Socket<A, W>
): Channel.Channel<
  NonEmptyReadonlyArray<Packet<A>>,
  DatagramSocketError | IE,
  void,
  NonEmptyReadonlyArray<W>,
  IE
> =>
  Channel.fromTransform(Effect.fnUntraced(function*(upstream, scope) {
    const sendFailed = Deferred.makeUnsafe<never, DatagramSocketError | IE>()
    let writeFailure: Cause.Cause<DatagramSocketError | IE> | undefined
    yield* upstream.pipe(
      Effect.flatMap((group) => self.writeMany(group)),
      Effect.forever({ disableYield: true }),
      Effect.catchCauseFilter(Pull.filterNoDone, (cause) =>
        Effect.sync(() => {
          writeFailure = cause as Cause.Cause<DatagramSocketError | IE>
          Deferred.doneUnsafe(sendFailed, Effect.failCause(writeFailure))
        })),
      Effect.forkIn(scope)
    )
    return Effect.catchCause(
      Effect.suspend(() =>
        writeFailure !== undefined
          ? Effect.failCause(writeFailure)
          : Effect.raceFirst(self.pull, Deferred.await(sendFailed))
      ),
      (cause) => Effect.failCause(writeFailure ?? cause)
    )
  }))

/**
 * Converts a socket into a duplex channel of packet batches.
 *
 * **Details**
 *
 * Normal upstream completion leaves reception running. Upstream and send
 * failures interrupt a suspended receive; receive failure interrupts sending.
 * Downstream termination interrupts both channel directions without closing
 * the socket. Each outgoing group is submitted with `writeMany` before the
 * next group is pulled.
 *
 * @category combinators
 * @since 4.0.0
 */
export const toChannel: {
  <A extends NetAddress.IpAddress, IE = never>(self: Unassociated<A>): Channel.Channel<
    NonEmptyReadonlyArray<Packet<A>>,
    DatagramSocketError | IE,
    void,
    NonEmptyReadonlyArray<Packet<A>>,
    IE
  >
  <A extends NetAddress.IpAddress, IE = never>(self: Associated<A>): Channel.Channel<
    NonEmptyReadonlyArray<Packet<A>>,
    DatagramSocketError | IE,
    void,
    NonEmptyReadonlyArray<Uint8Array>,
    IE
  >
} = toChannelInternal as any

/**
 * Creates a duplex channel adapter with a fixed upstream error type.
 *
 * @category combinators
 * @since 4.0.0
 */
export const toChannelWith = <IE = never>() =>
  toChannel as {
    <A extends NetAddress.IpAddress>(self: Unassociated<A>): Channel.Channel<
      NonEmptyReadonlyArray<Packet<A>>,
      DatagramSocketError | IE,
      void,
      NonEmptyReadonlyArray<Packet<A>>,
      IE
    >
    <A extends NetAddress.IpAddress>(self: Associated<A>): Channel.Channel<
      NonEmptyReadonlyArray<Packet<A>>,
      DatagramSocketError | IE,
      void,
      NonEmptyReadonlyArray<Uint8Array>,
      IE
    >
  }
