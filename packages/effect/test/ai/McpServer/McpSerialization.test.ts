import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpServer from "effect/ai/McpServer"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as NetAddress from "effect/net/NetAddress"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as RpcSerialization from "effect/rpc/RpcSerialization"
import * as RpcServer from "effect/rpc/RpcServer"
import * as Socket from "effect/socket/Socket"
import * as SocketServer from "effect/socket/SocketServer"
import { initializeHttpSession, makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { type JsonRpcMessage, makeMcpStdioHarness } from "./TestUtils/McpStdioHarness.ts"

const parseError = { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } } as const

const withinDeadline = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.timeoutOption("1 second"), Effect.map(Option.getOrUndefined))

const request = (protocol: McpProtocol.ProtocolAdapter, method: string, id: string | number, params = {}) => ({
  jsonrpc: "2.0",
  id,
  method,
  params: protocol.runtime._tag === "Stateless"
    ? {
      ...params,
      _meta: {
        "io.modelcontextprotocol/protocolVersion": protocol.protocolVersion,
        "io.modelcontextprotocol/clientCapabilities": {}
      }
    }
    : params
})

const makeSocketHarness = Effect.fnUntraced(function*(
  protocol: McpProtocol.ProtocolAdapter,
  framing: "ndjson" | "json" = "ndjson"
) {
  const incoming = yield* Queue.unbounded<string | Uint8Array>()
  const outgoing = yield* Queue.unbounded<string>()
  const write = (chunk: string | Uint8Array | Socket.CloseEvent) =>
    Socket.isCloseEvent(chunk)
      ? Effect.void
      : Queue.offer(outgoing, typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk))
  const socket = Socket.make({
    reader: Effect.succeed({
      pull: Effect.map(Queue.take(incoming), (chunk) => [chunk] as const),
      upgrade: () => Effect.fail(new Socket.SocketError({ reason: new Socket.SocketUpgradeError({}) }))
    }),
    writer: Effect.succeed({ write, writeAll: (chunks) => Effect.forEach(chunks, write, { discard: true }) })
  })
  const sockets = SocketServer.SocketServer.of({
    address: NetAddress.inetAddressFromStringUnsafe("127.0.0.1:0"),
    run: (handler) => handler(socket).pipe(Effect.orDie, Effect.andThen(Effect.never))
  })
  const transport = yield* RpcServer.makeProtocolSocketServer.pipe(
    Effect.provideService(SocketServer.SocketServer, sockets),
    Effect.provide(McpServer.layerSerialization({ protocols: [protocol], framing }))
  )
  const context = yield* Layer.build(
    McpServer.layer({ name: "Socket", version: "1", protocols: [protocol] }).pipe(
      Layer.provide(Layer.succeed(RpcServer.Protocol, transport))
    )
  )
  const send = (chunk: string | Uint8Array) => Queue.offer(incoming, chunk)
  const sendMessage = (message: unknown) => send(JSON.stringify(message) + (framing === "ndjson" ? "\n" : ""))
  const take = Effect.map(Queue.take(outgoing), (text) => JSON.parse(text))
  const initialize = protocol.runtime._tag === "Stateless" ? Effect.void : Effect.gen(function*() {
    yield* sendMessage(request(protocol, "initialize", "init", {
      protocolVersion: protocol.protocolVersion,
      capabilities: {},
      clientInfo: { name: "socket-client", version: "1" }
    }))
    assert.property(yield* take, "result")
    yield* sendMessage({ jsonrpc: "2.0", method: "notifications/initialized" })
  })
  return { send, sendMessage, take, initialize, server: Context.get(context, McpServer.McpServer) }
})

describe("MCP serialization", () => {
  for (const protocol of [McpProtocol.v2026_07_28, McpProtocol.v2025_11_25]) {
    describe(protocol.protocolVersion, () => {
      // https://www.jsonrpc.org/specification#response_object
      it.live("stdio answers malformed JSON before initialization with a null-id ParseError", () =>
        Effect.gen(function*() {
          const harness = yield* makeMcpStdioHarness(protocol)
          yield* harness.sendChunk("{broken\n")
          assert.deepStrictEqual(yield* withinDeadline(harness.takeMessage), parseError)
          assert.property(yield* harness.initialize(), "result")
        }))

      it.live("stdio preserves valid messages around a malformed frame in one chunk", () =>
        Effect.gen(function*() {
          const harness = yield* makeMcpStdioHarness(protocol)
          yield* harness.initialize()
          const frame = (id: string) => JSON.stringify(request(protocol, "tools/list", id))
          yield* harness.sendChunk(`${frame("before")}\n{broken\n${frame("after")}\n`)
          const messages = yield* withinDeadline(Effect.all([
            harness.takeMessage,
            harness.takeMessage,
            harness.takeMessage
          ]))
          assert.isDefined(messages)
          assert.deepInclude(messages, parseError)
          assert.sameMembers(messages!.filter((message) => message.id !== null).map((message) => message.id), [
            "before",
            "after"
          ])
          assert.isTrue(messages!.filter((message) => message.id !== null).every((message) => "result" in message))
        }))

      it.live("custom sockets answer malformed JSON without exposing Effect defects", () =>
        Effect.gen(function*() {
          const harness = yield* makeSocketHarness(protocol)
          yield* harness.send("{broken\n")
          assert.deepStrictEqual(yield* withinDeadline(harness.take), parseError)
        }))

      it.live("HTTP retains null-id ParseError responses", () =>
        Effect.gen(function*() {
          const harness = yield* makeHttpHarness(McpServer.layerHttp({
            name: "Http",
            version: "1",
            path: "/mcp",
            protocols: [protocol]
          }))
          const headers = protocol.runtime._tag === "Stateless"
            ? { "MCP-Protocol-Version": protocol.protocolVersion, "Mcp-Method": "tools/list" }
            : yield* initializeHttpSession(harness, protocol)
          const response = yield* harness.postText("{broken", headers)
          assert.deepStrictEqual(yield* Effect.promise(() => response.json()), parseError)
          const invalidUtf8 = yield* Effect.promise(() =>
            harness.handler(
              new Request("http://localhost/mcp", {
                method: "POST",
                headers: {
                  accept: "application/json, text/event-stream",
                  "content-type": "application/json",
                  ...headers
                },
                body: Uint8Array.of(34, 255, 34)
              })
            )
          )
          assert.deepStrictEqual(yield* Effect.promise(() => invalidUtf8.json()), parseError)
        }))

      for (const framing of ["ndjson", "json"] as const) {
        it.live(`custom ${framing} transport recovers and does not interpret Effect control messages`, () =>
          Effect.gen(function*() {
            const harness = yield* makeSocketHarness(protocol, framing)
            yield* harness.send(`{broken${framing === "ndjson" ? "\n" : ""}`)
            assert.deepStrictEqual(yield* harness.take, parseError)
            yield* harness.initialize
            for (const method of ["Ping", "Ack", "Interrupt", "Eof"]) {
              yield* harness.sendMessage({ jsonrpc: "2.0", method: `@effect/rpc/${method}`, params: { requestId: 0 } })
            }
            yield* harness.sendMessage({
              ...request(protocol, "tools/list", 0),
              discard: true,
              headers: [["private", "must not become request headers"]],
              traceId: "not-an-mcp-trace",
              spanId: "not-an-mcp-span",
              sampled: true
            })
            const response = yield* withinDeadline(harness.take)
            assert.strictEqual(response?.id, 0)
            assert.property(response, "result")
            yield* harness.sendMessage(request(protocol, "@effect/rpc/Eof", "unknown"))
            const unknown = yield* harness.take
            assert.strictEqual(unknown.id, "unknown")
            assert.deepStrictEqual(Object.keys(unknown.error).sort(), ["code", "message"])
            assert.strictEqual(unknown.error.code, -32601)
          }))

        it.live(`custom ${framing} transport applies the adapter's batch policy`, () =>
          Effect.gen(function*() {
            const harness = yield* makeSocketHarness(protocol, framing)
            yield* harness.initialize
            yield* harness.sendMessage([request(protocol, "tools/list", 1)])
            assert.deepStrictEqual(yield* harness.take, {
              jsonrpc: "2.0",
              id: null,
              error: { code: -32600, message: "JSON-RPC batches are not supported" }
            })
            yield* harness.sendMessage(request(protocol, "tools/list", "after-batch"))
            assert.property(yield* harness.take, "result")
          }))
      }

      it.live("stdio handles invalid envelopes and fragmented UTF-8 without losing the next request", () =>
        Effect.gen(function*() {
          const harness = yield* makeMcpStdioHarness(protocol)
          yield* harness.initialize()
          for (
            const invalid of [null, 1, { method: "tools/list" }, { jsonrpc: "2.0", id: null, method: "tools/list" }]
          ) {
            yield* harness.sendRaw(invalid)
            assert.deepStrictEqual(yield* harness.takeMessage, {
              jsonrpc: "2.0",
              id: null,
              error: { code: -32600, message: "Invalid Request" }
            })
          }
          const bytes = new TextEncoder().encode(JSON.stringify(request(protocol, "tools/list", "雪☃")) + "\r\n")
          for (const byte of bytes) yield* harness.sendChunk(Uint8Array.of(byte))
          const response = yield* harness.takeMessage
          assert.strictEqual(response.id, "雪☃")
          assert.property(response, "result")
        }))

      it.live("stdio rejects malformed UTF-8 and preserves the following frame", () =>
        Effect.gen(function*() {
          const harness = yield* makeMcpStdioHarness(protocol)
          yield* harness.initialize()
          const encoder = new TextEncoder()
          const invalid = encoder.encode(JSON.stringify(request(protocol, "tools/list", "x")) + "\n")
          const marker = invalid.indexOf(120)
          invalid[marker] = 255
          const valid = encoder.encode(JSON.stringify(request(protocol, "tools/list", "valid")) + "\n")
          yield* harness.sendChunk(Uint8Array.from([...invalid, ...valid]))
          const replies = yield* Effect.all([harness.takeMessage, harness.takeMessage])
          assert.deepInclude(replies, parseError)
          assert.property(replies.find((reply) => reply.id === "valid"), "result")
        }))

      it.live("uses the revision's numeric request ID rules over stdio, custom sockets, and HTTP", () =>
        Effect.gen(function*() {
          const assertResponse = (response: JsonRpcMessage) => {
            if (protocol.runtime._tag === "Stateless") {
              assert.deepStrictEqual(response, {
                jsonrpc: "2.0",
                id: null,
                error: { code: -32600, message: "Invalid Request" }
              })
            } else {
              assert.strictEqual(response.id, 1.5)
              assert.property(response, "result")
            }
          }
          const message = request(protocol, "tools/list", 1.5)
          const stdio = yield* makeMcpStdioHarness(protocol)
          yield* stdio.initialize()
          yield* stdio.sendRaw(message)
          assertResponse(yield* stdio.takeMessage)
          const socket = yield* makeSocketHarness(protocol)
          yield* socket.initialize
          yield* socket.sendMessage(message)
          assertResponse(yield* socket.take)
          const http = yield* makeHttpHarness(McpServer.layerHttp({
            name: "Numeric IDs",
            version: "1",
            path: "/mcp",
            protocols: [protocol]
          }))
          const headers = protocol.runtime._tag === "Stateless"
            ? { "MCP-Protocol-Version": protocol.protocolVersion, "Mcp-Method": "tools/list" }
            : yield* initializeHttpSession(http, protocol)
          const response = yield* http.post(message, headers)
          assertResponse(yield* Effect.promise(() => response.json()))
        }))
    })
  }

  it.live("preserves March batch replies, invalid members, and notification suppression", () =>
    Effect.gen(function*() {
      const protocol = McpProtocol.v2025_03_26
      const harness = yield* makeSocketHarness(protocol)
      yield* harness.initialize
      yield* harness.sendMessage([
        request(protocol, "tools/list", "valid"),
        1,
        { jsonrpc: "2.0", method: "notifications/initialized" },
        null
      ])
      const responses = yield* harness.take
      assert.lengthOf(responses, 3)
      assert.property(responses.find((response: { id: unknown }) => response.id === "valid"), "result")
      assert.deepStrictEqual(responses.filter((response: { id: unknown }) => response.id === null), [
        { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } },
        { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } }
      ])
      yield* harness.sendMessage([{ jsonrpc: "2.0", method: "notifications/initialized" }])
      yield* harness.sendMessage(request(protocol, "tools/list", "after"))
      assert.strictEqual((yield* harness.take).id, "after")
    }))

  it.live("flushes the other March batch replies when a custom transport request is cancelled", () =>
    Effect.gen(function*() {
      const protocol = McpProtocol.v2025_03_26
      const harness = yield* makeSocketHarness(protocol)
      const entered = yield* Deferred.make<void>()
      yield* harness.server.addTool({
        tool: new McpSchema.Tool({ name: "Wait", inputSchema: { type: "object" } }),
        annotations: Context.empty(),
        handle: () => Deferred.succeed(entered, undefined).pipe(Effect.andThen(Effect.never))
      })
      yield* harness.initialize
      yield* harness.sendMessage([
        request(protocol, "tools/call", 1, { name: "Wait" }),
        request(protocol, "ping", "1")
      ])
      yield* Deferred.await(entered)
      yield* harness.sendMessage({ jsonrpc: "2.0", method: "notifications/cancelled", params: { requestId: 1 } })
      assert.deepStrictEqual(yield* withinDeadline(harness.take), [{ jsonrpc: "2.0", id: "1", result: {} }])
    }))

  it("strips non-MCP response controls while preserving explicit error data", () => {
    const parser = McpServer.makeSerialization({ protocols: [McpProtocol.v2025_11_25], framing: "json" }).makeUnsafe()
    assert.deepStrictEqual(
      parser.decode(JSON.stringify({
        jsonrpc: "2.0",
        id: "reverse",
        error: { _tag: "Defect", code: -32603, message: "Client declined", data: { reason: "unavailable" } }
      })),
      [{
        _tag: "Exit",
        requestId: "reverse",
        exit: {
          _tag: "Failure",
          cause: [{
            _tag: "Fail",
            error: { code: -32603, message: "Client declined", data: { reason: "unavailable" } }
          }]
        }
      }]
    )
    assert.deepStrictEqual(
      parser.decode("{\"jsonrpc\":\"2.0\",\"id\":\"reverse\",\"chunk\":true,\"result\":{\"value\":1}}"),
      [{
        _tag: "Exit",
        requestId: "reverse",
        exit: { _tag: "Success", value: { value: 1 } }
      }]
    )
    assert.deepStrictEqual(JSON.parse(parser.encode({ _tag: "Defect", defect: { secret: "private" } }) as string), {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32603, message: "Internal error" }
    })
    assert.deepStrictEqual(
      JSON.parse(parser.encode({
        _tag: "Request",
        id: "reverse",
        tag: "roots/list",
        payload: {},
        headers: [["private", "secret"]],
        discard: true,
        traceId: "internal",
        spanId: "internal",
        sampled: true
      }) as string),
      { jsonrpc: "2.0", id: "reverse", method: "roots/list", params: {} }
    )
    for (const _tag of ["Ping", "Pong", "Ack", "Interrupt", "Eof", "Chunk"]) {
      assert.isUndefined(parser.encode({ _tag, requestId: "reverse" }))
    }
  })

  it("bounds partial frames and releases the buffer after an oversized frame", () => {
    const parser = McpServer.makeSerialization({ protocols: [McpProtocol.v2026_07_28], maxBufferSize: 4 }).makeUnsafe()
    assert.deepStrictEqual(parser.decode("{ "), [])
    assert.throws(() => parser.decode("   "), RpcSerialization.MaxBufferSizeExceeded)
    assert.lengthOf(parser.decode("1\n"), 1)
  })

  it.live("rejects invalid UTF-8 in custom whole-message framing", () =>
    Effect.gen(function*() {
      const harness = yield* makeSocketHarness(McpProtocol.v2026_07_28, "json")
      yield* harness.send(Uint8Array.of(34, 255, 34))
      assert.deepStrictEqual(yield* harness.take, parseError)
    }))
})
