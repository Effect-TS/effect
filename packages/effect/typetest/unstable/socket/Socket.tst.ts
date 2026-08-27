import type { Effect } from "effect"
import { Socket } from "effect/unstable/socket"
import { describe, expect, it } from "tstyche"

describe("Socket", () => {
  describe("WebSocketConstructorOptions", () => {
    it("accepts protocols and string-valued headers", () => {
      expect("protocol").type.toBeAssignableTo<Socket.WebSocketConstructorOptions>()
      expect(["protocol"]).type.toBeAssignableTo<Socket.WebSocketConstructorOptions>()
      expect({ headers: { Authorization: "Bearer test" } }).type.toBeAssignableTo<
        Socket.WebSocketConstructorOptions
      >()
      expect({ headers: undefined }).type.toBeAssignableTo<Socket.WebSocketConstructorOptions>()
    })

    it("rejects non-string header values", () => {
      expect({ headers: { Authorization: 1 } }).type.not.toBeAssignableTo<Socket.WebSocketConstructorOptions>()
    })
  })

  it("accepts the global WebSocket implementation", () => {
    expect(new globalThis.WebSocket("ws://localhost")).type.toBeAssignableTo<Socket.WebSocketLike>()
  })

  it("preserves the concrete WebSocket type", () => {
    const acquire = null as unknown as Effect.Effect<globalThis.WebSocket, Socket.SocketError>
    Socket.fromWebSocket(acquire, {
      onInitialRun: (socket) => {
        expect(socket).type.toBe<globalThis.WebSocket>()
        return []
      }
    })
  })
})
