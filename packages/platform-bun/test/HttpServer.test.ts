import * as BunHttpServer from "@effect/platform-bun/BunHttpServer"
import type * as HttpServer from "@effect/platform/HttpServer"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Net from "node:net"

const connect = (port: number) =>
  Effect.async<{ readonly headers: string; readonly firstByte: number }, Error>((resume) => {
    const socket = Net.createConnection({ host: "127.0.0.1", port })
    let received = Buffer.alloc(0)
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
      received = Buffer.concat([received, typeof chunk === "string" ? Buffer.from(chunk) : chunk])
      const headerEnd = received.indexOf("\r\n\r\n")
      if (headerEnd === -1) return
      const offset = headerEnd + 4
      if (received.length <= offset) return
      socket.destroy()
      resume(Effect.succeed({
        headers: received.subarray(0, headerEnd).toString(),
        firstByte: received[offset]
      }))
    })
    return Effect.sync(() => socket.destroy())
  })

describe.skipIf(typeof Bun === "undefined")("HttpServer", () => {
  it.scoped("negotiates permessage-deflate and compresses outgoing WebSocket text", () =>
    Effect.gen(function*() {
      const server = yield* BunHttpServer.make({
        hostname: "127.0.0.1",
        port: 0,
        websocket: { perMessageDeflate: true }
      })
      yield* server.serve(
        Effect.gen(function*() {
          const request = yield* HttpServerRequest.HttpServerRequest
          const socket = yield* request.upgrade
          const write = yield* socket.writer
          yield* Effect.orDie(write("a".repeat(4_096)))
          return HttpServerResponse.empty()
        }).pipe(Effect.scoped)
      )
      const { firstByte, headers } = yield* connect((server.address as HttpServer.TcpAddress).port)

      assert.match(headers, /^HTTP\/1\.1 101/)
      assert.match(headers, /^sec-websocket-extensions:.*permessage-deflate/im)
      assert.strictEqual(firstByte & 0x0f, 1)
      assert.strictEqual(firstByte & 0x40, 0x40, "outbound text frame should set RSV1")
    }))
})
