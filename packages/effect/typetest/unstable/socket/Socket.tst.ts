import type { Effect, Scope } from "effect"
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

  it("reader acquisition requires a scope and exposes typed pulls", () => {
    const socket = null as unknown as Socket.Socket
    expect(socket.reader).type.toBe<
      Effect.Effect<Socket.Reader, Socket.SocketError, Scope.Scope>
    >()
    expect(Socket.readerBytes(socket)).type.toBe<
      Effect.Effect<Socket.Reader<Uint8Array>, Socket.SocketError, Scope.Scope>
    >()
    expect(Socket.readerString(socket)).type.toBe<
      Effect.Effect<Socket.Reader<string>, Socket.SocketError, Scope.Scope>
    >()
  })

  it("writer exposes write and writeAll", () => {
    const socket = null as unknown as Socket.Socket
    expect(socket.writer).type.toBe<
      Effect.Effect<Socket.Writer, never, Scope.Scope>
    >()
  })
})
