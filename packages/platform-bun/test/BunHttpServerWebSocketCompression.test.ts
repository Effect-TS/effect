import * as BunHttpServer from "@effect/platform-bun/BunHttpServer"
import type * as HttpServer from "@effect/platform/HttpServer"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Net from "node:net"

interface WebSocketFrame {
  readonly opcode: number
  readonly payloadLength: number
  readonly rsv1: boolean
}

interface Handshake {
  readonly headers: string
  readonly frame: WebSocketFrame
}

const connect = (port: number) =>
  Effect.async<Handshake, Error>((resume) => {
    const socket = Net.createConnection({ host: "127.0.0.1", port })
    let received = Buffer.alloc(0)
    let done = false
    socket.on("connect", () => {
      socket.write([
        "GET / HTTP/1.1",
        `Host: 127.0.0.1:${port}`,
        "Connection: Upgrade",
        "Upgrade: websocket",
        "Sec-WebSocket-Version: 13",
        "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==",
        "Sec-WebSocket-Extensions: permessage-deflate",
        "",
        ""
      ].join("\r\n"))
    })
    socket.on("error", (error) => resume(Effect.fail(error)))
    socket.on("data", (chunk) => {
      if (done) return
      received = Buffer.concat([received, typeof chunk === "string" ? Buffer.from(chunk) : chunk])
      const headerEnd = received.indexOf("\r\n\r\n")
      if (headerEnd === -1) return
      const headers = received.subarray(0, headerEnd).toString()
      const offset = headerEnd + 4
      if (received.length < offset + 2) return
      const first = received[offset]
      const length = received[offset + 1] & 0x7f
      const headerLength = length === 126 ? 4 : 2
      if (received.length < offset + headerLength) return
      const payloadLength = length === 126 ? received.readUInt16BE(offset + 2) : length
      if (received.length < offset + headerLength + payloadLength) return
      done = true
      socket.end(Buffer.from([0x88, 0x82, 0, 0, 0, 0, 0x03, 0xe8]))
      resume(Effect.succeed({
        headers,
        frame: { opcode: first & 0x0f, payloadLength, rsv1: (first & 0x40) !== 0 }
      }))
    })
    return Effect.sync(() => socket.destroy())
  })

describe("BunHttpServer WebSocket compression", () => {
  it.scoped("negotiates permessage-deflate when Bun's websocket.perMessageDeflate is set", () =>
    Effect.gen(function*() {
      const payload = "a".repeat(4_096)
      // ServeOptions does not include Bun's `websocket` field, so a cast is needed
      const server = yield* BunHttpServer.make({
        hostname: "127.0.0.1",
        port: 0,
        websocket: { perMessageDeflate: true }
      } as BunHttpServer.ServeOptions<{}>)
      yield* server.serve(
        Effect.gen(function*() {
          const request = yield* HttpServerRequest.HttpServerRequest
          const socket = yield* request.upgrade
          const write = yield* socket.writer
          yield* Effect.orDie(write(payload))
          return HttpServerResponse.empty()
        }).pipe(Effect.scoped)
      )
      const { frame, headers } = yield* connect((server.address as HttpServer.TcpAddress).port)

      assert.match(headers, /^HTTP\/1\.1 101/)
      assert.match(headers, /^sec-websocket-extensions:.*permessage-deflate/im)
      assert.strictEqual(frame.opcode, 1)
      assert.isTrue(frame.rsv1, "outbound text frame should be compressed")
      assert.isBelow(frame.payloadLength, payload.length)
    }))
})
