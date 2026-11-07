import { assert, describe, it } from "@effect/vitest"
import * as McpRuntime from "effect/ai/internal/mcpRuntime"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpServer from "effect/ai/McpServer"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Headers from "effect/http/Headers"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import type * as RpcMessage from "effect/rpc/RpcMessage"
import type * as RpcSerialization from "effect/rpc/RpcSerialization"
import * as RpcServer from "effect/rpc/RpcServer"
import * as Schema from "effect/Schema"
import * as TestClock from "effect/testing/TestClock"
import { initializeHttpSession, makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { makeMcpSseReader, readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"
import { makeServerLayer } from "./TestUtils/McpServerLayer.ts"

const modernMetadata = {
  "io.modelcontextprotocol/protocolVersion": "2026-07-28",
  "io.modelcontextprotocol/clientCapabilities": {},
  "io.modelcontextprotocol/logLevel": "error"
}

const makeDisconnectHarness = Effect.gen(function*() {
  const protocols = [McpProtocol.v2025_11_25, McpProtocol.v2026_07_28] as const
  const runtime = yield* McpRuntime.make(protocols)
  const server = yield* McpServer.McpServer.make
  const outbound = yield* Queue.unbounded<
    { readonly clientId: number; readonly message: RpcMessage.FromServerEncoded }
  >()
  const disconnects = yield* Queue.unbounded<number>()
  const clientIds = new Set([0, 1])
  const ready = yield* Deferred.make<
    (clientId: number, message: RpcMessage.FromClientEncoded) => Effect.Effect<void>
  >()
  const transport = yield* RpcServer.Protocol.make((write) =>
    Deferred.succeed(ready, write).pipe(Effect.as({
      disconnects,
      send: (clientId, message) =>
        clientIds.has(clientId) ? Queue.offer(outbound, { clientId, message }).pipe(Effect.asVoid) : Effect.void,
      end: () => Effect.void,
      clientIds: Effect.sync(() => clientIds),
      initialMessage: Effect.succeedNone,
      supportsAck: false,
      supportsTransferables: false,
      supportsSpanPropagation: false,
      supportsNotifications: true,
      codecFor: Schema.toCodecJson as RpcSerialization.CodecFor
    }))
  )
  yield* McpServer.run({ name: "Disconnect", version: "1.0.0", protocols }).pipe(
    Effect.provideService(McpServer.McpServer, server),
    Effect.provideService(McpRuntime.ServerRuntime, runtime),
    Effect.provideService(RpcServer.Protocol, transport),
    Effect.forkScoped
  )
  const write = yield* Deferred.await(ready)
  const disconnectClient = (clientId: number) =>
    Effect.sync(() => clientIds.delete(clientId)).pipe(
      Effect.andThen(Queue.offer(disconnects, clientId)),
      Effect.asVoid
    )
  return {
    server,
    runtime,
    take: Effect.map(Queue.take(outbound), ({ message }) => message),
    takeEnvelope: Queue.take(outbound),
    send: (message: RpcMessage.FromClientEncoded | RpcMessage.FromServerEncoded, clientId = 0) =>
      write(clientId, message as RpcMessage.FromClientEncoded),
    // Socket protocols report a disconnect without synthesizing an EOF frame.
    disconnect: disconnectClient(0)
  }
})

describe("MCP transport lifecycle", () => {
  // https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#shutdown
  it.effect("clears a legacy connection on disconnect without EOF or a later notification", () =>
    Effect.gen(function*() {
      const harness = yield* makeDisconnectHarness
      yield* harness.send({
        _tag: "Request",
        id: "initialize",
        tag: "initialize",
        payload: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "socket-client", version: "1.0.0" }
        },
        headers: []
      })
      assert.propertyVal(yield* harness.take, "_tag", "Exit")
      yield* harness.send({
        _tag: "Request",
        id: "",
        tag: "notifications/initialized",
        payload: {},
        isNotification: true,
        headers: []
      })
      assert.isDefined(harness.runtime.resolveRequest(0, Headers.empty))
      assert.deepStrictEqual(Array.from(harness.runtime.deliveryClientIds()), [0])

      yield* harness.disconnect
      yield* TestClock.adjust("1 millis")

      assert.isUndefined(harness.runtime.resolveRequest(0, Headers.empty))
      assert.deepStrictEqual(Array.from(harness.runtime.deliveryClientIds()), [])
    }))

  it.effect("interrupts a modern custom transport request when its connection disconnects", () =>
    Effect.gen(function*() {
      const harness = yield* makeDisconnectHarness
      const entered = yield* Deferred.make<void>()
      const interrupted = yield* Deferred.make<void>()
      yield* harness.server.addTool({
        tool: new McpSchema.Tool({ name: "Wait", inputSchema: { type: "object" } }),
        annotations: Context.empty(),
        handle: () =>
          Deferred.succeed(entered, undefined).pipe(
            Effect.andThen(Effect.never),
            Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined))
          )
      })
      yield* harness.send({
        _tag: "Request",
        id: "wait",
        tag: "tools/call",
        payload: { name: "Wait", _meta: modernMetadata },
        headers: []
      })
      yield* Deferred.await(entered)
      yield* harness.disconnect
      yield* Deferred.await(interrupted)
    }))

  // https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#shutdown
  // https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation
  it.effect("interrupts a disconnected client's pending elicitation while another client's elicitation completes", () =>
    Effect.gen(function*() {
      const harness = yield* makeDisconnectHarness
      const interrupted = [yield* Deferred.make<void>(), yield* Deferred.make<void>()]
      const approval = Schema.Struct({ approved: Schema.Boolean })
      yield* harness.server.addTool({
        tool: new McpSchema.Tool({ name: "Approve", inputSchema: { type: "object" } }),
        annotations: Context.empty(),
        handle: Effect.fnUntraced(function*() {
          const client = yield* Effect.serviceOption(McpSchema.McpServerClient)
          if (Option.isNone(client)) return yield* Effect.die("Expected a legacy client for elicitation")
          const result = yield* McpServer.elicit({ message: "Approve this operation", schema: approval }).pipe(
            Effect.provideService(McpSchema.McpServerClient, client.value),
            Effect.orDie,
            Effect.onInterrupt(() => Deferred.succeed(interrupted[client.value.clientId], undefined))
          )
          return new McpSchema.CallToolResult({ content: [], structuredContent: result })
        })
      })
      const reverseRequests: Array<string | number> = []
      for (const clientId of [0, 1]) {
        yield* harness.send({
          _tag: "Request",
          id: "initialize",
          tag: "initialize",
          payload: {
            protocolVersion: "2025-11-25",
            capabilities: { elicitation: {} },
            clientInfo: { name: `client-${clientId}`, version: "1.0.0" }
          },
          headers: []
        }, clientId)
        const initialized = yield* harness.takeEnvelope
        assert.strictEqual(initialized.clientId, clientId)
        assert.propertyVal(initialized.message, "_tag", "Exit")
        yield* harness.send({
          _tag: "Request",
          id: "",
          tag: "notifications/initialized",
          payload: {},
          isNotification: true,
          headers: []
        }, clientId)
        yield* harness.send({
          _tag: "Request",
          id: "approve",
          tag: "tools/call",
          payload: { name: "Approve", arguments: {} },
          headers: []
        }, clientId)
        const reverse = yield* harness.takeEnvelope
        assert.strictEqual(reverse.clientId, clientId)
        if (reverse.message._tag !== "Request") return assert.fail("Expected an elicitation request")
        assert.strictEqual(reverse.message.tag, "elicitation/create")
        reverseRequests.push(reverse.message.id)
      }

      yield* harness.disconnect
      yield* Deferred.await(interrupted[0])
      yield* TestClock.adjust("1 millis")
      assert.isUndefined(harness.runtime.resolveRequest(0, Headers.empty))
      assert.isDefined(harness.runtime.resolveRequest(1, Headers.empty))
      assert.isFalse(yield* Deferred.isDone(interrupted[1]))
      assert.deepStrictEqual(Array.from(harness.runtime.deliveryClientIds()), [1])

      yield* harness.send({
        _tag: "Exit",
        requestId: reverseRequests[1],
        exit: { _tag: "Success", value: { action: "accept", content: { approved: true } } }
      }, 1)
      const completed = yield* harness.takeEnvelope
      assert.strictEqual(completed.clientId, 1)
      assert.propertyVal(completed.message, "requestId", "approve")
      assert.nestedPropertyVal(completed.message, "exit.value.structuredContent.approved", true)
      assert.isFalse(yield* Deferred.isDone(interrupted[1]))
    }))

  // https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http#receiving-messages
  for (const protocol of [McpProtocol.v2025_11_25, McpProtocol.v2026_07_28]) {
    it.effect(`disables proxy buffering on streamed ${protocol.protocolVersion} results`, () =>
      Effect.gen(function*() {
        const release = yield* Deferred.make<void>()
        const registrations = Layer.effectDiscard(McpServer.McpServer.use((server) =>
          server.addTool({
            tool: new McpSchema.Tool({ name: "Emit", inputSchema: { type: "object" } }),
            annotations: Context.empty(),
            handle: () =>
              server.notifications["notifications/message"]({ level: "error", data: "running" }).pipe(
                Effect.andThen(Deferred.await(release)),
                Effect.as(new McpSchema.CallToolResult({ content: [] }))
              )
          })
        ))
        const harness = yield* makeHttpHarness(registrations.pipe(Layer.provideMerge(
          makeServerLayer({ name: "SseHeaders", protocols: [protocol] })
        )))
        const modern = protocol.runtime._tag === "Stateless"
        const headers = modern
          ? { "mcp-protocol-version": protocol.protocolVersion, "mcp-method": "tools/call", "mcp-name": "Emit" }
          : yield* initializeHttpSession(harness, protocol)
        const response = yield* harness.post({
          jsonrpc: "2.0",
          id: "emit",
          method: "tools/call",
          params: { name: "Emit", ...(modern ? { _meta: modernMetadata } : {}) }
        }, headers)
        const stream = makeMcpSseReader(response)
        yield* Effect.addFinalizer(() => stream.cancel)
        assert.strictEqual(response.headers.get("x-accel-buffering"), "no")
        assert.strictEqual((yield* stream.take()).method, "notifications/message")
        yield* Deferred.succeed(release, undefined)
        assert.propertyVal((yield* stream.drain())[0], "id", "emit")

        // Closing a response cleans up its RPC client, but preserves a legacy HTTP session.
        const listed = yield* harness.post({
          jsonrpc: "2.0",
          id: "list",
          method: "tools/list",
          params: modern ? { _meta: modernMetadata } : {}
        }, modern ? { "mcp-protocol-version": protocol.protocolVersion, "mcp-method": "tools/list" } : headers)
        assert.strictEqual(listed.status, 200)
        assert.isNull(listed.headers.get("x-accel-buffering"))
        assert.nestedProperty(yield* readMcpHttpResponse(listed), "result.tools")
      }))
  }

  for (const allowSubscriptions of [true, false]) {
    it.effect(`disables proxy buffering on ${allowSubscriptions ? "live" : "buffered rejected"} subscription responses`, () =>
      Effect.gen(function*() {
        const harness = yield* makeHttpHarness(McpServer.layerHttp({
          name: "SseSubscriptions",
          version: "1.0.0",
          path: "/mcp",
          protocols: [McpProtocol.v2026_07_28],
          allowSubscriptions
        }))
        const response = yield* harness.post({
          jsonrpc: "2.0",
          id: "listen",
          method: "subscriptions/listen",
          params: { notifications: {}, _meta: modernMetadata }
        }, { "mcp-protocol-version": "2026-07-28", "mcp-method": "subscriptions/listen" })
        const stream = makeMcpSseReader(response)
        yield* Effect.addFinalizer(() => stream.cancel)
        assert.strictEqual(response.headers.get("x-accel-buffering"), "no")
        const message = yield* stream.take()
        if (allowSubscriptions) {
          assert.strictEqual(message.method, "notifications/subscriptions/acknowledged")
        } else {
          assert.nestedPropertyVal(message, "error.code", -32601)
        }
      }))
  }

  it.effect("disables proxy buffering on empty SSE responses after legacy cancellation", () =>
    Effect.gen(function*() {
      const entered = yield* Deferred.make<void>()
      const registrations = Layer.effectDiscard(McpServer.McpServer.use((server) =>
        server.addTool({
          tool: new McpSchema.Tool({ name: "Wait", inputSchema: { type: "object" } }),
          annotations: Context.empty(),
          handle: () => Deferred.succeed(entered, undefined).pipe(Effect.andThen(Effect.never))
        })
      ))
      const harness = yield* makeHttpHarness(registrations.pipe(Layer.provideMerge(
        makeServerLayer({ name: "EmptySse", protocols: [McpProtocol.v2025_11_25] })
      )))
      const headers = yield* initializeHttpSession(harness, McpProtocol.v2025_11_25)
      const pending = yield* harness.post({
        jsonrpc: "2.0",
        id: "wait",
        method: "tools/call",
        params: { name: "Wait" }
      }, headers).pipe(Effect.forkChild)
      yield* Deferred.await(entered)
      const cancelled = yield* harness.post({
        jsonrpc: "2.0",
        method: "notifications/cancelled",
        params: { requestId: "wait" }
      }, headers)
      assert.strictEqual(cancelled.status, 202)
      const response = yield* Fiber.join(pending)
      assert.strictEqual(response.headers.get("content-type"), "text/event-stream")
      assert.strictEqual(response.headers.get("x-accel-buffering"), "no")
      assert.strictEqual(yield* Effect.promise(() => response.text()), "")
    }))
})
