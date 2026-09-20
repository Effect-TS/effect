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
import { identity } from "../../Function.ts"
import * as Predicate from "../../Predicate.ts"
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
 * use index `0` to let the operating system choose. `source` restricts the membership
 * to one sender (source-specific multicast) and must be a specified unicast address of the group's family.
 * Inputs are read and validated when the operation executes; the operation
 * works on a snapshot, so later changes to this object are not observed.
 * Native source-specific membership support depends on the runtime and OS.
 * Membership affects reception, not the outgoing multicast interface. The port
 * comes from the socket's binding. Duplicate joins and leaves of absent
 * memberships fail with the runtime's native error.
 *
 * **Gotchas**
 *
 * Positive IPv6 indices are resolved from a point-in-time interface snapshot.
 * Adapters refresh that snapshot once after a miss; an index that remains
 * unresolved fails with `DatagramSocketConfigurationError`. Interface
 * enumeration is not a permanent OS identity and need not discover every
 * interface.
 * Incoming packets identify the sender, not the destination multicast group.
 *
 * @category models
 * @since 4.0.0
 */
export interface MembershipOptions<A extends NetAddress.IpAddress = NetAddress.IpAddress> {
  readonly interface?: MulticastInterface<A> | undefined
  readonly source?: A | undefined
}

interface Socket<A extends NetAddress.IpAddress, W> {
  readonly [TypeId]: {
    readonly _A: Types.Invariant<A>
  }
  readonly address: Inet<A>
  /**
   * Reads the next non-empty batch of complete packets. Concurrent pulls consume
   * distinct packets. Interrupting a pull leaves the endpoint open.
   */
  readonly pull: Effect.Effect<NonEmptyReadonlyArray<Packet<A>>, DatagramSocketError>
  /**
   * Writes a datagram, waiting for local acceptance.
   *
   * **Details**
   *
   * The payload is copied when this effect executes, not when it is created.
   * Keep the input stable until that execution settles. Re-executing the same
   * effect reads the input again.
   */
  readonly write: (payload: W) => Effect.Effect<void, DatagramSocketError>
  /**
   * Writes a group of separate datagrams, waiting for local acceptance.
   *
   * **Details**
   *
   * Creating the effect does not snapshot the inputs. Keep the inputs stable until
   * that execution settles. The whole batch is size- and family-validated before
   * any submission. Each payload is then copied immediately before its sequential,
   * input-order submission, which awaits local acceptance before continuing; local
   * acceptance is not delivery. Other concurrent batches may interleave at submission
   * granularity. The first write failure reports the exact accepted prefix and no
   * later packet is submitted. Interruption stops later submissions, although the
   * in-flight native send may finish. Closure reports `DatagramSocketClosedError`;
   * it and interruption leave in-flight progress unknown, so a retry can duplicate
   * packets.
   */
  readonly writeMany: (payloads: ReadonlyArray<W>) => Effect.Effect<void, DatagramSocketError>
  /**
   * Enables or disables permission to send IPv4 broadcasts. Unicast writes remain
   * available. Changes affect every consumer and may interleave with batch writes.
   */
  readonly setBroadcast: (enabled: boolean) => Effect.Effect<void, DatagramSocketError>
  /**
   * Selects the outgoing interface for multicast sends. IPv4 uses an interface
   * address and IPv6 uses an unsigned 32-bit interface index. Unknown but
   * well-formed selectors fail with `DatagramSocketConfigurationError`.
   */
  readonly setMulticastInterface: (
    networkInterface: MulticastInterface<A>
  ) => Effect.Effect<void, DatagramSocketError>
  /**
   * Joins a multicast group until explicitly dropped or the socket closes.
   * Duplicate joins retain native error behavior; memberships are not reference counted.
   * For scoped cleanup, acquire this operation and use
   * `Effect.ignore(socket.dropMembership(group, options))` as the infallible
   * release. Release is best-effort because socket closure already removes OS
   * memberships and causes a later leave to report `DatagramSocketClosedError`.
   */
  readonly addMembership: <G extends A>(
    group: NetAddress.MulticastAddress<G>,
    options?: NoInfer<MembershipOptions<Family<G>>>
  ) => Effect.Effect<void, DatagramSocketError>
  /**
   * Leaves a multicast group using the same group, interface, and source as the join.
   * Missing memberships retain native error behavior. Already buffered packets remain readable.
   */
  readonly dropMembership: <G extends A>(
    group: NetAddress.MulticastAddress<G>,
    options?: NoInfer<MembershipOptions<Family<G>>>
  ) => Effect.Effect<void, DatagramSocketError>
}

/**
 * A bound, unassociated datagram socket whose writes specify a destination for each packet.
 *
 * @see {@link Associated} for a fixed peer association
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
 * Peer association filters incoming packets but does not establish a handshake
 * or confirm reachability. Successful writes only confirm local runtime
 * acceptance and do not guarantee delivery. Platform adapters may silently drop
 * recoverable receive-side network errors reported for an otherwise healthy
 * associated endpoint.
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
 * The socket is ready to send and receive when acquisition succeeds. `address`
 * is its actual local address, including the assigned port when binding to zero.
 * Read and write operations share the endpoint. Concurrent pulls consume distinct
 * batches, and interrupting an operation leaves the endpoint open.
 *
 * Closing the acquisition scope discards buffered packets and fails pending and
 * future operations with `DatagramSocketClosedError`. Writes are never replayed
 * on another endpoint. A terminal receive error refuses new packets, lets pulls
 * drain already-buffered packets, then fails with its native cause; recoverable
 * receive drops do not. Closure discards any remainder and takes precedence over
 * an unobserved terminal failure. The acquisition scope continues to own the
 * endpoint. Retry scoped binding and consumption to create another socket after
 * a terminal failure.
 *
 * The family parameter is invariant because write and configuration operations
 * consume family-specific values. Consequently, a precise IPv4 or IPv6 socket
 * is not assignable to the erased `DatagramSocket<IpAddress>` service type.
 * Acquire an erased socket from an erased local address for direct service
 * provision; `DatagramSocketFactory` preserves precise inference.
 *
 * @category models
 * @since 4.0.0
 */
export type DatagramSocket<A extends NetAddress.IpAddress = NetAddress.IpAddress> = Unassociated<A> | Associated<A>

/**
 * Service identifying an unassociated or associated datagram socket.
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
 * pull, and a 65,507-byte maximum payload. That conservative cross-family limit
 * is the IPv4 maximum total length (65,535) less the minimum IPv4 (20) and UDP
 * (8) headers; it is not a path MTU guarantee. Overflow and oversized incoming
 * payloads are silently tail-dropped. These
 * limits do not include packets already handed to consumers or kernel buffers.
 * Numeric addresses avoid implicit DNS resolution. Numeric limits are validated
 * as positive safe integers before transport acquisition.
 *
 * The public contract centers on values produced by `NetAddress` constructors.
 * The core also revalidates port and IPv6 scope numbers because native runtimes
 * can coerce them in routing-significant ways, but it is not a complete validator
 * for arbitrary forged address objects. Other native rejections are wrapped as
 * open, write, or configuration errors; malformed structural misuse may defect.
 *
 * @category models
 * @since 4.0.0
 */
export interface BindOptions<L extends NetAddress.InetAddress = NetAddress.InetAddress> {
  /**
   * Enables IPv4 broadcast sending during acquisition, before peer association.
   * Defaults to false. Use an unassociated socket to collect discovery replies
   * from multiple peers. Broadcast reception does not require this flag.
   */
  readonly broadcast?: boolean | undefined
  /**
   * Enables `SO_REUSEADDR` during acquisition. Defaults to false. This is
   * commonly required when several multicast listeners bind the same port.
   */
  readonly reuseAddress?: boolean | undefined
  /**
   * Restricts an IPv6 binding to IPv6 traffic (`IPV6_V6ONLY`). Defaults to
   * false, which on dual-stack systems also receives IPv4 senders as
   * IPv4-mapped peers. Setting this for an IPv4 local address fails before
   * transport acquisition for both binding and associated acquisition.
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
 * The peer must have a nonzero port and a specified IP address. Unspecified
 * addresses such as `0.0.0.0` and `::` are valid bindings but invalid peers.
 *
 * @category models
 * @since 4.0.0
 */
export interface ConnectOptions<L extends NetAddress.InetAddress = NetAddress.InetAddress> extends BindOptions<L> {
  readonly remote: NoInfer<Inet<FamilyOf<L>>>
}

/**
 * Transport service that acquires scoped datagram endpoints from binding options.
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
 * Acquires a bound datagram socket using the platform factory and the current scope.
 *
 * @category constructors
 * @since 4.0.0
 */
export const bind = <L extends NetAddress.InetAddress>(options: BindOptions<L>): Effect.Effect<
  Unassociated<FamilyOf<L>>,
  DatagramSocketError,
  DatagramSocketFactory | Scope.Scope
> => DatagramSocketFactory.use((factory) => factory.bind(options))

/**
 * Acquires a bound, peer-associated socket using the platform factory and the current scope.
 *
 * @category constructors
 * @since 4.0.0
 */
export const connect = <L extends NetAddress.InetAddress>(options: ConnectOptions<L>): Effect.Effect<
  Associated<FamilyOf<L>>,
  DatagramSocketError,
  DatagramSocketFactory | Scope.Scope
> => DatagramSocketFactory.use((factory) => factory.connect(options))

/**
 * Operations for constructing an unassociated datagram socket with per-packet destinations.
 *
 * **Details**
 *
 * `pull` supplies complete incoming packets. `write` and `writeMany` complete
 * after local acceptance. Implementations supply every operation, own resource
 * cleanup, and must settle operations when their acquisition scope closes.
 * Unsupported configuration operations fail with `DatagramSocketConfigurationError`.
 * Operations supplied here are exposed as given: this raw constructor adds no
 * closed-socket guard, membership validation, or membership-options snapshot.
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
 * Operations for constructing an associated datagram socket with a fixed remote address.
 *
 * **Details**
 *
 * `pull` supplies complete incoming packets from the associated peer. `write`
 * and `writeMany` send payloads to `remote` and complete after local acceptance.
 * Implementations supply every operation, own resource cleanup, and must settle
 * operations when their acquisition scope closes. Unsupported configuration
 * operations fail with `DatagramSocketConfigurationError`. Operations supplied
 * here are exposed as given: this raw constructor adds no closed-socket guard,
 * membership validation, or membership-options snapshot.
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

/**
 * Constructs an unassociated datagram socket from read and write operations.
 *
 * **Details**
 *
 * Operations must support caller interruption. The supplied operations are
 * exposed directly, including batch writes and socket configuration.
 *
 * @see {@link makeAssociated} for a fixed remote address
 * @see {@link fromTransport} to adapt packet callbacks with scoped cleanup and buffering
 * @category constructors
 * @since 4.0.0
 */
export const makeUnassociated = <A extends NetAddress.IpAddress>(
  options: MakeUnassociatedOptions<A>
): Unassociated<A> => make(options, UnassociatedProto) as Unassociated<A>

/**
 * Constructs an associated datagram socket from read and write operations.
 *
 * **Details**
 *
 * Operations must support caller interruption and implement the fixed-peer
 * behavior. This constructor does not open or connect a native socket.
 * The supplied operations are exposed directly.
 *
 * @see {@link makeUnassociated} for writes with per-packet destinations
 * @see {@link fromAssociatedTransport} to adapt a scoped native transport
 * @category constructors
 * @since 4.0.0
 */
export const makeAssociated = <A extends NetAddress.IpAddress>(options: MakeAssociatedOptions<A>): Associated<A> =>
  Object.assign(make(options, AssociatedProto), { remote: options.remote }) as Associated<A>

const variance = {
  _A: identity
}

const UnassociatedProto = {
  [TypeId]: variance,
  _tag: "Unassociated"
}

const AssociatedProto = {
  [TypeId]: variance,
  _tag: "Associated"
}

interface MakeOptions<A extends NetAddress.IpAddress, W> extends Omit<Socket<A, W>, typeof TypeId> {}

const make = <A extends NetAddress.IpAddress, W>(options: MakeOptions<A, W>, proto: object): Socket<A, W> => {
  const socket = Object.create(proto)
  socket.address = options.address
  socket.pull = options.pull
  socket.write = options.write
  socket.writeMany = options.writeMany
  socket.setBroadcast = options.setBroadcast
  socket.setMulticastInterface = options.setMulticastInterface
  socket.addMembership = options.addMembership
  socket.dropMembership = options.dropMembership
  return socket
}

/**
 * Callbacks through which a transport supplies incoming datagrams and
 * terminal receive errors.
 *
 * **Details**
 *
 * `onMessage` takes ownership of the payload without copying it. Adapters must
 * not mutate or reuse its backing memory after calling `onMessage`. The retained
 * backing allocation must also be proportional to the payload: adapters copy
 * views over materially larger native allocations before delivery so the byte
 * capacity reflects retained memory. Exact-sized stable payloads may be transferred
 * directly. Adapters convert native source addresses to `NetAddress`. A packet
 * whose source cannot be represented is silently dropped without affecting
 * other buffered or subsequent packets.
 *
 * `onError` is only for terminal receive failures. Adapters must classify and
 * drop recoverable receive errors without calling it. Calling `onError` refuses
 * new packets, lets pulls drain buffered packets, then fails future pulls.
 * Reported peers must truthfully use the binding family. In particular,
 * dual-stack IPv4 senders are represented as IPv4-mapped IPv6 peers, not cast
 * to another family.
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
 * `send` completes when the runtime accepts the packet, including any wait for
 * native backpressure. Batch writes submit packets sequentially through `send`.
 * A failed `send` reports zero accepted packets; the core tracks the successful
 * prefix of each batch. It interrupts pending sends and reports
 * `DatagramSocketClosedError` when the binding scope closes. The adapter must support interruption and remove operation
 * listeners on completion or interruption. A payload may be retained by the
 * runtime after interruption; an in-flight outcome is then unknown. Resource
 * cleanup belongs to the acquisition scope. The adapter must settle its own
 * operations when that scope closes; the seam intentionally has no separate
 * native-close notification hook.
 * Adapters supply every operation, returning `DatagramSocketConfigurationError`
 * for unsupported configuration. The constructor guards their lifetime. Membership
 * operations receive a branded multicast group and a frozen options snapshot whose
 * cross-field rules were validated on an open socket. Adapters format native
 * interface selectors at operation time, preserve native join/leave errors, and release
 * memberships when closing their native socket.
 *
 * @category models
 * @since 4.0.0
 */
export interface Binding<A extends NetAddress.IpAddress = NetAddress.IpAddress> {
  readonly setBroadcast: (enabled: boolean) => Effect.Effect<void, DatagramSocketError>
  readonly setMulticastInterface: (
    networkInterface: MulticastInterface<A>
  ) => Effect.Effect<void, DatagramSocketError>
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

/**
 * Acquires a scoped datagram endpoint from a transport binding.
 *
 * **Details**
 *
 * `acquire` registers resource cleanup in the provided scope and returns the
 * bound address and send operation. It must clean up partial acquisition,
 * including resources obtained after interruption. It must honor `broadcast`
 * during acquisition, before associating a remote peer.
 *
 * The constructor owns buffering and closure signaling for pending acquisition,
 * reads, and sends. Adapters own native resources and interruptible I/O. Failure
 * or interruption during acquisition releases partially acquired resources
 * before returning. Closing the owning scope settles operations before awaiting
 * native cleanup; subsequent operations fail instead of waiting for a new socket.
 *
 * @see {@link makeUnassociated} to supply read and write operations directly
 * @see {@link fromAssociatedTransport} for peer-associated sockets
 * @category constructors
 * @since 4.0.0
 */
export const fromTransport = <L extends NetAddress.InetAddress>(
  options: BindOptions<L>,
  acquire: (
    handlers: Handlers<FamilyOf<L>>
  ) => Effect.Effect<Binding<FamilyOf<L>>, DatagramSocketError, Scope.Scope>
): Effect.Effect<Unassociated<FamilyOf<L>>, DatagramSocketError, Scope.Scope> => fromTransportWith(options, acquire)

function fromTransportWith<L extends NetAddress.InetAddress>(
  options: BindOptions<L>,
  acquire: (
    handlers: Handlers<FamilyOf<L>>
  ) => Effect.Effect<Binding<FamilyOf<L>>, DatagramSocketError, Scope.Scope>
): Effect.Effect<Unassociated<FamilyOf<L>>, DatagramSocketError, Scope.Scope>
function fromTransportWith<L extends NetAddress.InetAddress>(
  options: BindOptions<L>,
  acquire: (
    handlers: Handlers<FamilyOf<L>>
  ) => Effect.Effect<Binding<FamilyOf<L>>, DatagramSocketError, Scope.Scope>,
  remote: Inet<FamilyOf<L>>
): Effect.Effect<Associated<FamilyOf<L>>, DatagramSocketError, Scope.Scope>
function fromTransportWith<L extends NetAddress.InetAddress>(
  options: BindOptions<L>,
  acquire: (
    handlers: Handlers<FamilyOf<L>>
  ) => Effect.Effect<Binding<FamilyOf<L>>, DatagramSocketError, Scope.Scope>,
  remote?: Inet<FamilyOf<L>>
): Effect.Effect<
  DatagramSocket<FamilyOf<L>>,
  DatagramSocketError,
  Scope.Scope
> {
  return Effect.uninterruptibleMask(Effect.fnUntraced(function*(restore) {
    const invalidLocalAddress = invalidInetAddress(options.localAddress, true)
    if (invalidLocalAddress !== undefined) {
      return yield* error(new DatagramSocketInvalidOptionsError({ message: invalidLocalAddress }))
    }
    const invalidOption = invalidBufferingOption(options)
    if (invalidOption !== undefined) {
      return yield* error(
        new DatagramSocketInvalidOptionsError({
          message: `${invalidOption} must be a positive safe integer`
        })
      )
    }
    if (options.ipv6Only === true && NetAddress.isIpv4Address(options.localAddress.address)) {
      return yield* error(
        new DatagramSocketInvalidOptionsError({
          message: "ipv6Only cannot be enabled for an IPv4 local address"
        })
      )
    }

    const parentScope = yield* Effect.scope
    const socketScope = Scope.forkUnsafe(parentScope)
    // The public constructor fixes the input shape for the lifetime of this socket.
    type A = FamilyOf<L>
    const toPacket = remote === undefined
      ? (value: Packet<A> | Uint8Array) => value as Packet<A>
      : (value: Packet<A> | Uint8Array): Packet<A> => ({ data: value as Uint8Array, peer: remote })

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
          receiver.close(err)
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
      const rebaseWriteFailure =
        (accepted: number) => (failure: DatagramSocketError): Effect.Effect<never, DatagramSocketError> => {
          if (failure.reason._tag !== "DatagramSocketWriteError") return Effect.fail(failure)
          if (failure.reason.accepted !== 0) {
            return Effect.die(new Error("Datagram socket binding reported nonzero progress for a failed send"))
          }
          return Effect.fail(error(
            new DatagramSocketWriteError({
              cause: failure.reason.cause,
              destination: failure.reason.destination,
              accepted
            })
          ))
        }

      const write = Effect.fnUntraced(function*(value: Packet<A> | Uint8Array) {
        const packet = toPacket(value)
        if (packet.data.byteLength > maxPacketBytes) {
          return yield* error(new DatagramSocketMessageTooLargeError({ size: packet.data.byteLength, maxPacketBytes }))
        }
        const invalidDestination = invalidInetAddress(packet.peer, false)
        if (invalidDestination !== undefined) {
          return yield* error(new DatagramSocketInvalidOptionsError({ message: invalidDestination }))
        }
        if (packet.peer._tag !== options.localAddress._tag) {
          return yield* error(
            new DatagramSocketInvalidOptionsError({
              message: "Datagram destination must use the socket's address family"
            })
          )
        }
        return yield* binding.send({ ...packet, data: Uint8Array.from(packet.data) }).pipe(
          Effect.catch(rebaseWriteFailure(0))
        )
      }, guard)

      const writeBatch = Effect.fnUntraced(function*(packets: ReadonlyArray<Packet<A> | Uint8Array>) {
        // Validate the whole logical group before copying or submitting any member.
        for (let index = 0; index < packets.length; index++) {
          const packet = toPacket(packets[index])
          if (packet.data.byteLength > maxPacketBytes) {
            return yield* error(
              new DatagramSocketMessageTooLargeError({ size: packet.data.byteLength, maxPacketBytes })
            )
          }
          const invalidDestination = invalidInetAddress(packet.peer, false)
          if (invalidDestination !== undefined) {
            return yield* error(new DatagramSocketInvalidOptionsError({ message: invalidDestination }))
          }
          if (packet.peer._tag !== options.localAddress._tag) {
            return yield* error(
              new DatagramSocketInvalidOptionsError({
                message: "Datagram destination must use the socket's address family"
              })
            )
          }
        }

        for (let index = 0; index < packets.length; index++) {
          const packet = toPacket(packets[index])
          yield* binding.send({ ...packet, data: Uint8Array.from(packet.data) }).pipe(
            Effect.catch(rebaseWriteFailure(index))
          )
        }
      }, guard)

      const membership = (operation: "addMembership" | "dropMembership") =>
      <G extends A>(
        group: NetAddress.MulticastAddress<G>,
        membershipOptions?: NoInfer<MembershipOptions<Family<G>>>
      ) =>
        guard(Effect.suspend(() => {
          const snapshot: MembershipOptions<A> = Object.freeze({
            interface: membershipOptions?.interface,
            source: membershipOptions?.source
          }) as MembershipOptions<A>
          const message = invalidMembershipOptions(options.localAddress.address, group, snapshot)
          return message === undefined
            ? binding[operation](group as NetAddress.MulticastAddress<A>, snapshot)
            : Effect.fail(error(new DatagramSocketInvalidOptionsError({ message })))
        }))

      const socketOptions: MakeOptions<A, Packet<A> | Uint8Array> = {
        setBroadcast: (enabled) => guard(Effect.suspend(() => binding.setBroadcast(enabled))),
        setMulticastInterface: (networkInterface) =>
          guard(Effect.suspend(() => {
            const message = invalidMulticastInterface(options.localAddress.address, networkInterface)
            return message === undefined
              ? binding.setMulticastInterface(networkInterface)
              : Effect.fail(error(new DatagramSocketInvalidOptionsError({ message })))
          })),
        addMembership: membership("addMembership"),
        dropMembership: membership("dropMembership"),
        address: binding.address,
        pull: receiver.pull,
        write,
        writeMany: writeBatch
      }
      return remote === undefined ? makeUnassociated(socketOptions) : makeAssociated({ ...socketOptions, remote })
    }).pipe(Effect.onError((cause) => Scope.close(socketScope, Exit.failCause(cause))))
  }))
}

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
export const fromAssociatedTransport = <L extends NetAddress.InetAddress>(
  options: ConnectOptions<L>,
  acquire: (
    handlers: Handlers<FamilyOf<L>>
  ) => Effect.Effect<Binding<FamilyOf<L>>, DatagramSocketError, Scope.Scope>
): Effect.Effect<Associated<FamilyOf<L>>, DatagramSocketError, Scope.Scope> =>
  Effect.gen(function*() {
    const invalidRemote = invalidInetAddress(options.remote, false)
    if (invalidRemote !== undefined) {
      return yield* error(new DatagramSocketInvalidOptionsError({ message: invalidRemote }))
    }
    if (options.remote._tag !== options.localAddress._tag) {
      return yield* error(
        new DatagramSocketInvalidOptionsError({
          message: "Datagram peer must use the local address family"
        })
      )
    }
    const peer = NetAddress.toCanonical(options.remote)
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
          if (Equal.equals(NetAddress.toCanonical(source), peer)) handlers.onMessage(data, source)
        }
      }), options.remote)
    return socket
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
 * Failures while changing broadcast permission, multicast interface, or membership.
 *
 * **Details**
 *
 * Includes unsupported operations. A configuration failure does not terminate
 * reads or close the socket. The cause retains the native failure.
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
 * **Details**
 *
 * `accepted` is the exact number of datagrams from this `write` or `writeMany`
 * call accepted by the local runtime before the submission stopped. No later
 * datagram from that call was accepted. It is always zero for `write`.
 * `destination` identifies the attempted submission where the group stopped;
 * for runtimes with queued asynchronous network errors, it is not proof that
 * this peer caused the native `cause`. Acceptance does not mean remote delivery.
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
 * **Details**
 *
 * `receiveCapacity`, `receiveCapacityBytes`, `readBatchSize`, and
 * `maxPacketBytes`, when supplied, must be positive safe integers. Ports must
 * be integral 16-bit values (and peer ports nonzero), and IPv6 scope ids and
 * interface indices must be unsigned 32-bit integers. `ipv6Only` cannot be
 * enabled for an IPv4 local address. These options and local/remote family
 * agreement are validated before transport acquisition. Batch destinations and
 * membership group/source/selector agreement are validated on an open socket
 * before any adapter work.
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
  | DatagramSocketConfigurationError
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
  DatagramSocketConfigurationError,
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
export const toStream = <A extends NetAddress.IpAddress>(
  self: DatagramSocket<A>
): Stream.Stream<Packet<A>, DatagramSocketError> => Stream.fromPull(Effect.succeed(self.pull))

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
 * @see {@link toStream} for read-only consumption
 * @see {@link Unassociated} for batch completion and failure semantics
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
} = <A extends NetAddress.IpAddress, IE>(self: DatagramSocket<A>) => {
  const pull = Channel.fromPull(Effect.succeed(self.pull))
  // Each overload restricts channel input to the corresponding socket's write shape.
  const writeBatch = self.writeMany.bind(self) as unknown as (
    packets: ReadonlyArray<Packet<A> | Uint8Array>
  ) => Effect.Effect<void, DatagramSocketError>
  const identity = Channel.identity<NonEmptyReadonlyArray<Packet<A> | Uint8Array>, IE, unknown>().pipe(
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

const makeReceiver = Effect.fnUntraced(function*<L extends NetAddress.InetAddress>(options: BindOptions<L>) {
  type A = FamilyOf<L>
  const maxPacketBytes = options.maxPacketBytes ?? defaultMaxPacketBytes
  const receiveCapacity = options.receiveCapacity ?? 256
  const receiveCapacityBytes = options.receiveCapacityBytes ?? 4 * 1024 * 1024
  const readBatchSize = options.readBatchSize ?? 16
  const incoming = yield* Queue.dropping<Packet<A>, DatagramSocketError>(receiveCapacity)

  // The endpoint owns the buffer, independently of the fibers receiving packets.
  let queuedBytes = 0
  let readError: DatagramSocketError | undefined

  const fail = (cause: DatagramSocketError) => {
    if (readError !== undefined) return
    readError = cause
    Queue.failCauseUnsafe(incoming, Cause.fail(cause))
  }

  const close = (cause: DatagramSocketError) => {
    readError = cause
    queuedBytes = 0
    Queue.failCauseUnsafe(incoming, Cause.fail(cause))
    Queue.shutdownUnsafe(incoming)
  }

  const onError = (cause: unknown) => {
    if (readError !== undefined) return
    fail(error(new DatagramSocketReadError({ cause })))
  }

  const onMessage = (data: Uint8Array, peer: Inet<A>) => {
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

  const pull: Effect.Effect<NonEmptyReadonlyArray<Packet<A>>, DatagramSocketError> = Effect.gen(function*() {
    while (true) {
      // Dequeue and byte accounting cannot be separated by a fiber interruption.
      const packets: Array<Packet<A>> = []
      while (packets.length < readBatchSize) {
        const next = Queue.takeUnsafe(incoming)
        if (next === undefined || Exit.isFailure(next)) break
        queuedBytes -= next.value.data.byteLength
        packets.push(next.value)
      }

      if (isArrayNonEmpty(packets)) return packets
      if (readError !== undefined) return yield* readError

      // Wait without reserving a packet; the queue schedules reader wakeups.
      yield* Effect.ignore(Queue.peek(incoming))
    }
  })

  return { onError, onMessage, pull, close }
})

const error = (reason: DatagramSocketErrorReason) => new DatagramSocketError({ reason })

const defaultMaxPacketBytes = 65507

const invalidBufferingOption = (options: BindOptions): keyof BindOptions | undefined => {
  for (
    const key of [
      "receiveCapacity",
      "receiveCapacityBytes",
      "readBatchSize",
      "maxPacketBytes"
    ] as const
  ) {
    const value = options[key]
    if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0)) return key
  }
}

const invalidMembershipOptions = (
  socketAddress: NetAddress.IpAddress,
  group: NetAddress.MulticastAddress,
  options: MembershipOptions
): string | undefined => {
  if (!NetAddress.isMulticast(group)) return "Membership group must be a multicast address"
  if (group._tag !== socketAddress._tag) return "Membership group must use the socket's address family"
  const invalidInterface = invalidMulticastInterface(group, options.interface)
  if (invalidInterface !== undefined) return invalidInterface
  const { source } = options
  if (source === undefined) return
  if (source._tag !== group._tag) return "Membership source must use the multicast group's address family"
  if (!NetAddress.isUnicast(source)) return "Membership source must be a specified unicast address"
}

const invalidMulticastInterface = (
  family: NetAddress.IpAddress,
  networkInterface: NetAddress.Ipv4Address | number | undefined
): string | undefined => {
  if (networkInterface === undefined) return
  if (NetAddress.isIpv4Address(family)) {
    if (!NetAddress.isIpv4Address(networkInterface)) {
      return "An IPv4 multicast interface must be an IPv4 address"
    }
    return
  }
  if (
    typeof networkInterface !== "number" ||
    !Number.isInteger(networkInterface) ||
    networkInterface < 0 ||
    networkInterface > 0xffff_ffff
  ) {
    return "An IPv6 multicast interface must be an unsigned 32-bit integer"
  }
}

const invalidInetAddress = (address: NetAddress.InetAddress, allowZeroPort: boolean): string | undefined => {
  if (
    !Number.isInteger(address.port) ||
    address.port < (allowZeroPort ? 0 : 1) ||
    address.port > 0xffff
  ) {
    return allowZeroPort
      ? "A local datagram port must be an integer between 0 and 65535"
      : "A datagram peer port must be an integer between 1 and 65535"
  }
  if (
    NetAddress.isInetAddressV6(address) &&
    (!Number.isInteger(address.scopeId) || address.scopeId < 0 || address.scopeId > 0xffff_ffff)
  ) {
    return "An IPv6 scope id must be an unsigned 32-bit integer"
  }
}
