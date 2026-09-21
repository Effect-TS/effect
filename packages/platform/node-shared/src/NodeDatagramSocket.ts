/**
 * Node.js UDP sockets for Effect's datagram socket API.
 *
 * **Details**
 *
 * The adapter is shared by Node, Deno, and Bun through `node:dgram`. Acquisition
 * scopes own native sockets while calling fibers own receive and send
 * operations. Incoming packets are bounded by the configured count, byte, and
 * size limits. Outgoing payloads are copied immediately before their
 * one-at-a-time native submissions; successful writes confirm local acceptance,
 * not delivery.
 *
 * Recoverable receive codes `ECONNREFUSED`, `EHOSTUNREACH`, `ENETUNREACH`,
 * and `EMSGSIZE` are dropped; other native receive errors terminate reading
 * after buffered packets drain. Under Deno, association uses core-side peer
 * filtering because its compatibility layer does not perform a kernel connect.
 * Runtime-reported IPv6 scope identifiers are preserved: Node commonly reports
 * the requested index, while Deno and Bun may report `0`.
 *
 * @since 4.0.0
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Result from "effect/Result"
import * as Scope from "effect/Scope"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Datagram from "effect/unstable/socket/DatagramSocket"
import * as Dgram from "node:dgram"
import * as Os from "node:os"

const isDeno = "Deno" in globalThis
const recoverableCodes = new Set(["ECONNREFUSED", "EHOSTUNREACH", "ENETUNREACH", "EMSGSIZE"])

const isRecoverableReceiveError = (cause: NodeJS.ErrnoException) =>
  cause.syscall === "recvmsg" && recoverableCodes.has(cause.code ?? "")

const wrap = (reason: Datagram.DatagramSocketErrorReason) => new Datagram.DatagramSocketError({ reason })
const openError = (cause: unknown) => wrap(new Datagram.DatagramSocketOpenError({ cause }))
const writeError = (cause: unknown, destination: NetAddress.InetAddress) =>
  wrap(new Datagram.DatagramSocketWriteError({ cause, destination, accepted: 0 }))
const configurationError = (
  operation: "setBroadcast" | "setMulticastInterface" | "addMembership" | "dropMembership",
  cause: unknown
) => wrap(new Datagram.DatagramSocketConfigurationError({ operation, cause }))

const networkInterfaces = () => NetAddress.scopeIdsFromInterfaces(Object.entries(Os.networkInterfaces()))

const hasScopeId = (scopeIds: ReadonlyMap<string, number>, scopeId: number) => {
  for (const value of scopeIds.values()) if (value === scopeId) return true
  return false
}

const acquire =
  <L extends NetAddress.InetAddress>(options: Datagram.BindOptions<L> | Datagram.ConnectOptions<L>) =>
  (handlers: Datagram.Handlers<Datagram.FamilyOf<L>>): Effect.Effect<
    Datagram.Binding<Datagram.FamilyOf<L>>,
    Datagram.DatagramSocketError,
    Scope.Scope
  > =>
    Effect.uninterruptibleMask(Effect.fnUntraced(function*(restore) {
      type A = Datagram.FamilyOf<L>
      const scope = yield* Effect.scope
      const family = NetAddress.isInetAddressV4(options.localAddress) ? "udp4" : "udp6"
      let socket: Dgram.Socket
      try {
        socket = Dgram.createSocket({
          type: family,
          reuseAddr: options.reuseAddress ?? false,
          ipv6Only: options.ipv6Only ?? false
        })
      } catch (cause) {
        return yield* Effect.fail(openError(cause))
      }

      let scopeIds: Map<string, number>
      try {
        scopeIds = networkInterfaces()
      } catch (cause) {
        socket.close()
        return yield* Effect.fail(openError(cause))
      }

      let released = false
      let nativeRunning = false
      let nativeClosed = false
      let acquisitionInFlight = false
      let nativeConnected = false
      const pending = new Set<(cause: unknown) => void>()
      const closedCause = new Error("Datagram socket closed")
      let cleanupComplete: ((effect: Effect.Effect<void>) => void) | undefined

      const settlePending = (cause: unknown) => {
        for (const settle of pending) settle(cause)
      }

      const finishCleanup = (effect: Effect.Effect<void> = Effect.void) => {
        const complete = cleanupComplete
        if (complete === undefined) return
        cleanupComplete = undefined
        socket.removeAllListeners()
        complete(effect)
      }

      const closeNative = () => {
        if (nativeClosed) return finishCleanup()
        try {
          socket.close()
        } catch (cause) {
          if ((cause as NodeJS.ErrnoException)?.code === "ERR_SOCKET_DGRAM_NOT_RUNNING") {
            if (!acquisitionInFlight) finishCleanup()
            return
          }
          finishCleanup(Effect.die(cause))
        }
      }

      function onListening() {
        nativeRunning = true
        acquisitionInFlight = false
        if (released) closeNative()
      }

      function onClose() {
        nativeRunning = false
        nativeClosed = true
        acquisitionInFlight = false
        settlePending(closedCause)
        if (released) finishCleanup()
        else handlers.onError(closedCause)
      }

      function onError(cause: NodeJS.ErrnoException) {
        if (acquisitionInFlight) {
          acquisitionInFlight = false
          if (released && !nativeRunning) finishCleanup()
          return
        }
        if (released || isRecoverableReceiveError(cause)) return
        socket.off("message", onMessage)
        handlers.onError(cause)
      }

      function parsePeer(host: string, port: number): Datagram.Inet<A> | undefined {
        let parsed = NetAddress.inetAddressFromHostString(host, port, scopeIds)
        if (Result.isFailure(parsed)) {
          try {
            scopeIds = networkInterfaces()
            parsed = NetAddress.inetAddressFromHostString(host, port, scopeIds)
          } catch {
            return undefined
          }
        }
        if (Result.isFailure(parsed)) return undefined
        let peer = parsed.success
        if (family === "udp6" && NetAddress.isInetAddressV4(peer)) {
          peer = Result.getOrThrow(NetAddress.inetAddressV6(NetAddress.toIpv4Mapped(peer.address), peer.port))
        }
        if (family === "udp4" && !NetAddress.isInetAddressV4(peer)) return undefined
        return peer as Datagram.Inet<A>
      }

      function onMessage(message: Buffer, info: Dgram.RemoteInfo) {
        const peer = parsePeer(info.address, info.port)
        if (peer === undefined) return
        const data = message.byteLength === message.buffer.byteLength
          ? new Uint8Array(message.buffer)
          : new Uint8Array(message)
        handlers.onMessage(data, peer)
      }

      socket.on("listening", onListening)
      socket.on("message", onMessage)
      socket.on("error", onError)
      socket.on("close", onClose)

      // This finalizer is registered before bind/connect. It synchronously settles
      // all Effect callbacks, then waits for native cleanup. A late `listening`
      // event retries close, so an interrupted bind cannot leak a late resource.
      yield* Scope.addFinalizer(
        scope,
        Effect.callback<void>((resume) => {
          released = true
          settlePending(closedCause)
          cleanupComplete = resume
          closeNative()
        })
      )
      if (released) return yield* Effect.fail(openError(closedCause))

      const ensureScope = (scopeId: number) => {
        if (process.platform === "win32" || scopeId === 0 || hasScopeId(scopeIds, scopeId)) return
        scopeIds = networkInterfaces()
        if (!hasScopeId(scopeIds, scopeId)) throw new Error(`Unknown IPv6 interface index: ${scopeId}`)
      }

      const nativeHost = (address: NetAddress.InetAddress) => {
        if (NetAddress.isInetAddressV6(address)) ensureScope(address.scopeId)
        return NetAddress.formatNativeHost(address, scopeIds, process.platform)
      }

      const awaitNative = (
        event: "listening" | "connect",
        start: () => void
      ): Effect.Effect<void, Datagram.DatagramSocketError> =>
        Effect.callback((resume) => {
          let active = true
          const finish = (effect: Effect.Effect<void, Datagram.DatagramSocketError>) => {
            if (!active) return
            active = false
            pending.delete(settle)
            socket.off(event, succeed)
            socket.off("error", fail)
            resume(effect)
          }
          const settle = (cause: unknown) => finish(Effect.fail(openError(cause)))
          const succeed = () => finish(Effect.void)
          const fail = (cause: unknown) => finish(Effect.fail(openError(cause)))
          pending.add(settle)
          socket.once(event, succeed)
          socket.once("error", fail)
          acquisitionInFlight = true
          try {
            start()
          } catch (cause) {
            acquisitionInFlight = false
            finish(Effect.fail(openError(cause)))
          }
          return Effect.sync(() => {
            active = false
            pending.delete(settle)
            socket.off(event, succeed)
            socket.off("error", fail)
          })
        })

      let localHost: string
      try {
        localHost = nativeHost(options.localAddress)
      } catch (cause) {
        return yield* Effect.fail(openError(cause))
      }
      yield* restore(awaitNative("listening", () => socket.bind(options.localAddress.port, localHost)))

      if (options.broadcast === true) {
        try {
          socket.setBroadcast(true)
        } catch (cause) {
          return yield* Effect.fail(openError(cause))
        }
      }

      const remote = "remote" in options ? options.remote as NetAddress.InetAddress : undefined
      if (remote !== undefined && !isDeno) {
        let host: string
        try {
          host = nativeHost(remote)
        } catch (cause) {
          return yield* Effect.fail(openError(cause))
        }
        yield* restore(awaitNative("connect", () => socket.connect(remote.port, host)))
        nativeConnected = true
      }

      let address: NetAddress.InetAddress
      try {
        const reported = socket.address()
        const parsed = NetAddress.inetAddressFromHostString(reported.address, reported.port, scopeIds)
        if (Result.isFailure(parsed)) throw parsed.failure
        address = parsed.success
      } catch (cause) {
        return yield* Effect.fail(openError(cause))
      }

      const send = (packet: Datagram.Packet<A>): Effect.Effect<void, Datagram.DatagramSocketError> =>
        Effect.suspend(() => {
          let host: string
          try {
            host = nativeHost(packet.peer)
          } catch (cause) {
            return Effect.fail(writeError(cause, packet.peer))
          }
          return Effect.callback<void, Datagram.DatagramSocketError>((resume) => {
            let active = true
            const finish = (effect: Effect.Effect<void, Datagram.DatagramSocketError>) => {
              if (!active) return
              active = false
              pending.delete(settle)
              resume(effect)
            }
            const settle = (cause: unknown) => finish(Effect.fail(writeError(cause, packet.peer)))
            pending.add(settle)
            const callback = (cause: Error | null) =>
              finish(cause === null ? Effect.void : Effect.fail(writeError(cause, packet.peer)))
            try {
              if (nativeConnected) socket.send(packet.data, callback)
              else socket.send(packet.data, packet.peer.port, host, callback)
            } catch (cause) {
              finish(Effect.fail(writeError(cause, packet.peer)))
            }
            return Effect.sync(() => {
              active = false
              pending.delete(settle)
            })
          })
        })

      const configure = (
        operation: "setBroadcast" | "setMulticastInterface" | "addMembership" | "dropMembership",
        evaluate: () => void
      ): Effect.Effect<void, Datagram.DatagramSocketError> =>
        Effect.suspend(() => {
          try {
            evaluate()
            return Effect.void
          } catch (cause) {
            return Effect.fail(configurationError(operation, cause))
          }
        })

      const multicastInterface = (networkInterface: NetAddress.Ipv4Address | number) => {
        if (typeof networkInterface === "number") ensureScope(networkInterface)
        return NetAddress.formatMulticastInterface(networkInterface, scopeIds, process.platform)
      }

      const membership = (
        operation: "addMembership" | "dropMembership",
        group: NetAddress.MulticastAddress<A>,
        membershipOptions: Datagram.MembershipOptions<A>
      ) =>
        configure(operation, () => {
          const groupHost = NetAddress.formatIp(group)
          const selected = membershipOptions.interface
          const interfaceHost = selected === undefined || selected === 0
            ? undefined
            : multicastInterface(selected)
          const source = membershipOptions.source
          if (source !== undefined) {
            const method = operation === "addMembership"
              ? "addSourceSpecificMembership"
              : "dropSourceSpecificMembership"
            const fn = socket[method]
            if (typeof fn !== "function") throw new Error(`${method} is unsupported by this runtime`)
            fn.call(socket, NetAddress.formatIp(source), groupHost, interfaceHost)
          } else if (operation === "addMembership") {
            socket.addMembership(groupHost, interfaceHost)
          } else {
            socket.dropMembership(groupHost, interfaceHost)
          }
        })

      return {
        address: address as Datagram.Inet<A>,
        send,
        setBroadcast: (enabled) => configure("setBroadcast", () => socket.setBroadcast(enabled)),
        setMulticastInterface: (networkInterface) =>
          configure(
            "setMulticastInterface",
            () => socket.setMulticastInterface(multicastInterface(networkInterface))
          ),
        addMembership: (group, membershipOptions) => membership("addMembership", group, membershipOptions),
        dropMembership: (group, membershipOptions) => membership("dropMembership", group, membershipOptions)
      }
    }))

/**
 * Acquires a bound Node.js UDP socket owned by the current scope.
 *
 * @category constructors
 * @since 4.0.0
 */
export const bind = <L extends NetAddress.InetAddress>(
  options: Datagram.BindOptions<L>
): Effect.Effect<Datagram.Unassociated<Datagram.FamilyOf<L>>, Datagram.DatagramSocketError, Scope.Scope> =>
  Datagram.fromTransport(options, acquire(options))

/**
 * Acquires a bound Node.js UDP socket associated with one peer.
 *
 * **Details**
 *
 * The peer must have a nonzero port and an address that remains specified after
 * canonicalization. Association filters incoming packets without a handshake.
 *
 * @category constructors
 * @since 4.0.0
 */
export const connect = <L extends NetAddress.InetAddress>(
  options: Datagram.ConnectOptions<L>
): Effect.Effect<Datagram.Associated<Datagram.FamilyOf<L>>, Datagram.DatagramSocketError, Scope.Scope> =>
  Datagram.fromAssociatedTransport(options, acquire(options))

/**
 * Provides the shared datagram socket factory.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Datagram.DatagramSocketFactory> = Layer.succeed(Datagram.DatagramSocketFactory)({
  bind,
  connect
})
