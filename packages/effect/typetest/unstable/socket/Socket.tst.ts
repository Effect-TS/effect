import { Context, Effect } from "effect"
import { Socket } from "effect/unstable/socket"
import { describe, expect, it } from "tstyche"

class HandlerService extends Context.Service<HandlerService, string>()("HandlerService") {}

declare const webSocket: globalThis.WebSocket
declare const makeOptions: Parameters<typeof Socket.make>[0]
declare const webSocketSocket: Socket.WebSocketSocket

describe("Socket", () => {
  it("returns WebSocket-backed sockets", () => {
    expect(Socket.fromWebSocket(Effect.succeed(webSocket))).type.toBe<
      Effect.Effect<Socket.WebSocketSocket>
    >()
    expect(Socket.makeWebSocket("ws://localhost")).type.toBe<
      Effect.Effect<Socket.WebSocketSocket, never, Socket.WebSocketConstructor>
    >()
  })

  it("provides WebSocket to message handlers", () => {
    const handler = () =>
      Effect.gen(function*() {
        const activeWebSocket = yield* Socket.WebSocket
        activeWebSocket.close()
        yield* HandlerService
      })

    expect(webSocketSocket.run(handler)).type.toBe<
      Effect.Effect<void, Socket.SocketError, HandlerService>
    >()
    expect(webSocketSocket.runString(handler)).type.toBe<
      Effect.Effect<void, Socket.SocketError, HandlerService>
    >()
    expect(webSocketSocket.runRaw(handler)).type.toBe<
      Effect.Effect<void, Socket.SocketError, HandlerService>
    >()
  })

  it("excludes WebSocket from generic handler requirements", () => {
    const runGeneric = <R>(effect: Effect.Effect<void, never, R>) => webSocketSocket.runRaw(() => effect)
    const webSocketEffect = Effect.gen(function*() {
      yield* Socket.WebSocket
    })

    expect(runGeneric(webSocketEffect)).type.toBe<Effect.Effect<void, Socket.SocketError>>()
  })

  it("does not change the contract of custom sockets", () => {
    const socket = Socket.make(makeOptions)
    const program = socket.runRaw(() =>
      Effect.gen(function*() {
        yield* Socket.WebSocket
      })
    )

    expect(program).type.toBe<Effect.Effect<void, Socket.SocketError, Socket.WebSocket>>()
    expect(socket).type.not.toBeAssignableTo<Socket.WebSocketSocket>()
  })
})
