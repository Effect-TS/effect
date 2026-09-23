/**
 * Pull-based UDP sockets with scoped native handles.
 *
 * @stability unstable
 * @since 4.0.0
 */
import type { NonEmptyReadonlyArray } from "../Array.ts"
import * as Context from "../Context.ts"
import type * as Effect from "../Effect.ts"
import type * as NetAddress from "../net/NetAddress.ts"
import * as Schema from "../Schema.ts"
import type * as Scope from "../Scope.ts"

/** @stability unstable @category type IDs @since 4.0.0 */
export const TypeId = "~effect/socket/DatagramSocket"

/** @stability unstable @category services @since 4.0.0 */
export const DatagramSocket: Context.Service<DatagramSocket, DatagramSocket> = Context.Service<DatagramSocket>(
  "effect/socket/DatagramSocket"
)

/** @stability unstable @category models @since 4.0.0 */
export interface DatagramSocket {
  readonly [TypeId]: typeof TypeId
  readonly reader: Effect.Effect<Reader, DatagramSocketError, Scope.Scope>
  readonly writer: Effect.Effect<Writer, never, Scope.Scope>
}

/** A received packet. The address is parsed lazily and cached.
 * @stability unstable @category models @since 4.0.0
 */
export interface Datagram {
  readonly payload: Uint8Array
  readonly address: NetAddress.InetAddress
}

/** @stability unstable @category models @since 4.0.0 */
export interface OutgoingDatagram {
  readonly payload: Uint8Array | string
  readonly address?: NetAddress.InetAddress | Datagram | undefined
}

/** @stability unstable @category models @since 4.0.0 */
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

/** Acquiring a reader is required even for send-only clients; writes wait while no reader is open.
 * @stability unstable @category models @since 4.0.0
 */
export interface Writer {
  readonly write: (datagram: OutgoingDatagram) => Effect.Effect<void, DatagramSocketError>
  readonly writeAll: (datagrams: NonEmptyReadonlyArray<OutgoingDatagram>) => Effect.Effect<void, DatagramSocketError>
}

/** The queue is bounded in packets. Its worst-case memory is capacity × 64 KiB.
 * @stability unstable @category models @since 4.0.0
 */
export interface ReceiveBufferOptions {
  readonly capacity?: number | undefined
  readonly strategy?: "dropping" | "sliding" | undefined
}

/** @stability unstable @category constructors @since 4.0.0 */
export const make = (_options: {
  readonly reader: DatagramSocket["reader"]
  readonly writer: DatagramSocket["writer"]
}): DatagramSocket => {
  throw new Error("not implemented")
}

/** The raw address reported by a native transport. Parsing is owned by core.
 * @stability unstable @category models @since 4.0.0
 */
export interface NativeAddress {
  readonly host: string
  readonly port: number
}

/** Native transport contract. A send completes only when the runtime reports its result.
 * Adapters normalize their native errors before passing them to core.
 * @stability unstable @category models @since 4.0.0
 */
export interface NativeHandle {
  readonly address: NativeAddress
  readonly scopeIds?: ReadonlyMap<string, number> | undefined
  readonly peer?: NativeAddress | undefined
  readonly connected?: boolean | undefined
  readonly send: (payload: Uint8Array, destination?: NativeAddress) => Effect.Effect<void, DatagramSocketError>
  readonly sendMany: (
    datagrams: NonEmptyReadonlyArray<{
      readonly payload: Uint8Array
      readonly destination?: NativeAddress | undefined
    }>
  ) => Effect.Effect<void, DatagramSocketError>
  readonly joinMulticast: <A extends NetAddress.IpAddress>(options: {
    readonly group: NetAddress.MulticastAddress<A>
    readonly interface?: NetAddress.MulticastInterface<A> | undefined
    readonly source?: A | undefined
  }) => Effect.Effect<() => Effect.Effect<void, never>, DatagramSocketError>
  readonly close: () => void
}

/** Callbacks installed before opening a native handle; packets can arrive synchronously.
 * @stability unstable @category models @since 4.0.0
 */
export interface NativeEvents {
  readonly onPacket: (payload: Uint8Array, host: string, port: number) => void
  readonly onReadError: (error: DatagramSocketError) => void
  readonly onError: (error: DatagramSocketError) => void
  readonly onClose: () => void
}

/** Acquires a native socket within each reader scope.
 * @stability unstable @category constructors @since 4.0.0
 */
export const fromNativeHandle = (
  _open: (events: NativeEvents) => Effect.Effect<NativeHandle, DatagramSocketError>,
  _options?: ReceiveBufferOptions & { readonly onError?: (error: DatagramSocketError) => void }
): DatagramSocket => {
  throw new Error("not implemented")
}

/** @stability unstable @category errors @since 4.0.0 */
export type IoErrorKind = "MessageTooLarge" | "Unreachable" | "ConnectionRefused" | "PermissionDenied" | "Unknown"

/** @stability unstable @category errors @since 4.0.0 */
export class DatagramSocketOpenError
  extends Schema.Error<DatagramSocketOpenError>("effect/socket/DatagramSocket/OpenError")({
    _tag: Schema.tag("DatagramSocketOpenError"),
    kind: Schema.Literals(["AddressInUse", "AddressNotAvailable", "PermissionDenied", "Unknown"]),
    cause: Schema.Defect()
  })
{}

/** @stability unstable @category errors @since 4.0.0 */
export class DatagramSocketReadError
  extends Schema.Error<DatagramSocketReadError>("effect/socket/DatagramSocket/ReadError")({
    _tag: Schema.tag("DatagramSocketReadError"),
    kind: Schema.Literals(["MessageTooLarge", "Unreachable", "ConnectionRefused", "PermissionDenied", "Unknown"]),
    cause: Schema.Defect()
  })
{}

/** @stability unstable @category errors @since 4.0.0 */
export class DatagramSocketWriteError
  extends Schema.Error<DatagramSocketWriteError>("effect/socket/DatagramSocket/WriteError")({
    _tag: Schema.tag("DatagramSocketWriteError"),
    kind: Schema.Literals(["MessageTooLarge", "Unreachable", "ConnectionRefused", "PermissionDenied", "Unknown"]),
    address: Schema.optional(Schema.InetAddress),
    cause: Schema.Defect()
  })
{}

/** @stability unstable @category errors @since 4.0.0 */
export class DatagramSocketClosedError
  extends Schema.Error<DatagramSocketClosedError>("effect/socket/DatagramSocket/ClosedError")({
    _tag: Schema.tag("DatagramSocketClosedError")
  })
{}

/** @stability unstable @category errors @since 4.0.0 */
export class DatagramSocketUnsupportedError
  extends Schema.Error<DatagramSocketUnsupportedError>("effect/socket/DatagramSocket/UnsupportedError")({
    _tag: Schema.tag("DatagramSocketUnsupportedError"),
    capability: Schema.String,
    runtime: Schema.String
  })
{}

/** @stability unstable @category errors @since 4.0.0 */
export const DatagramSocketErrorReason = Schema.Union([
  DatagramSocketOpenError,
  DatagramSocketReadError,
  DatagramSocketWriteError,
  DatagramSocketClosedError,
  DatagramSocketUnsupportedError
])
/** @stability unstable @category errors @since 4.0.0 */
export type DatagramSocketErrorReason = typeof DatagramSocketErrorReason.Type

/** @stability unstable @category errors @since 4.0.0 */
export const DatagramSocketErrorTypeId = "~effect/socket/DatagramSocket/DatagramSocketError"
/** @stability unstable @category errors @since 4.0.0 */
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
