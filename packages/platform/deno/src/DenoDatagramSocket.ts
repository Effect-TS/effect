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
 * `writeAll` sends one datagram at a time, waiting for each send to complete
 * before starting the next. On failure it stops without sending the remaining
 * datagrams; earlier sends are not rolled back or resent, and the error carries
 * the failed datagram's `address`. Send order does not guarantee UDP arrival
 * order.
 *
 * On Windows, ICMP connection resets or refusals reported by `receive` are
 * passed to `onError` and reading continues.
 *
 * **Example** (Echo server)
 *
 * ```ts
 * import { DenoDatagramSocket } from "@effect/platform-deno"
 * import { Effect } from "effect"
 *
 * const echo = Effect.gen(function*() {
 *   const socket = yield* DenoDatagramSocket.make({ bind: { port: 9000 } })
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
 *     const socket = yield* DenoDatagramSocket.make({
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
 *   const socket = yield* DenoDatagramSocket.make({
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
 *   const socket = yield* DenoDatagramSocket.make({
 *     // Deno has no egress `multicast.interface` option, so the bind address
 *     // picks the interface the group's datagrams leave through
 *     bind: { address: "127.0.0.1" },
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
import * as Shared from "@effect/platform-node-shared/NodeDatagramSocket"
import * as Effect from "effect/Effect"
import { constVoid } from "effect/Function"
import * as Layer from "effect/Layer"
import * as NetAddress from "effect/net/NetAddress"
import type * as Scope from "effect/Scope"
import * as DatagramSocket from "effect/socket/DatagramSocket"

/**
 * An endpoint given in open-time options.
 *
 * **Details**
 *
 * Hostnames are allowed here, and are resolved once per reader acquisition
 * with `node:dns` `lookup` (the system resolver). An `InetAddress` satisfies
 * this type, so it can be passed as is.
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
 * `bind`, else the family of the `peer` address (resolved first if it is a
 * hostname), else the family a `bind` hostname resolves to, else `"ipv4"`. A
 * hostname lookup is limited to the family already fixed at that point: `peer`
 * by `family` or a `bind` literal, and `bind` by those or the `peer` family.
 * Otherwise IPv4 is preferred.
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
 * A `receiveBuffer.capacity` below 1, a fractional one or `Infinity` is a
 * defect.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = (options: Options = {}): Effect.Effect<DatagramSocket.DatagramSocket> =>
  DatagramSocket.fromNativeHandle((events) => open(options, events), options)

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
export const fromDatagramConn = <R>(
  acquire: Effect.Effect<Deno.DatagramConn, DatagramSocket.DatagramSocketError, R>,
  options: AdoptOptions = {}
): Effect.Effect<DatagramSocket.DatagramSocket, never, Exclude<R, Scope.Scope>> =>
  DatagramSocket.fromNativeHandle((events) => Effect.flatMap(acquire, (conn) => adopt(conn, options, events)), options)

/**
 * Provides a `DatagramSocket` built with `make`.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer = (options: Options = {}): Layer.Layer<DatagramSocket.DatagramSocket> =>
  Layer.effect(DatagramSocket.DatagramSocket, make(options))

// -----------------------------------------------------------------------------
// internal
// -----------------------------------------------------------------------------

interface DenoError {
  readonly name?: unknown
  readonly code?: unknown
}

const openError = (
  error: unknown,
  kind?: DatagramSocket.DatagramSocketOpenError["kind"]
): DatagramSocket.DatagramSocketError =>
  Shared.openError(error, (error as DenoError)?.name === "NotCapable" ? "PermissionDenied" : kind)

// DNS lookup reports a missing Deno net permission as EPERM, not NotCapable.
const lookupOpenError = (error: unknown) => {
  const code = (error as DenoError)?.code
  return openError(error, code === "EPERM" || code === "EACCES" ? "PermissionDenied" : "AddressNotAvailable")
}

const unsupportedError = (capability: string) =>
  new DatagramSocket.DatagramSocketError({
    reason: new DatagramSocket.DatagramSocketUnsupportedError({ capability, runtime: "Deno" })
  })

// Node's errno kinds, then Deno's error names
const ioKind = (error: unknown): DatagramSocket.IoErrorKind => {
  const kind = Shared.ioKind(error)
  if (kind !== "Unknown") return kind
  const denoError = error as DenoError
  if (denoError?.code === "ECONNRESET") return "ConnectionRefused"
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

const writeError = (error: unknown): DatagramSocket.DatagramSocketError =>
  (error as DenoError)?.name === "BadResource" ? Shared.closedError() : Shared.ioWriteError(error, ioKind(error))

const readError = (error: unknown): DatagramSocket.DatagramSocketError => Shared.readError(error, ioKind(error))

// Deno has no interface names to map, so IPv6 zones stay numeric
const noScopeIds = () => Shared.noScopeIds

const open = (
  options: Options,
  events: DatagramSocket.NativeEvents
): Effect.Effect<DatagramSocket.NativeHandle, DatagramSocket.DatagramSocketError> =>
  // checked per reader, not at module load, so the module imports without the flag
  typeof Deno.listenDatagram !== "function"
    ? Effect.fail(unsupportedError(
      `UDP sockets without --unstable-net (pass --unstable-net or add "net" to "unstable" in deno.json)`
    ))
    // `lookup` can't be cancelled, and core never interrupts `open`
    : Effect.callback((resume) => {
      Shared.planOpen(
        { family: options.family, bind: options.bind, remote: options.peer },
        noScopeIds,
        (error) => resume(Effect.fail(lookupOpenError(error))),
        (plan) => {
          let conn: Deno.DatagramConn
          try {
            conn = Deno.listenDatagram({
              transport: "udp",
              hostname: plan.bindHost,
              port: options.bind?.port ?? 0,
              reuseAddress: options.reuseAddress ?? false,
              loopback: options.multicast?.loopback ?? false
            })
          } catch (error) {
            return resume(Effect.fail(openError(error)))
          }
          resume(Effect.succeed(new NativeConn(conn, events).open(plan.remote)))
        }
      )
    })

const adopt = (
  conn: Deno.DatagramConn,
  options: AdoptOptions,
  events: DatagramSocket.NativeEvents
): Effect.Effect<DatagramSocket.NativeHandle, DatagramSocket.DatagramSocketError> =>
  Effect.callback((resume) => {
    const family: Shared.Family = (conn.addr as Deno.NetAddr).hostname.includes(":") ? "ipv6" : "ipv4"
    Shared.resolvePeer(
      options.peer,
      family,
      Shared.noScopeIds,
      (error) => {
        try {
          conn.close()
        } catch {
          // already closed
        }
        resume(Effect.fail(lookupOpenError(error)))
      },
      (peer) => resume(Effect.succeed(new NativeConn(conn, events).open(peer)))
    )
  })

// One `receive` in flight at a time, since concurrent receives reorder packets
const receiveBufferSize = 65536

class NativeConn {
  readonly conn: Deno.DatagramConn
  readonly events: DatagramSocket.NativeEvents
  readonly buffer = new Uint8Array(receiveBufferSize)
  closing = false
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

  // Await each send before submitting the next, including on a warm socket.
  async sendAll(
    payloads: ReadonlyArray<Uint8Array>,
    destinations: ReadonlyArray<DatagramSocket.NativeAddress | undefined>,
    done: (error?: DatagramSocket.DatagramSocketError, index?: number) => void
  ) {
    for (let i = 0; i < payloads.length; i++) {
      try {
        await this.send(payloads[i], destinations[i])
      } catch (error) {
        done(writeError(error), i)
        return
      }
    }
    done()
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
        this.send(payload, destination).then(() => done(), (error) => done(writeError(error)))
      },
      sendMany: (payloads, destinations, done) => {
        void this.sendAll(payloads, destinations, done)
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
