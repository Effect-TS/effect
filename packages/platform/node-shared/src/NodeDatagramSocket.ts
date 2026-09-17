/**
 * Node.js UDP sockets for Effect's datagram socket API.
 *
 * Socket acquisition scopes own native sockets. Calling fibers own receive and send
 * operations; interrupting one leaves the endpoint open.
 * Incoming packets are buffered within the configured packet and byte limits,
 * including while no receive is waiting. Overflow and oversized incoming packets
 * are dropped. A native receive error terminates reading until the socket is
 * released. Outgoing payloads are copied before submission so interrupted writes
 * cannot retain the caller's mutable storage. Successful writes do not confirm
 * remote delivery.
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

/**
 * Acquires a bound Node.js UDP socket owned by the current scope.
 *
 * @see {@link connect} for sockets associated with one peer
 * @category constructors
 * @since 4.0.0
 */
export const bind = (options: Datagram.BindOptions): Effect.Effect<
  Datagram.DatagramSocket,
  Datagram.DatagramSocketError,
  Scope.Scope
> => Datagram.fromTransport(options, (handlers) => open(options.localAddress, handlers))

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
export const connect = (options: Datagram.ConnectOptions): Effect.Effect<
  Datagram.ConnectedDatagramSocket,
  Datagram.DatagramSocketError,
  Scope.Scope
> => Datagram.fromConnectedTransport(options, (handlers) => open(options.localAddress, handlers, options.remote))

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

const open = Effect.fnUntraced(function*(
  localAddress: NetAddress.InetAddress,
  handlers: Datagram.Handlers,
  remote?: NetAddress.InetAddress
): Effect.fn.Return<Datagram.Binding, Datagram.DatagramSocketError, Scope.Scope> {
  const scopeIds = yield* Effect.try({
    try: () => NetAddress.scopeIdsFromInterfaces(Object.entries(Os.networkInterfaces())),
    catch: openError
  })
  const create = Effect.try({
    catch: openError,
    try: () => {
      const type = NetAddress.isIpv4Address(localAddress.address) ? "udp4" : "udp6"
      return Dgram.createSocket(type).on("error", handlers.onError)
    }
  })

  const socket = yield* Effect.acquireRelease(create, (socket) =>
    Effect.callback<void>((resume) => {
      socket.close(() => {
        socket.removeAllListeners()
        resume(Effect.void)
      })
    }))

  yield* awaitOpen(socket, "listening", () => {
    return socket.bind({ address: NetAddress.formatHost(localAddress), port: localAddress.port, exclusive: true })
  })

  if (remote !== undefined) {
    yield* awaitOpen(socket, "connect", () => {
      return socket.connect(remote.port, NetAddress.formatHost(remote))
    })
  }

  const address = yield* Effect.try({
    try: () => {
      const { address, port } = socket.address()
      return Result.getOrThrow(NetAddress.inetAddressFromHostString(address, port, scopeIds))
    },
    catch: openError
  })

  // Connected sockets must not buffer packets received before association.
  socket.on("message", (data, info) => {
    try {
      const source = Result.getOrThrow(NetAddress.inetAddressFromHostString(info.address, info.port, scopeIds))
      handlers.onMessage(data, source)
    } catch (cause) {
      handlers.onError(cause)
    }
  })

  const send = Effect.effectify(
    (packet: Datagram.OutgoingPacket, callback: (cause: Error | null, bytes: number) => void) => {
      if (remote === undefined) {
        socket.send(packet.data, packet.destination.port, NetAddress.formatHost(packet.destination), callback)
      } else {
        socket.send(packet.data, callback)
      }
    },
    writeError,
    writeError
  )

  return {
    address,
    send: (packet) => Effect.asVoid(send(packet))
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

const writeError = (cause: unknown, [packet]: [Datagram.OutgoingPacket]) =>
  new Datagram.DatagramSocketError({
    reason: new Datagram.DatagramSocketWriteError({ cause, destination: packet.destination })
  })
