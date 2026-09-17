/**
 * Native Bun UDP sockets for Effect's datagram socket API.
 *
 * Socket acquisition scopes own native sockets. Receive and send operations are
 * interruptible without closing the endpoint. Incoming packets use bounded
 * buffering; outgoing packets wait for native backpressure to clear. Successful
 * writes do not confirm remote delivery.
 *
 * @since 4.0.0
 */
import * as NodeNetAddress from "@effect/platform-node-shared/NodeNetAddress"
import * as Bun from "bun"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Datagram from "effect/unstable/socket/DatagramSocket"

/**
 * Acquires a bound Bun UDP socket owned by the current scope.
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
 * Acquires a bound, peer-associated Bun UDP socket owned by the current scope.
 *
 * **Details**
 *
 * The peer must have a nonzero port and a specified IP address. Native peer
 * association filters incoming packets without performing a handshake.
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
 * Layer that provides native Bun UDP binding and peer association through the
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
  const pending = new Set<{ readonly retry: () => void; readonly fail: (cause: unknown) => void }>()
  let socket: Bun.udp.BaseUDPSocket | undefined
  let finalized = false
  yield* Scope.addFinalizer(
    yield* Effect.scope,
    Effect.sync(() => {
      finalized = true
      pending.clear()
      socket?.close()
    })
  )

  const options = {
    hostname: NetAddress.formatHost(localAddress),
    port: localAddress.port,
    binaryType: "uint8array" as const,
    socket: {
      data: (
        _socket: Bun.udp.BaseUDPSocket,
        data: Uint8Array,
        port: number,
        address: string,
        flags?: Bun.udp.ReceiveFlags
      ) => {
        if (finalized || flags?.truncated) return
        try {
          handlers.onMessage(data, NodeNetAddress.inetAddressFromHostStringUnsafe(address, port))
        } catch (cause) {
          handlers.onError(cause)
        }
      },
      drain: () => {
        for (const operation of Array.from(pending)) operation.retry()
      },
      error: (_socket: Bun.udp.BaseUDPSocket, cause: Error) => {
        handlers.onError(cause)
        for (const operation of Array.from(pending)) operation.fail(cause)
      }
    }
  }

  const send = yield* Effect.tryPromise({
    try: async () => {
      let send: (packet: Datagram.OutgoingPacket) => boolean
      if (remote === undefined) {
        const bound = await Bun.udpSocket(options)
        socket = bound
        send = (packet) => bound.send(packet.data, packet.destination.port, NetAddress.formatHost(packet.destination))
      } else {
        const connected = await Bun.udpSocket({
          ...options,
          connect: { hostname: NetAddress.formatHost(remote), port: remote.port }
        })
        socket = connected
        send = (packet) => connected.send(packet.data)
      }
      // Bun's acquisition promise cannot be cancelled; close late arrivals too.
      if (finalized) socket.close()
      return send
    },
    catch: openError
  })

  const address = yield* Effect.try({
    try: () => NodeNetAddress.inetAddressFromHostStringUnsafe(socket!.address.address, socket!.address.port),
    catch: openError
  })

  return {
    address,
    send: (packet) =>
      Effect.callback<void, Datagram.DatagramSocketError>((resume) => {
        const finish = (result: Effect.Effect<void, Datagram.DatagramSocketError>) => {
          pending.delete(operation)
          resume(result)
        }
        const operation = {
          retry: () => {
            try {
              if (send(packet)) finish(Effect.void)
            } catch (cause) {
              operation.fail(cause)
            }
          },
          fail: (cause: unknown) =>
            finish(Effect.fail(
              new Datagram.DatagramSocketError({
                reason: new Datagram.DatagramSocketWriteError({ cause, destination: packet.destination })
              })
            ))
        }
        pending.add(operation)
        operation.retry()
        return Effect.sync(() => pending.delete(operation))
      })
  }
})

const openError = (cause: unknown) =>
  new Datagram.DatagramSocketError({
    reason: new Datagram.DatagramSocketOpenError({ cause })
  })
