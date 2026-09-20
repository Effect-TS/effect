/**
 * Node.js UDP sockets for Effect's datagram socket API.
 *
 * Socket acquisition scopes own native sockets. Calling fibers own receive and send
 * operations; interrupting one leaves the endpoint open.
 * Incoming packets are buffered within the configured packet and byte limits,
 * including while no receive is waiting. Overflow and oversized incoming packets
 * are dropped. Incoming packets with unrepresentable source addresses are also
 * dropped. Terminal native receive errors terminate reading until the socket is
 * released, while recoverable `recvmsg` network errors are dropped and reception
 * continues. Outgoing payloads are copied during execution, before submission,
 * so callers must keep inputs stable until that execution settles. An already
 * submitted native send may finish later using its copy. Successful writes confirm
 * only local acceptance, not remote delivery. The `node:dgram` API has no native
 * multi-datagram submission operation, so grouped writes use the core sequential
 * implementation. In particular, associated UDP can
 * report a peer's temporary absence as a recoverable receive drop; delivery is
 * never guaranteed. Under Deno, peer association is user-space filtering because
 * its `node:dgram` compatibility layer does not perform a kernel connect.
 *
 * @since 4.0.0
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Result from "effect/Result"
import type * as Scope from "effect/Scope"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Datagram from "effect/unstable/socket/DatagramSocket"
import * as Dgram from "node:dgram"
import * as Os from "node:os"
import * as Process from "node:process"

/**
 * Acquires a bound Node.js UDP socket owned by the current scope.
 *
 * @see {@link connect} for sockets associated with one peer
 * @category constructors
 * @since 4.0.0
 */
export const bind = <L extends NetAddress.InetAddress>(options: Datagram.BindOptions<L>): Effect.Effect<
  Datagram.Unassociated<Datagram.FamilyOf<L>>,
  Datagram.DatagramSocketError,
  Scope.Scope
> => Datagram.fromTransport(options, (handlers) => open(options, handlers))

/**
 * Acquires a bound, peer-associated Node.js UDP socket owned by the current scope.
 *
 * **Details**
 *
 * The peer must have a nonzero port and a specified IP address. Association
 * filters incoming packets to that peer without performing a handshake.
 *
 * @see {@link bind} for sockets that send to multiple destinations
 * @category constructors
 * @since 4.0.0
 */
export const connect = <L extends NetAddress.InetAddress>(options: Datagram.ConnectOptions<L>): Effect.Effect<
  Datagram.Associated<Datagram.FamilyOf<L>>,
  Datagram.DatagramSocketError,
  Scope.Scope
> => Datagram.fromAssociatedTransport(options, (handlers) => open(options, handlers, options.remote))

/**
 * Layer that provides Node.js UDP binding and peer association through the
 * datagram socket factory.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Datagram.DatagramSocketFactory> = Layer.succeed(Datagram.DatagramSocketFactory, {
  bind,
  connect
})

const open = Effect.fnUntraced(function*<L extends NetAddress.InetAddress>(
  options: Datagram.BindOptions<L>,
  handlers: Datagram.Handlers<Datagram.FamilyOf<L>>,
  remote?: Datagram.Inet<Datagram.FamilyOf<L>>
): Effect.fn.Return<Datagram.Binding<Datagram.FamilyOf<L>>, Datagram.DatagramSocketError, Scope.Scope> {
  const { localAddress } = options
  const platform = currentPlatform()
  let scopeIds = yield* Effect.try({
    try: readScopeIds,
    catch: openError
  })
  const hasScopeId = (index: number): boolean => {
    for (const scopeId of scopeIds.values()) {
      if (scopeId === index) return true
    }
    return false
  }
  const ensureScopeId = (index: number) => {
    if (platform === "win32" || index === 0 || hasScopeId(index)) return
    scopeIds = readScopeIds()
    if (!hasScopeId(index)) throw new Error(`Cannot resolve IPv6 interface index ${index}`)
  }
  const formatNativeHost = (address: NetAddress.InetAddress): string => {
    if (NetAddress.isInetAddressV6(address)) ensureScopeId(address.scopeId)
    return NetAddress.formatNativeHost(address, scopeIds, platform)
  }
  const formatMulticastInterface = (networkInterface: NetAddress.Ipv4Address | number): string => {
    if (typeof networkInterface === "number") ensureScopeId(networkInterface)
    return NetAddress.formatMulticastInterface(networkInterface, scopeIds, platform)
  }
  const membershipArgs = (group: NetAddress.MulticastAddress, options: Datagram.MembershipOptions) => ({
    address: NetAddress.formatIp(group),
    // Membership omits the default index; the outgoing interface setter formats it as "::".
    networkInterface: options.interface === undefined || options.interface === 0
      ? undefined
      : formatMulticastInterface(options.interface),
    source: options.source === undefined ? undefined : NetAddress.formatIp(options.source)
  })
  // This is a point-in-time interface snapshot, not a stable OS identity. On
  // Unix, a missing positive index is refreshed once and then rejected: libuv
  // silently treats an unresolved numeric zone as the default interface.
  let nativeClosed = false
  const create = Effect.try({
    catch: openError,
    try: () => {
      const type = NetAddress.isIpv4Address(localAddress.address) ? "udp4" : "udp6"
      return Dgram.createSocket({
        type,
        reuseAddr: options.reuseAddress === true,
        ipv6Only: options.ipv6Only === true
      }).once("close", () => {
        nativeClosed = true
      }).on("error", (cause) => {
        if (!isRecoverableReceiveError(cause)) handlers.onError(cause)
      })
    }
  })

  const socket = yield* Effect.acquireRelease(create, (socket) =>
    Effect.callback<void>((resume) => {
      const finish = () => {
        socket.removeAllListeners()
        resume(Effect.void)
      }
      if (nativeClosed) {
        finish()
        return
      }
      try {
        socket.close(finish)
      } catch (cause) {
        if (isSocketNotRunning(cause)) finish()
        else {
          socket.removeAllListeners()
          resume(Effect.die(cause))
        }
      }
    }))

  yield* awaitOpen(socket, "listening", () => {
    return socket.bind({
      address: formatNativeHost(localAddress),
      port: localAddress.port,
      exclusive: true
    })
  })

  if (options.broadcast === true) {
    yield* Effect.try({ try: () => socket.setBroadcast(true), catch: openError })
  }

  if (remote !== undefined) {
    yield* awaitOpen(socket, "connect", () => {
      return socket.connect(remote.port, formatNativeHost(remote))
    })
  }

  const address = yield* Effect.try({
    try: () => {
      const { address, port } = socket.address()
      const parsed = Result.getOrThrow(NetAddress.inetAddressFromHostString(address, port, scopeIds))
      if (parsed._tag !== localAddress._tag) throw new Error("Native socket reported an unexpected address family")
      return parsed as Datagram.Inet<Datagram.FamilyOf<L>>
    },
    catch: openError
  })

  // Connected sockets must not buffer packets received before association.
  socket.on("message", (data, info) => {
    const source = NetAddress.inetAddressFromHostString(info.address, info.port, scopeIds)
    if (Result.isFailure(source)) return
    if (source.success._tag !== localAddress._tag) return
    const retained = data.byteLength === data.buffer.byteLength ? data : Uint8Array.from(data)
    handlers.onMessage(retained, source.success as Datagram.Inet<Datagram.FamilyOf<L>>)
  })

  const send = Effect.effectify(
    (
      packet: Datagram.Packet<Datagram.FamilyOf<L>>,
      callback: (cause: Error | null, bytes: number) => void
    ) => {
      if (remote === undefined) {
        socket.send(packet.data, packet.peer.port, formatNativeHost(packet.peer), callback)
      } else {
        socket.send(packet.data, callback)
      }
    },
    writeError,
    writeError
  )

  return {
    address,
    send: (packet) => Effect.asVoid(send(packet)),
    setBroadcast: (enabled) =>
      Effect.try({
        try: () => {
          socket.setBroadcast(enabled)
        },
        catch: (cause) => configurationError("setBroadcast", cause)
      }),
    setMulticastInterface: (networkInterface) =>
      Effect.try({
        try: () => socket.setMulticastInterface(formatMulticastInterface(networkInterface)),
        catch: (cause) => configurationError("setMulticastInterface", cause)
      }),
    addMembership: (group, options) =>
      Effect.try({
        try: () => {
          const { address, networkInterface, source } = membershipArgs(group, options)
          if (source === undefined) socket.addMembership(address, networkInterface)
          else socket.addSourceSpecificMembership(source, address, networkInterface)
        },
        catch: (cause) => configurationError("addMembership", cause)
      }),
    dropMembership: (group, options) =>
      Effect.try({
        try: () => {
          const { address, networkInterface, source } = membershipArgs(group, options)
          if (source === undefined) socket.dropMembership(address, networkInterface)
          else socket.dropSourceSpecificMembership(source, address, networkInterface)
        },
        catch: (cause) => configurationError("dropMembership", cause)
      })
  }
})

const awaitOpen = (socket: Dgram.Socket, event: "listening" | "connect", start: () => void) =>
  Effect.callback<void, Datagram.DatagramSocketError>((resume) => {
    const cleanup = () => {
      socket.off("error", onError)
      socket.off(event, onReady)
    }

    const finish = (result: Effect.Effect<void, Datagram.DatagramSocketError>) => {
      cleanup()
      resume(result)
    }

    const onError = (cause: unknown) => finish(Effect.fail(openError(cause)))
    const onReady = () => finish(Effect.void)
    socket.once("error", onError)
    socket.once(event, onReady)

    try {
      start()
    } catch (cause) {
      onError(cause)
    }

    return Effect.sync(cleanup)
  })

const openError = (cause: unknown) =>
  new Datagram.DatagramSocketError({
    reason: new Datagram.DatagramSocketOpenError({ cause })
  })

const writeError = (cause: unknown, [packet]: [Datagram.Packet]) =>
  new Datagram.DatagramSocketError({
    reason: new Datagram.DatagramSocketWriteError({ cause, destination: packet.peer, accepted: 0 })
  })

const configurationError = (
  operation: "setBroadcast" | "setMulticastInterface" | "addMembership" | "dropMembership",
  cause: unknown
) =>
  new Datagram.DatagramSocketError({
    reason: new Datagram.DatagramSocketConfigurationError({ operation, cause })
  })

const isRecoverableReceiveError = (cause: unknown): boolean => {
  if (typeof cause !== "object" || cause === null) return false
  const error = cause as { readonly code?: unknown; readonly syscall?: unknown }
  if (error.syscall !== "recvmsg") return false
  return error.code === "ECONNREFUSED" || error.code === "EHOSTUNREACH" ||
    error.code === "ENETUNREACH" || error.code === "EMSGSIZE"
}

const readScopeIds = () => NetAddress.scopeIdsFromInterfaces(Object.entries(Os.networkInterfaces()))

const currentPlatform = (): NodeJS.Platform => globalThis.process?.platform ?? Process.platform

const isSocketNotRunning = (cause: unknown): boolean =>
  typeof cause === "object" && cause !== null &&
  "code" in cause && cause.code === "ERR_SOCKET_DGRAM_NOT_RUNNING"
