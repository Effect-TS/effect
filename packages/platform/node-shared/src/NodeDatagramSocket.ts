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
import type * as Scope from "effect/Scope"
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
  (handlers: Datagram.Handlers<NetAddress.Family<L>>): Effect.Effect<
    Datagram.Binding<NetAddress.Family<L>>,
    Datagram.DatagramSocketError,
    Scope.Scope
  > =>
    Effect.uninterruptibleMask(Effect.fnUntraced(function*(restore) {
      type A = NetAddress.Family<L>
      const family = NetAddress.isInetAddressV4(options.localAddress) ? "udp4" : "udp6"
      type NativeState = "Idle" | "Binding" | "Running" | "Connecting" | "Closed"
      type ReleaseState =
        | { readonly _tag: "Open" }
        | { readonly _tag: "Closing"; readonly complete: (effect: Effect.Effect<void>) => void }
        | { readonly _tag: "Closed" }
      let nativeState: NativeState = "Idle"
      let releaseState: ReleaseState = { _tag: "Open" }
      const pending = new Set<(cause: unknown) => void>()
      const closedCause = new Error("Datagram socket closed")

      let scopeIds: Map<string, number>
      try {
        scopeIds = networkInterfaces()
      } catch (cause) {
        return yield* Effect.fail(openError(cause))
      }

      const isReleased = () => releaseState._tag !== "Open"

      const settlePending = (cause: unknown) => {
        for (const settle of pending) settle(cause)
      }

      // Centralize the callback ownership shared by acquisition and sends:
      // every native wait is registered for scope-close settlement, resumes at
      // most once, and runs its native detach action on completion or interrupt.
      const nativeCallback = (
        onClosed: (cause: unknown) => Datagram.DatagramSocketError,
        attach: (
          complete: (effect: Effect.Effect<void, Datagram.DatagramSocketError>) => void
        ) => (() => void) | void
      ): Effect.Effect<void, Datagram.DatagramSocketError> =>
        Effect.callback((resume) => {
          let active = true
          let detach: (() => void) | void
          const cleanup = () => {
            const run = detach
            detach = undefined
            run?.()
          }
          const complete = (effect: Effect.Effect<void, Datagram.DatagramSocketError>) => {
            if (!active) return
            active = false
            pending.delete(settle)
            cleanup()
            resume(effect)
          }
          const settle = (cause: unknown) => complete(Effect.fail(onClosed(cause)))
          pending.add(settle)
          try {
            const release = attach(complete)
            if (active) detach = release
            else release?.()
          } catch (cause) {
            complete(Effect.die(cause))
          }
          return Effect.sync(() => {
            if (!active) return
            active = false
            pending.delete(settle)
            cleanup()
          })
        })

      const finishRelease = (socket: Dgram.Socket, effect: Effect.Effect<void> = Effect.void) => {
        if (releaseState._tag !== "Closing") return
        const complete = releaseState.complete
        releaseState = { _tag: "Closed" }
        socket.removeAllListeners()
        complete(effect)
      }

      const closeNative = (socket: Dgram.Socket) => {
        if (nativeState === "Closed") return finishRelease(socket)
        try {
          socket.close()
        } catch (cause) {
          if ((cause as NodeJS.ErrnoException)?.code === "ERR_SOCKET_DGRAM_NOT_RUNNING") {
            if (nativeState !== "Binding" && nativeState !== "Connecting") finishRelease(socket)
            return
          }
          finishRelease(socket, Effect.die(cause))
        }
      }

      const releaseSocket = (socket: Dgram.Socket) =>
        Effect.callback<void>((resume) => {
          releaseState = { _tag: "Closing", complete: resume }
          settlePending(closedCause)
          closeNative(socket)
        })

      // Listener installation is part of acquisition, so release can observe
      // `close` even when acquireRelease registers into an already-closed scope
      // and invokes the finalizer inline. Interface discovery runs first because
      // it does not require a native resource.
      const socket = yield* Effect.acquireRelease(
        Effect.try({
          try: () => {
            const socket = Dgram.createSocket({
              type: family,
              reuseAddr: options.reuseAddress ?? false,
              ipv6Only: options.ipv6Only ?? false
            })

            function onListening() {
              nativeState = "Running"
              if (isReleased()) closeNative(socket)
            }

            function onClose() {
              nativeState = "Closed"
              settlePending(closedCause)
              if (isReleased()) finishRelease(socket)
              else handlers.onError(closedCause)
            }

            function onError(cause: NodeJS.ErrnoException) {
              if (nativeState === "Binding" || nativeState === "Connecting") {
                const wasBinding = nativeState === "Binding"
                nativeState = wasBinding ? "Idle" : "Running"
                if (isReleased() && wasBinding) finishRelease(socket)
                return
              }
              if (isReleased() || isRecoverableReceiveError(cause)) return
              socket.off("message", onMessage)
              handlers.onError(cause)
            }

            function parsePeer(host: string, port: number): NetAddress.Inet<A> | undefined {
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
              return peer as NetAddress.Inet<A>
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
            return socket
          },
          catch: openError
        }),
        releaseSocket
      )
      if (isReleased()) return yield* Effect.fail(openError(closedCause))

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
        nativeCallback(openError, (complete) => {
          const previous: NativeState = event === "listening" ? "Idle" : "Running"
          const acquiring: NativeState = event === "listening" ? "Binding" : "Connecting"
          const succeed = () => {
            nativeState = "Running"
            complete(Effect.void)
          }
          const fail = (cause: unknown) => complete(Effect.fail(openError(cause)))
          socket.once(event, succeed)
          socket.once("error", fail)
          nativeState = acquiring
          try {
            start()
          } catch (cause) {
            nativeState = previous
            complete(Effect.fail(openError(cause)))
          }
          return () => {
            socket.off(event, succeed)
            socket.off("error", fail)
          }
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
      const useConnectedSend = remote !== undefined && !isDeno
      if (useConnectedSend) {
        let host: string
        try {
          host = nativeHost(remote)
        } catch (cause) {
          return yield* Effect.fail(openError(cause))
        }
        yield* restore(awaitNative("connect", () => socket.connect(remote.port, host)))
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
          return nativeCallback((cause) => writeError(cause, packet.peer), (complete) => {
            const callback = (cause: Error | null) =>
              complete(cause === null ? Effect.void : Effect.fail(writeError(cause, packet.peer)))
            try {
              if (useConnectedSend) socket.send(packet.data, callback)
              else socket.send(packet.data, packet.peer.port, host, callback)
            } catch (cause) {
              complete(Effect.fail(writeError(cause, packet.peer)))
            }
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

      const multicastInterface = (networkInterface: NetAddress.MulticastInterface<A>) => {
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
        address: address as NetAddress.Inet<A>,
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
): Effect.Effect<Datagram.Unassociated<NetAddress.Family<L>>, Datagram.DatagramSocketError, Scope.Scope> =>
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
): Effect.Effect<Datagram.Associated<NetAddress.Family<L>>, Datagram.DatagramSocketError, Scope.Scope> =>
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
