/**
 * Bun UDP adapter for `effect/socket/DatagramSocket`, built on the native
 * `Bun.udpSocket`. Requires Bun 1.4 or later: earlier versions throw `EAGAIN`
 * from `send` instead of returning `false`, and never fire `drain`.
 *
 * `make` opens a new Bun socket for each reader acquisition, `fromUdpSocket`
 * adopts a socket the caller creates, and `layer` provides the
 * `DatagramSocket` service.
 *
 * The reader owns the native socket, so a send-only client must still acquire
 * a reader, or its writes wait forever. Bun sends synchronously: a send error
 * fails the write that caused it, and when the kernel buffer is full the write
 * waits for `drain` and sends what is left.
 *
 * `writeAll` sends the batch with one `sendMany` call and fails with its first
 * error. Which datagrams went out is unspecified, nothing is resent, and the
 * error has no `address`, because Bun reports one error for the whole call.
 *
 * ICMP reports, such as a refused port, arrive after the write has completed,
 * so they go to the `onError` option as a `DatagramSocketReadError` with no
 * address.
 *
 * **Example** (Echo server)
 *
 * ```ts
 * import { BunDatagramSocket } from "@effect/platform-bun"
 * import { Effect } from "effect"
 *
 * const echo = Effect.gen(function*() {
 *   const socket = BunDatagramSocket.make({ bind: { port: 9000 } })
 *   const reader = yield* socket.reader
 *   const writer = yield* socket.writer
 *   while (true) {
 *     for (const received of yield* reader.pull) {
 *       // the reply path reuses the sender's raw address without parsing it
 *       yield* writer.write({ payload: received.payload, address: received })
 *     }
 *   }
 * }).pipe(Effect.scoped)
 * ```
 *
 * **Example** (Send-only client with a connected socket)
 *
 * ```ts
 * import { BunDatagramSocket } from "@effect/platform-bun"
 * import { Effect } from "effect"
 *
 * const send = (payload: string) =>
 *   Effect.gen(function*() {
 *     const socket = BunDatagramSocket.make({
 *       connect: { address: "localhost", port: 9000 }
 *     })
 *     // writes wait for an open reader, even when nothing is read
 *     yield* socket.reader
 *     const writer = yield* socket.writer
 *     yield* writer.write({ payload })
 *   }).pipe(Effect.scoped)
 * ```
 *
 * **Example** (Adopting a socket)
 *
 * ```ts
 * import { BunDatagramSocket } from "@effect/platform-bun"
 * import { Effect } from "effect"
 *
 * // `fromUdpSocket` replaces the socket's handlers with its own
 * const socket = BunDatagramSocket.fromUdpSocket(
 *   Effect.promise(() => Bun.udpSocket({ hostname: "127.0.0.1", port: 9000 }))
 * )
 * ```
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as NetAddress from "effect/net/NetAddress"
import type * as Scope from "effect/Scope"
import * as DatagramSocket from "effect/socket/DatagramSocket"
import * as Dns from "node:dns"
import * as Net from "node:net"
import * as Os from "node:os"

/**
 * An endpoint given in open-time options.
 *
 * **Details**
 *
 * Hostnames are allowed here, and are resolved once per reader acquisition
 * with `node:dns` `lookup`, so Bun's synchronous `getaddrinfo` never runs. An
 * `InetAddress` satisfies this type, so it can be passed as is.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Endpoint {
  readonly address: string | NetAddress.IpAddress
  readonly port: number
}

/**
 * The local address and port to bind. Defaults to `0.0.0.0` (or `::` for
 * `family: "ipv6"`) and an ephemeral port.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface BindOptions {
  readonly address?: string | NetAddress.IpAddress | undefined
  readonly port?: number | undefined
}

/**
 * Options for `fromUdpSocket`. The caller configures the adopted socket, so
 * only the options that live in JavaScript apply.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface AdoptOptions {
  readonly peer?: Endpoint | undefined
  readonly receiveBuffer?: DatagramSocket.ReceiveBufferOptions | undefined
  readonly onError?: ((error: DatagramSocket.DatagramSocketError) => void) | undefined
}

/**
 * Options for `make` and `layer`.
 *
 * **Details**
 *
 * `peer` is a default destination and doesn't filter senders. `connect`
 * connects the socket when Bun creates it, so the kernel filters senders. The
 * two can't be combined.
 *
 * The family is the explicit `family`, else the family of an IP literal in
 * `bind`, else the family of the `peer` or `connect` address, else `"ipv4"`.
 *
 * `reuseAddress` means `SO_REUSEADDR` on Linux and `SO_REUSEPORT` on BSD and
 * macOS.
 *
 * `multicast.interface` is the egress interface for datagrams sent to a group,
 * which is a different socket option from the ingress `interface` of
 * `Reader.joinMulticast`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Options =
  & {
    readonly bind?: BindOptions | undefined
    readonly family?: "ipv4" | "ipv6" | undefined
    readonly reuseAddress?: boolean | undefined
    readonly reusePort?: boolean | undefined
    readonly ipv6Only?: boolean | undefined
    readonly broadcast?: boolean | undefined
    readonly ttl?: number | undefined
    readonly multicast?: {
      readonly interface?: NetAddress.MulticastInterface | undefined
      readonly loopback?: boolean | undefined
      readonly ttl?: number | undefined
    } | undefined
    readonly receiveBuffer?: DatagramSocket.ReceiveBufferOptions | undefined
    readonly onError?: ((error: DatagramSocket.DatagramSocketError) => void) | undefined
  }
  & (
    | { readonly peer?: Endpoint | undefined; readonly connect?: undefined }
    | { readonly connect: Endpoint; readonly peer?: undefined }
  )

/**
 * A native Bun UDP socket, connected or not.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type UdpSocket = Bun.udp.Socket<"buffer"> | Bun.udp.ConnectedSocket<"buffer">

/**
 * Creates a `DatagramSocket` that opens and binds a new Bun UDP socket for
 * each reader acquisition.
 *
 * **Details**
 *
 * Binding, applying options and resolving names happen when a reader is
 * acquired, and fail that acquisition with a `DatagramSocketError`. Hostnames
 * in `bind`, `peer` and `connect` are resolved once per acquisition, so the
 * native socket only sees IP literals and no send waits for DNS.
 *
 * A `receiveBuffer.capacity` below 1, a fractional one or `Infinity` throws a
 * `RangeError`.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = (options: Options = {}): DatagramSocket.DatagramSocket =>
  DatagramSocket.fromNativeHandle((events) => open(options, events), {
    ...options.receiveBuffer,
    onError: options.onError
  })

/**
 * Adopts a Bun UDP socket.
 *
 * **Details**
 *
 * `acquire` runs once per reader acquisition, inside the reader's scope, and
 * the adapter closes the socket when that scope ends. Whether the socket is
 * connected is checked once at open.
 *
 * The adapter installs its own `data`, `drain` and `error` handlers with
 * `socket.reload`, which replaces the ones the caller passed to
 * `Bun.udpSocket`. Packets that arrive before `acquire` completes still go to
 * the caller's handlers.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const fromUdpSocket = (
  acquire: Effect.Effect<UdpSocket, DatagramSocket.DatagramSocketError, Scope.Scope>,
  options: AdoptOptions = {}
): DatagramSocket.DatagramSocket =>
  DatagramSocket.fromNativeHandle(
    (events) => Effect.flatMap(acquire, (socket) => adopt(socket, options, events)),
    { ...options.receiveBuffer, onError: options.onError }
  )

/**
 * Provides a `DatagramSocket` built with `make`.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer = (options: Options = {}): Layer.Layer<DatagramSocket.DatagramSocket> =>
  Layer.sync(DatagramSocket.DatagramSocket, () => make(options))

// -----------------------------------------------------------------------------
// internal
// -----------------------------------------------------------------------------

type Family = "ipv4" | "ipv6"

interface Resolved {
  readonly host: string
  readonly family: Family
}

// uSockets `LIBUS_SOCKET_*` flags, not part of Bun's public API. Bun's own
// `node:dgram` passes them the same way.
// https://github.com/oven-sh/bun/blob/main/packages/bun-usockets/src/libusockets.h
const LIBUS_SOCKET_REUSE_PORT = 4
const LIBUS_SOCKET_IPV6_ONLY = 8
const LIBUS_SOCKET_REUSE_ADDR = 16

const noScopeIds: ReadonlyMap<string, number> = new Map()

const familyOfLiteral = (address: string | NetAddress.IpAddress): Family | undefined => {
  if (typeof address !== "string") return NetAddress.isIpv4Address(address) ? "ipv4" : "ipv6"
  const version = Net.isIP(address)
  return version === 4 ? "ipv4" : version === 6 ? "ipv6" : undefined
}

// `endpoint` may be a whole `InetAddress`, whose IPv6 scope must survive
const formatEndpoint = (
  endpoint: { readonly address?: string | NetAddress.IpAddress | undefined },
  scopeIds: ReadonlyMap<string, number>
): string | undefined =>
  NetAddress.isInetAddress(endpoint)
    ? NetAddress.formatNativeHost(endpoint, scopeIds, process.platform)
    : endpoint.address === undefined || typeof endpoint.address === "string"
    ? endpoint.address
    : NetAddress.formatIp(endpoint.address)

const interfaceScopeIds = (): ReadonlyMap<string, number> => {
  // Windows reports numeric zones, which parse without a map
  if (process.platform === "win32") return noScopeIds
  try {
    return NetAddress.scopeIdsFromInterfaces(Object.entries(Os.networkInterfaces()))
  } catch {
    return noScopeIds
  }
}

// Resolves a hostname with one `lookup`, preferring IPv4 unless `family` is
// fixed. IP literals answer synchronously.
const resolve = (
  address: string,
  family: Family | undefined,
  callback: (error: unknown, resolved?: Resolved) => void
): void => {
  const literal = familyOfLiteral(address)
  if (literal !== undefined) return callback(undefined, { host: address, family: literal })
  try {
    Dns.lookup(address, { all: true, family: family === "ipv4" ? 4 : family === "ipv6" ? 6 : 0 }, (error, results) => {
      if (error) return callback(error)
      const result = results.find((result) => result.family === 4) ?? results[0]
      if (result === undefined) return callback(new Error(`${address} has no addresses`))
      callback(undefined, { host: result.address, family: result.family === 6 ? "ipv6" : "ipv4" })
    })
  } catch (error) {
    callback(error)
  }
}

const errorCode = (error: unknown): unknown =>
  typeof error === "object" && error !== null ? (error as NodeJS.ErrnoException).code : undefined

const openError = (
  error: unknown,
  kind?: DatagramSocket.DatagramSocketOpenError["kind"]
): DatagramSocket.DatagramSocketError => {
  if (kind === undefined) {
    const code = errorCode(error)
    kind = code === "EADDRINUSE"
      ? "AddressInUse"
      : code === "EADDRNOTAVAIL"
      ? "AddressNotAvailable"
      : code === "EACCES" || code === "EPERM"
      ? "PermissionDenied"
      : "Unknown"
  }
  return new DatagramSocket.DatagramSocketError({
    reason: new DatagramSocket.DatagramSocketOpenError({ kind, cause: error })
  })
}

const ioKind = (error: unknown): DatagramSocket.IoErrorKind => {
  switch (errorCode(error)) {
    case "EMSGSIZE":
      return "MessageTooLarge"
    case "EHOSTUNREACH":
    case "ENETUNREACH":
    case "EHOSTDOWN":
    case "ENETDOWN":
      return "Unreachable"
    case "ECONNREFUSED":
      return "ConnectionRefused"
    case "EACCES":
    case "EPERM":
      return "PermissionDenied"
    default:
      return "Unknown"
  }
}

const closedError = () =>
  new DatagramSocket.DatagramSocketError({ reason: new DatagramSocket.DatagramSocketClosedError() })

const writeError = (error: unknown): DatagramSocket.DatagramSocketError =>
  new DatagramSocket.DatagramSocketError({
    reason: new DatagramSocket.DatagramSocketWriteError({ kind: ioKind(error), cause: error })
  })

const readError = (error: unknown): DatagramSocket.DatagramSocketError =>
  new DatagramSocket.DatagramSocketError({
    reason: new DatagramSocket.DatagramSocketReadError({ kind: ioKind(error), cause: error })
  })

// Bun throws a plain `Error` with this message when sending on a closed socket
const isClosedError = (error: unknown): boolean => error instanceof Error && error.message === "Socket is closed"

const open = (
  options: Options,
  events: DatagramSocket.NativeEvents
): Effect.Effect<DatagramSocket.NativeHandle, DatagramSocket.DatagramSocketError> =>
  // `lookup` can't be cancelled, and core never interrupts `open`, so this
  // registers no finalizer
  Effect.callback((resume) => {
    const fail = (error: DatagramSocket.DatagramSocketError) => resume(Effect.fail(error))
    const remote = options.connect ?? options.peer
    const fixed = options.family ??
      (options.bind?.address === undefined ? undefined : familyOfLiteral(options.bind.address))

    // Hostnames resolve to IP literals here. IP addresses are formatted once
    // the family, and with it the IPv6 scope IDs, is known.
    const lookup = (
      address: string | NetAddress.IpAddress | undefined,
      family: Family | undefined,
      next: (resolved: Resolved | undefined) => void
    ) => {
      if (typeof address !== "string") return next(undefined)
      resolve(address, family, (error, resolved) => {
        if (error !== undefined) return fail(openError(error, "AddressNotAvailable"))
        next(resolved)
      })
    }

    lookup(remote?.address, fixed, (resolvedRemote) => {
      const remoteFamily = resolvedRemote?.family ??
        (remote === undefined ? undefined : familyOfLiteral(remote.address))
      lookup(options.bind?.address, fixed ?? remoteFamily, (resolvedBind) => {
        const family = fixed ?? remoteFamily ?? resolvedBind?.family ?? "ipv4"
        const scopeIds = family === "ipv6" ? interfaceScopeIds() : noScopeIds
        const remoteAddress: DatagramSocket.NativeAddress | undefined = remote === undefined ? undefined : {
          host: resolvedRemote?.host ?? formatEndpoint(remote, scopeIds)!,
          port: remote.port
        }
        const bindHost = resolvedBind?.host ??
          (options.bind === undefined ? undefined : formatEndpoint(options.bind, scopeIds)) ??
          (family === "ipv6" ? "::" : "0.0.0.0")
        create(options, events, scopeIds, bindHost, remoteAddress, resume)
      })
    })
  })

const create = (
  options: Options,
  events: DatagramSocket.NativeEvents,
  scopeIds: ReadonlyMap<string, number>,
  host: string,
  remote: DatagramSocket.NativeAddress | undefined,
  resume: (effect: Effect.Effect<DatagramSocket.NativeHandle, DatagramSocket.DatagramSocketError>) => void
) => {
  const native = new NativeSocket(events)
  const flags = (options.reusePort ? LIBUS_SOCKET_REUSE_PORT : 0) |
    (options.ipv6Only ? LIBUS_SOCKET_IPV6_ONLY : 0) |
    (options.reuseAddress ? LIBUS_SOCKET_REUSE_ADDR : 0)
  const connected = options.connect !== undefined
  const socketOptions: Record<string, unknown> = {
    hostname: host,
    port: options.bind?.port ?? 0,
    socket: native.handlers
  }
  if (flags !== 0) socketOptions.flags = flags
  // `connect` can only be set at creation
  if (connected) socketOptions.connect = { hostname: remote!.host, port: remote!.port }
  let opening: Promise<UdpSocket>
  try {
    opening = Bun.udpSocket(socketOptions as Bun.udp.SocketOptions<"buffer">)
  } catch (error) {
    return resume(Effect.fail(openError(error)))
  }
  opening.then(
    (socket) => {
      native.socket = socket
      try {
        if (options.broadcast !== undefined) socket.setBroadcast(options.broadcast)
        if (options.ttl !== undefined) socket.setTTL(options.ttl)
        const multicast = options.multicast
        if (multicast?.ttl !== undefined) socket.setMulticastTTL(multicast.ttl)
        if (multicast?.loopback !== undefined) socket.setMulticastLoopback(multicast.loopback)
        if (multicast?.interface !== undefined) {
          socket.setMulticastInterface(
            NetAddress.formatMulticastInterface(multicast.interface, scopeIds, process.platform)
          )
        }
      } catch (error) {
        native.close()
        return resume(Effect.fail(openError(error)))
      }
      resume(Effect.succeed(native.open(scopeIds, remote, connected)))
    },
    (error) => resume(Effect.fail(openError(error)))
  )
}

const adopt = (
  socket: UdpSocket,
  options: AdoptOptions,
  events: DatagramSocket.NativeEvents
): Effect.Effect<DatagramSocket.NativeHandle, DatagramSocket.DatagramSocketError> =>
  Effect.callback((resume) => {
    const native = new NativeSocket(events)
    native.socket = socket
    const fail = (error: DatagramSocket.DatagramSocketError) => {
      native.close()
      resume(Effect.fail(error))
    }
    if (socket.closed) return fail(openError(new Error("The adopted Bun UDP socket is closed")))
    let family: Family
    try {
      // the runtime expects `{ socket }`, although the types declare the
      // handler itself
      socket.reload({ socket: native.handlers } as any)
      family = socket.address.family === "IPv6" ? "ipv6" : "ipv4"
    } catch (error) {
      return fail(openError(error))
    }
    const scopeIds = family === "ipv6" ? interfaceScopeIds() : noScopeIds
    const remote = "remoteAddress" in socket ? socket.remoteAddress : undefined
    if (remote !== undefined) {
      return resume(Effect.succeed(native.open(scopeIds, { host: remote.address, port: remote.port }, true)))
    }
    const peer = options.peer
    if (peer === undefined) return resume(Effect.succeed(native.open(scopeIds, undefined, false)))
    if (typeof peer.address !== "string") {
      return resume(
        Effect.succeed(native.open(scopeIds, { host: formatEndpoint(peer, scopeIds)!, port: peer.port }, false))
      )
    }
    resolve(peer.address, family, (error, resolved) => {
      if (error !== undefined) return fail(openError(error, "AddressNotAvailable"))
      resume(Effect.succeed(native.open(scopeIds, { host: resolved!.host, port: peer.port }, false)))
    })
  })

// A send waiting for `drain`, in `sendMany`'s flat form: `[data, port, host]`
// per datagram, or plain payloads when connected
class PendingSend {
  readonly packets: ReadonlyArray<Uint8Array | string | number>
  readonly count: number
  sent: number
  readonly done: (error?: DatagramSocket.DatagramSocketError) => void
  constructor(
    packets: ReadonlyArray<Uint8Array | string | number>,
    count: number,
    sent: number,
    done: (error?: DatagramSocket.DatagramSocketError) => void
  ) {
    this.packets = packets
    this.count = count
    this.sent = sent
    this.done = done
  }
}

class NativeSocket {
  socket: UdpSocket | undefined = undefined
  readonly events: DatagramSocket.NativeEvents
  readonly handlers: Bun.udp.SocketHandler<"buffer">
  // sends the kernel refused with a full buffer, oldest first. Later sends
  // queue behind them, so datagrams keep their order
  pending: Array<PendingSend> = []
  // entries per datagram in `sendMany`'s list
  stride = 3
  closing = false

  constructor(events: DatagramSocket.NativeEvents) {
    this.events = events
    this.handlers = {
      // payloads arrive as fresh `Buffer`s and pass straight through
      data: (_socket, payload, port, host) => events.onPacket(payload, host, port),
      // also fires once right after creation, when nothing is pending
      drain: () => this.flush(),
      // Bun crashes the process without an `error` handler, so one is always
      // installed. It receives the error alone, despite the declared types.
      error: ((first: unknown, second?: unknown) => this.onNativeError(second === undefined ? first : second)) as any
    }
  }

  open(
    scopeIds: ReadonlyMap<string, number>,
    peer: DatagramSocket.NativeAddress | undefined,
    connected: boolean
  ): DatagramSocket.NativeHandle {
    const socket = this.socket!
    const bound = socket.address
    const stride = this.stride = connected ? 1 : 3
    return {
      address: { host: bound.address, port: bound.port },
      scopeIds: scopeIds === noScopeIds ? undefined : scopeIds,
      peer,
      connected,
      send: (payload, destination, done) => {
        if (this.pending.length !== 0) return this.waitOne(payload, connected ? undefined : destination, done)
        let sent: boolean
        try {
          sent = connected
            ? (socket as Bun.udp.ConnectedSocket<"buffer">).send(payload)
            : (socket as Bun.udp.Socket<"buffer">).send(payload, destination!.port, destination!.host)
        } catch (error) {
          return done(this.sendError(error))
        }
        if (sent) return done()
        this.waitOne(payload, connected ? undefined : destination, done)
      },
      sendMany: (payloads, destinations, done) => {
        const count = payloads.length
        let packets: ReadonlyArray<Uint8Array | string | number> = payloads
        if (!connected) {
          const flat = new Array<Uint8Array | string | number>(count * stride)
          for (let i = 0, j = 0; i < count; i++, j += stride) {
            const destination = destinations[i]!
            flat[j] = payloads[i]
            flat[j + 1] = destination.port
            flat[j + 2] = destination.host
          }
          packets = flat
        }
        if (this.pending.length !== 0) return this.wait(packets, count, 0, done)
        let sent: number
        try {
          sent = socket.sendMany(packets as any)
        } catch (error) {
          // Bun throws for the whole call, so no index is known
          return done(this.sendError(error))
        }
        if (sent === count) return done()
        this.wait(packets, count, sent, done)
      },
      joinMulticast: ({ group, interface: ingress, source }) =>
        Effect.try({
          try: () => {
            const groupHost = NetAddress.formatIp(group)
            const interfaceHost = ingress === undefined
              ? undefined
              : NetAddress.formatMulticastInterface(ingress, scopeIds, process.platform)
            if (source === undefined) {
              if (!socket.addMembership(groupHost, interfaceHost)) throw new Error(`Could not join ${groupHost}`)
              return () => Effect.sync(() => socket.dropMembership(groupHost, interfaceHost))
            }
            const sourceHost = NetAddress.formatIp(source)
            if (!socket.addSourceSpecificMembership(sourceHost, groupHost, interfaceHost)) {
              throw new Error(`Could not join ${groupHost} from ${sourceHost}`)
            }
            return () => Effect.sync(() => socket.dropSourceSpecificMembership(sourceHost, groupHost, interfaceHost))
          },
          catch: (error) => openError(error)
        }),
      close: () => this.close()
    }
  }

  // the retry list is only built when a send has to wait
  waitOne(
    payload: Uint8Array,
    destination: DatagramSocket.NativeAddress | undefined,
    done: (error?: DatagramSocket.DatagramSocketError) => void
  ) {
    this.wait(destination === undefined ? [payload] : [payload, destination.port, destination.host], 1, 0, done)
  }

  wait(
    packets: ReadonlyArray<Uint8Array | string | number>,
    count: number,
    sent: number,
    done: (error?: DatagramSocket.DatagramSocketError) => void
  ) {
    this.pending.push(new PendingSend(packets, count, sent, done))
  }

  // on `drain`, send what the kernel refused, in order, until it refuses again
  flush() {
    const socket = this.socket
    if (socket === undefined) return
    const stride = this.stride
    // `this.pending` is re-read on every turn: a failed send or a `done` that
    // closes the reader can close the socket, and `failPending` then replaces
    // the queue after completing every entry in it
    while (!this.closing && this.pending.length !== 0) {
      const pending = this.pending
      const next = pending[0]
      let sent: number
      try {
        sent = socket.sendMany(
          (next.sent === 0 ? next.packets : next.packets.slice(next.sent * stride)) as any
        )
      } catch (error) {
        pending.shift()
        next.done(this.sendError(error))
        continue
      }
      next.sent += sent
      if (next.sent < next.count) return
      pending.shift()
      next.done()
    }
  }

  sendError(error: unknown): DatagramSocket.DatagramSocketError {
    // on macOS and Windows a poll error closes the socket silently
    if (this.socket?.closed || isClosedError(error)) {
      this.closedUnderneath()
      return closedError()
    }
    return writeError(error)
  }

  onNativeError(error: unknown) {
    if (this.closing) return
    if (this.socket?.closed) return this.closedUnderneath()
    // an ICMP report, with no write left to fail
    this.events.onError(readError(error))
  }

  closedUnderneath() {
    if (this.closing) return
    this.closing = true
    this.failPending()
    this.events.onClose()
  }

  failPending() {
    const pending = this.pending
    if (pending.length === 0) return
    this.pending = []
    for (let i = 0; i < pending.length; i++) pending[i].done(closedError())
  }

  close() {
    if (this.closing) return
    this.closing = true
    this.failPending()
    try {
      this.socket?.close()
    } catch {
      // already closed
    }
  }
}
