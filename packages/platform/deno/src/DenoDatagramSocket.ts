/**
 * Deno UDP adapter for `effect/socket/DatagramSocket`, built on the native
 * `Deno.listenDatagram`.
 *
 * `make` opens a new `Deno.DatagramConn` for each reader acquisition,
 * `fromDatagramConn` adopts a connection the caller opens, and `layer`
 * provides the `DatagramSocket` service.
 *
 * `Deno.listenDatagram` is unstable. Run with `--unstable-net`, or add `"net"`
 * to the `"unstable"` list in `deno.json`. Without it, acquiring a reader fails
 * with a `DatagramSocketUnsupportedError`, and without `--allow-net` it fails
 * with a `DatagramSocketOpenError` of kind `"PermissionDenied"`.
 *
 * Compared with the Node and Bun adapters, Deno has no `connect`, no
 * source-specific multicast, and broadcast is always on. Received packets are
 * read into one reused 64 KiB buffer and copied out, so payloads are safe to
 * retain. On Linux a datagram larger than that buffer is silently truncated.
 *
 * The reader owns the native socket, so a send-only client must still acquire
 * a reader, or its writes wait forever. Every write waits for Deno's `send`
 * promise, so send errors fail the write that caused them.
 *
 * `writeAll` starts every send at once and waits for all of them. It fails
 * with the first send error; which of the other datagrams went out is
 * unspecified, nothing is resent, and the error carries the failed datagram's
 * `address`.
 *
 * **Example** (Echo server)
 *
 * ```ts
 * import { DenoDatagramSocket } from "@effect/platform-deno"
 * import { Effect } from "effect"
 *
 * const echo = Effect.gen(function*() {
 *   const socket = DenoDatagramSocket.make({ bind: { port: 9000 } })
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
 * **Example** (Send-only client)
 *
 * ```ts
 * import { DenoDatagramSocket } from "@effect/platform-deno"
 * import { Effect } from "effect"
 *
 * const send = (payload: string) =>
 *   Effect.gen(function*() {
 *     const socket = DenoDatagramSocket.make({
 *       peer: { address: "localhost", port: 9000 }
 *     })
 *     // writes wait for an open reader, even when nothing is read
 *     yield* socket.reader
 *     const writer = yield* socket.writer
 *     yield* writer.write({ payload })
 *   }).pipe(Effect.scoped)
 * ```
 *
 * **Example** (Multicast receiver and sender)
 *
 * ```ts
 * import { DenoDatagramSocket } from "@effect/platform-deno"
 * import { Effect } from "effect"
 * import { NetAddress } from "effect/net"
 *
 * const group = NetAddress.ipFromStringUnsafe("239.255.0.1")
 *
 * const receive = Effect.gen(function*() {
 *   if (!NetAddress.isMulticast(group) || !NetAddress.isIpv4Address(group)) return
 *   const socket = DenoDatagramSocket.make({
 *     bind: { address: "0.0.0.0", port: 5000 },
 *     reuseAddress: true
 *   })
 *   const reader = yield* socket.reader
 *   // the ingress interface: where the group's datagrams are received
 *   yield* reader.joinMulticast({ group, interface: NetAddress.ipv4Loopback })
 *   return yield* reader.pull
 * }).pipe(Effect.scoped)
 *
 * const announce = Effect.gen(function*() {
 *   const socket = DenoDatagramSocket.make({
 *     peer: { address: group, port: 5000 },
 *     multicast: { loopback: true }
 *   })
 *   yield* socket.reader
 *   const writer = yield* socket.writer
 *   yield* writer.write({ payload: "hello" })
 * }).pipe(Effect.scoped)
 * ```
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Effect from "effect/Effect"
import { constVoid } from "effect/Function"
import * as Layer from "effect/Layer"
import * as NetAddress from "effect/net/NetAddress"
import * as Result from "effect/Result"
import * as DatagramSocket from "effect/socket/DatagramSocket"

/**
 * An endpoint given in open-time options.
 *
 * **Details**
 *
 * Hostnames are allowed here, and are resolved once per reader acquisition
 * with `Deno.resolveDns`. An `InetAddress` satisfies this type, so it can be
 * passed as is.
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
 * Options for `make` and `layer`.
 *
 * **Details**
 *
 * `bind` defaults to `0.0.0.0` (or `::` for `family: "ipv6"`) and an
 * ephemeral port. `peer` is a default destination and doesn't filter senders;
 * Deno has no `connect`.
 *
 * The family is the explicit `family`, else the family of an IP literal in
 * `bind`, else the family of the `peer` address, else `"ipv4"`. A hostname
 * `peer` is resolved before binding, IPv4 first.
 *
 * `reuseAddress` means `SO_REUSEADDR` on Linux and `SO_REUSEPORT` on BSD and
 * macOS. `multicast.loopback` loops sent multicast datagrams back to the local
 * host. Deno has no egress multicast interface setting; the `interface` of
 * `Reader.joinMulticast` is the ingress interface, a different socket option.
 *
 * @stability unstable
 * @category options
 * @since 4.0.0
 */
export interface Options {
  readonly bind?: { readonly address?: string | NetAddress.IpAddress; readonly port?: number } | undefined
  readonly family?: "ipv4" | "ipv6" | undefined
  readonly peer?: Endpoint | undefined
  readonly reuseAddress?: boolean | undefined
  readonly multicast?: { readonly loopback?: boolean | undefined } | undefined
  readonly receiveBuffer?: DatagramSocket.ReceiveBufferOptions | undefined
  readonly onError?: ((error: DatagramSocket.DatagramSocketError) => void) | undefined
}

/**
 * Options for `fromDatagramConn`. The caller configures the adopted
 * connection, so only the options that live in JavaScript apply.
 *
 * @stability unstable
 * @category options
 * @since 4.0.0
 */
export type AdoptOptions = Pick<Options, "peer" | "receiveBuffer" | "onError">

/**
 * Creates a `DatagramSocket` that opens and binds a new `Deno.DatagramConn`
 * for each reader acquisition.
 *
 * **Details**
 *
 * Creating the socket never fails. Checking for `Deno.listenDatagram`,
 * binding and resolving names happen when a reader is acquired, and fail that
 * acquisition with a `DatagramSocketError`. Hostnames in `bind` and `peer` are
 * resolved once per acquisition, so no send waits for DNS.
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
 * Adopts a `Deno.DatagramConn`.
 *
 * **Details**
 *
 * `acquire` runs once per reader acquisition, inside the reader's scope, and
 * the adapter closes the connection when that scope ends. The adapter starts
 * reading as soon as `acquire` completes, so nothing else should read from the
 * connection.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const fromDatagramConn = (
  acquire: Effect.Effect<Deno.DatagramConn, DatagramSocket.DatagramSocketError>,
  options: AdoptOptions = {}
): DatagramSocket.DatagramSocket =>
  DatagramSocket.fromNativeHandle(
    (events) => Effect.flatMap(acquire, (conn) => adopt(conn, options, events)),
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

interface DenoError {
  readonly name?: unknown
  readonly code?: unknown
}

const familyOfLiteral = (address: string | NetAddress.IpAddress): Family | undefined => {
  if (typeof address !== "string") return NetAddress.isIpv4Address(address) ? "ipv4" : "ipv6"
  // hostnames never contain `:`, and an IPv6 literal may carry a zone
  if (address.includes(":")) return "ipv6"
  return Result.isSuccess(NetAddress.ipFromString(address)) ? "ipv4" : undefined
}

// `endpoint` may be a whole `InetAddress`, whose IPv6 scope must survive
const formatEndpoint = (endpoint: { readonly address?: string | NetAddress.IpAddress | undefined }) =>
  NetAddress.isInetAddress(endpoint)
    ? NetAddress.formatHost(endpoint)
    : endpoint.address === undefined || typeof endpoint.address === "string"
    ? endpoint.address
    : NetAddress.formatIp(endpoint.address)

const resolveRecord = async (name: string, type: "A" | "AAAA"): Promise<string | undefined> => {
  const records = await Deno.resolveDns(name, type)
  return records[0]
}

// Resolves a hostname, preferring IPv4 unless `family` is fixed. IP literals
// answer without a lookup.
const resolve = async (address: string, family: Family | undefined): Promise<Resolved> => {
  const literal = familyOfLiteral(address)
  if (literal !== undefined) return { host: address, family: literal }
  if (family !== "ipv6") {
    try {
      const host = await resolveRecord(address, "A")
      if (host !== undefined) return { host, family: "ipv4" }
    } catch (error) {
      if (family === "ipv4" || (error as DenoError)?.name === "NotCapable") throw error
    }
    if (family === "ipv4") throw new Error(`${address} has no IPv4 addresses`)
  }
  const host = await resolveRecord(address, "AAAA")
  if (host === undefined) throw new Error(`${address} has no addresses`)
  return { host, family: "ipv6" }
}

const openError = (
  error: unknown,
  kind?: DatagramSocket.DatagramSocketOpenError["kind"]
): DatagramSocket.DatagramSocketError => {
  const denoError = error as DenoError
  if (denoError?.name === "NotCapable") {
    kind = "PermissionDenied"
  } else if (kind === undefined) {
    const code = denoError?.code
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

const unsupportedError = (capability: string) =>
  new DatagramSocket.DatagramSocketError({
    reason: new DatagramSocket.DatagramSocketUnsupportedError({ capability, runtime: "Deno" })
  })

const ioKind = (error: unknown): DatagramSocket.IoErrorKind => {
  const denoError = error as DenoError
  switch (denoError?.code) {
    case "EMSGSIZE":
      return "MessageTooLarge"
    case "EHOSTUNREACH":
    case "ENETUNREACH":
    case "EHOSTDOWN":
    case "ENETDOWN":
      return "Unreachable"
    case "ECONNREFUSED":
    case "ECONNRESET":
      return "ConnectionRefused"
    case "EACCES":
    case "EPERM":
      return "PermissionDenied"
  }
  switch (denoError?.name) {
    case "NotCapable":
    case "PermissionDenied":
      return "PermissionDenied"
    case "ConnectionRefused":
    case "ConnectionReset":
      return "ConnectionRefused"
    default:
      return "Unknown"
  }
}

const isDatagramSocketError = (error: unknown): error is DatagramSocket.DatagramSocketError =>
  typeof error === "object" && error !== null && DatagramSocket.DatagramSocketErrorTypeId in error

const closedError = () =>
  new DatagramSocket.DatagramSocketError({ reason: new DatagramSocket.DatagramSocketClosedError() })

const writeError = (error: unknown): DatagramSocket.DatagramSocketError =>
  (error as DenoError)?.name === "BadResource"
    ? closedError()
    : new DatagramSocket.DatagramSocketError({
      reason: new DatagramSocket.DatagramSocketWriteError({ kind: ioKind(error), cause: error })
    })

const readError = (error: unknown): DatagramSocket.DatagramSocketError =>
  new DatagramSocket.DatagramSocketError({
    reason: new DatagramSocket.DatagramSocketReadError({ kind: ioKind(error), cause: error })
  })

const open = (
  options: Options,
  events: DatagramSocket.NativeEvents
): Effect.Effect<DatagramSocket.NativeHandle, DatagramSocket.DatagramSocketError> =>
  // checked per reader, not at module load, so the module imports without the flag
  typeof Deno.listenDatagram !== "function"
    ? Effect.fail(unsupportedError(
      `UDP sockets without --unstable-net (pass --unstable-net or add "net" to "unstable" in deno.json)`
    ))
    : Effect.callback((resume) => {
      openAsync(options, events).then(
        (handle) => resume(Effect.succeed(handle)),
        (error) => resume(Effect.fail(isDatagramSocketError(error) ? error : openError(error)))
      )
    })

const lookup = async (
  address: string | NetAddress.IpAddress | undefined,
  family: Family | undefined
): Promise<Resolved | undefined> => {
  if (typeof address !== "string") return undefined
  try {
    return await resolve(address, family)
  } catch (error) {
    throw openError(error, "AddressNotAvailable")
  }
}

// `resolveDns` can't be cancelled, and core never interrupts `open`
const openAsync = async (
  options: Options,
  events: DatagramSocket.NativeEvents
): Promise<DatagramSocket.NativeHandle> => {
  const peer = options.peer
  const fixed = options.family ??
    (options.bind?.address === undefined ? undefined : familyOfLiteral(options.bind.address))
  const resolvedPeer = await lookup(peer?.address, fixed)
  const peerFamily = resolvedPeer?.family ?? (peer === undefined ? undefined : familyOfLiteral(peer.address))
  const resolvedBind = await lookup(options.bind?.address, fixed ?? peerFamily)
  const family = fixed ?? peerFamily ?? resolvedBind?.family ?? "ipv4"
  const hostname = resolvedBind?.host ??
    (options.bind === undefined ? undefined : formatEndpoint(options.bind)) ??
    (family === "ipv6" ? "::" : "0.0.0.0")
  let conn: Deno.DatagramConn
  try {
    conn = Deno.listenDatagram({
      transport: "udp",
      hostname,
      port: options.bind?.port ?? 0,
      reuseAddress: options.reuseAddress ?? false,
      loopback: options.multicast?.loopback ?? false
    })
  } catch (error) {
    throw openError(error)
  }
  return new NativeConn(conn, events).open(
    peer === undefined ? undefined : { host: resolvedPeer?.host ?? formatEndpoint(peer)!, port: peer.port }
  )
}

const adopt = (
  conn: Deno.DatagramConn,
  options: AdoptOptions,
  events: DatagramSocket.NativeEvents
): Effect.Effect<DatagramSocket.NativeHandle, DatagramSocket.DatagramSocketError> => {
  const peer = options.peer
  if (peer === undefined || typeof peer.address !== "string") {
    return Effect.sync(() =>
      new NativeConn(conn, events).open(
        peer === undefined ? undefined : { host: formatEndpoint(peer)!, port: peer.port }
      )
    )
  }
  return Effect.callback((resume) => {
    const address = conn.addr as Deno.NetAddr
    resolve(peer.address as string, address.hostname.includes(":") ? "ipv6" : "ipv4").then(
      (resolved) => resume(Effect.succeed(new NativeConn(conn, events).open({ host: resolved.host, port: peer.port }))),
      (error) => {
        try {
          conn.close()
        } catch {
          // already closed
        }
        resume(Effect.fail(openError(error, "AddressNotAvailable")))
      }
    )
  })
}

// One `receive` in flight at a time, since concurrent receives reorder packets
const receiveBufferSize = 65536

class NativeConn {
  readonly conn: Deno.DatagramConn
  readonly events: DatagramSocket.NativeEvents
  readonly buffer = new Uint8Array(receiveBufferSize)
  closing = false
  // set once a send has completed, so the socket's write readiness is known
  ready = false
  // the last destination, reused while consecutive sends share it
  lastAddr: Deno.NetAddr | undefined = undefined

  constructor(conn: Deno.DatagramConn, events: DatagramSocket.NativeEvents) {
    this.conn = conn
    this.events = events
  }

  receive() {
    try {
      this.conn.receive(this.buffer).then(this.onReceive, this.onReceiveError)
    } catch (error) {
      this.onReceiveError(error)
    }
  }

  readonly onReceive = (received: [Uint8Array, Deno.Addr]) => {
    if (this.closing) return
    // the buffer is reused, so each packet is copied out
    const addr = received[1] as Deno.NetAddr
    this.events.onPacket(received[0].slice(), addr.hostname, addr.port)
    // a woken pull may have closed the reader
    if (!this.closing) this.receive()
  }

  readonly onReceiveError = (error: unknown) => {
    if (this.closing) return
    switch ((error as DenoError)?.name) {
      // a pending receive is interrupted by a close, and the next one then
      // reports the closed socket
      case "Interrupted":
        return this.receive()
      case "BadResource":
        return this.events.onClose()
      // ICMP reports, as Windows raises them on unconnected sockets
      case "ConnectionReset":
      case "ConnectionRefused":
        this.events.onError(readError(error))
        return this.receive()
      default:
        return this.events.onReadError(readError(error))
    }
  }

  addrOf(destination: DatagramSocket.NativeAddress): Deno.NetAddr {
    const last = this.lastAddr
    if (last !== undefined && last.hostname === destination.host && last.port === destination.port) return last
    return this.lastAddr = { transport: "udp", hostname: destination.host, port: destination.port }
  }

  send(payload: Uint8Array, destination: DatagramSocket.NativeAddress | undefined): Promise<number> {
    if (destination === undefined) return Promise.reject(new Error("DatagramSocket write has no destination"))
    try {
      return this.conn.send(payload, this.addrOf(destination))
    } catch (error) {
      return Promise.reject(error)
    }
  }

  // the batch from `start` goes out at once and resumes once every send settles
  sendAll(
    payloads: ReadonlyArray<Uint8Array>,
    destinations: ReadonlyArray<DatagramSocket.NativeAddress | undefined>,
    start: number,
    done: (error?: DatagramSocket.DatagramSocketError, index?: number) => void
  ) {
    let remaining = payloads.length - start
    let failure: DatagramSocket.DatagramSocketError | undefined
    let failedAt: number | undefined
    const report = () => {
      if (--remaining === 0) done(failure, failedAt)
    }
    for (let i = start; i < payloads.length; i++) {
      this.send(payloads[i], destinations[i]).then(report, (error) => {
        if (failure === undefined) {
          failure = writeError(error)
          failedAt = i
        }
        report()
      })
    }
  }

  open(peer: DatagramSocket.NativeAddress | undefined): DatagramSocket.NativeHandle {
    const conn = this.conn
    const bound = conn.addr as Deno.NetAddr
    this.receive()
    return {
      address: { host: bound.hostname, port: bound.port },
      peer,
      connected: false,
      send: (payload, destination, done) => {
        this.send(payload, destination).then(() => {
          this.ready = true
          done()
        }, (error) => done(writeError(error)))
      },
      sendMany: (payloads, destinations, done) => {
        if (this.ready) return this.sendAll(payloads, destinations, 0, done)
        // Until the socket's first writability event, Deno parks every send
        // and completes concurrent ones in reverse order, so a fresh socket
        // sends the first datagram on its own
        this.send(payloads[0], destinations[0]).then(() => {
          this.ready = true
          if (payloads.length === 1) return done()
          this.sendAll(payloads, destinations, 1, done)
        }, (error) => done(writeError(error), 0))
      },
      joinMulticast: ({ group, interface: ingress, source }) => {
        if (source !== undefined) return Effect.fail(unsupportedError("source-specific multicast"))
        return Effect.tryPromise({
          try: () =>
            NetAddress.isIpv4Address(group)
              ? conn.joinMulticastV4(
                NetAddress.formatIp(group),
                ingress === undefined ? "0.0.0.0" : NetAddress.formatIp(ingress as NetAddress.Ipv4Address)
              )
              : conn.joinMulticastV6(NetAddress.formatIp(group), (ingress as number | undefined) ?? 0),
          catch: (error) => openError(error)
        }).pipe(
          Effect.map((membership) => () => Effect.promise(() => membership.leave().then(constVoid, constVoid)))
        )
      },
      close: () => this.close()
    }
  }

  close() {
    if (this.closing) return
    this.closing = true
    try {
      this.conn.close()
    } catch {
      // already closed
    }
  }
}
