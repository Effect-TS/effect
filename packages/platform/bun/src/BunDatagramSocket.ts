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
import * as Bun from "bun"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as MutableRef from "effect/MutableRef"
import * as Result from "effect/Result"
import type * as Scope from "effect/Scope"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Datagram from "effect/unstable/socket/DatagramSocket"
import * as Os from "node:os"

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

interface SocketState {
  readonly writable: MutableRef.MutableRef<Deferred.Deferred<void, unknown>>
  socket: Bun.udp.BaseUDPSocket | undefined
  isClosed: boolean
}

interface NativeBinding {
  readonly socket: Bun.udp.BaseUDPSocket
  readonly send: (packet: Datagram.OutgoingPacket) => boolean
}

const open = Effect.fnUntraced(function*(
  localAddress: NetAddress.InetAddress,
  handlers: Datagram.Handlers,
  remote?: NetAddress.InetAddress
): Effect.fn.Return<Datagram.Binding, Datagram.DatagramSocketError, Scope.Scope> {
  const scopeIds = yield* Effect.try({
    try: () => NetAddress.scopeIdsFromInterfaces(Object.entries(Os.networkInterfaces())),
    catch: openError
  })
  const state: SocketState = {
    writable: MutableRef.make(Deferred.makeUnsafe<void, unknown>()),
    socket: undefined,
    isClosed: false
  }

  yield* Effect.addFinalizer(() => closeSocket(state))

  const socketOptions = makeSocketOptions(localAddress, handlers, scopeIds, state)

  const native = yield* Effect.tryPromise({
    try: async () => {
      const native = await openNativeSocket(socketOptions, remote)
      state.socket = native.socket

      // Bun's acquisition promise cannot be cancelled, so the socket may arrive
      // after its scope has already closed.
      if (state.isClosed) native.socket.close()

      return native
    },
    catch: openError
  })

  const address = yield* Effect.try({
    try: () => fromSocketAddress(native.socket.address, scopeIds),
    catch: openError
  })

  return {
    address,
    send: makeSend(native.send, state)
  }
})

const makeSocketOptions = (
  localAddress: NetAddress.InetAddress,
  handlers: Datagram.Handlers,
  scopeIds: ReadonlyMap<string, number>,
  state: SocketState
) => ({
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
      if (state.isClosed || flags?.truncated) return
      try {
        handlers.onMessage(data, fromSocketAddress({ address, port }, scopeIds))
      } catch (cause) {
        handlers.onError(cause)
      }
    },
    drain: () => {
      notifyWriters(state, Exit.void)
    },
    error: (_socket: Bun.udp.BaseUDPSocket, cause: Error) => {
      handlers.onError(cause)
      notifyWriters(state, Exit.fail(cause))
    }
  }
})

const openNativeSocket = async (
  options: ReturnType<typeof makeSocketOptions>,
  remote: NetAddress.InetAddress | undefined
): Promise<NativeBinding> => {
  if (remote === undefined) {
    const socket = await Bun.udpSocket(options)
    return {
      socket,
      send: (packet) => socket.send(packet.data, packet.destination.port, NetAddress.formatHost(packet.destination))
    }
  }

  const socket = await Bun.udpSocket({
    ...options,
    connect: { hostname: NetAddress.formatHost(remote), port: remote.port }
  })
  return {
    socket,
    send: (packet) => socket.send(packet.data)
  }
}

const notifyWriters = (state: SocketState, result: Exit.Exit<void, unknown>) => {
  // Install the next signal before waking writers that may encounter backpressure again.
  const writable = MutableRef.getAndSet(state.writable, Deferred.makeUnsafe())
  Deferred.doneUnsafe(writable, result)
}

const makeSend = (send: NativeBinding["send"], state: SocketState): Datagram.Binding["send"] =>
  Effect.fnUntraced(function*(packet) {
    while (true) {
      // Capture the signal before sending so a drain cannot be missed.
      const writable = MutableRef.get(state.writable)
      const accepted = yield* Effect.try({
        try: () => send(packet),
        catch: (cause) => writeError(cause, packet)
      })
      if (accepted) return
      yield* Deferred.await(writable).pipe(Effect.mapError((cause) => writeError(cause, packet)))
    }
  })

const closeSocket = (state: SocketState) =>
  Effect.sync(() => {
    state.isClosed = true
    state.socket?.close()
  })

const fromSocketAddress = (
  address: { readonly address: string; readonly port: number },
  scopeIds: ReadonlyMap<string, number>
): NetAddress.InetAddress =>
  Result.getOrThrow(NetAddress.inetAddressFromHostString(address.address, address.port, scopeIds))

const openError = (cause: unknown) =>
  new Datagram.DatagramSocketError({
    reason: new Datagram.DatagramSocketOpenError({ cause })
  })

const writeError = (cause: unknown, packet: Datagram.OutgoingPacket) =>
  new Datagram.DatagramSocketError({
    reason: new Datagram.DatagramSocketWriteError({ cause, destination: packet.destination })
  })
