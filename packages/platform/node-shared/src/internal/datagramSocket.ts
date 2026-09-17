/**
 * @internal
 */
import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import type * as Scope from "effect/Scope"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Datagram from "effect/unstable/socket/DatagramSocket"
import * as Dgram from "node:dgram"
import * as Os from "node:os"

export const open = Effect.fnUntraced(function*(
  options: {
    readonly localAddress: NetAddress.InetAddress
    readonly remote?: NetAddress.InetAddress | undefined
    readonly reuseAddress?: boolean | undefined
    readonly configure?:
      | ((
        socket: Dgram.Socket,
        scopeIds: ReadonlyMap<string, number>
      ) => Effect.Effect<void, Datagram.DatagramSocketError>)
      | undefined
  },
  handlers: Datagram.Handlers
): Effect.fn.Return<Datagram.Binding, Datagram.DatagramSocketError, Scope.Scope> {
  const { localAddress, remote } = options
  const scopeIds = yield* Effect.try({
    try: () => NetAddress.scopeIdsFromInterfaces(Object.entries(Os.networkInterfaces())),
    catch: openError
  })
  const create = Effect.try({
    catch: openError,
    try: () => {
      const type = NetAddress.isIpv4Address(localAddress.address) ? "udp4" : "udp6"
      return Dgram.createSocket({ type, reuseAddr: options.reuseAddress ?? false }).on("error", handlers.onError)
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

  if (options.configure !== undefined) {
    yield* options.configure(socket, scopeIds)
  }

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
