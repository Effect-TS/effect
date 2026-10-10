import { assert, describe, it } from "@effect/vitest"
import {
  type ByteSize,
  type Cause,
  Context,
  Deferred,
  type Duration,
  Effect,
  Exit,
  Fiber,
  Layer,
  Queue,
  SchemaGetter,
  Scope,
  Sink,
  Stream
} from "effect"
import { LanguageModel, Prompt, Response as AiResponse, Tool, type Toolkit } from "effect/ai"
import * as McpClient from "effect/ai/McpClient"
import { McpClientError } from "effect/ai/McpClient"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientError from "effect/http/HttpClientError"
import type * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as PlatformError from "effect/PlatformError"
import * as ChildProcess from "effect/process/ChildProcess"
import * as Spawner from "effect/process/ChildProcessSpawner"
import * as Rpc from "effect/rpc/Rpc"
import * as Schema from "effect/Schema"
import * as TestClock from "effect/testing/TestClock"
import * as TestUtils from "./utils.ts"

const clientInfo = { name: "test", version: "1" }

const serverInfo = { name: "independent-peer", version: "1" }

const modernMeta = { "io.modelcontextprotocol/serverInfo": serverInfo }

const capabilities = {
  tools: { listChanged: true },
  resources: { subscribe: true, listChanged: true },
  prompts: {}
}

const result = (version: McpClient.ProtocolVersion, value: Record<string, unknown>) =>
  version === "2026-07-28" ? { _meta: modernMeta, resultType: "complete", ...value } : value

const profile = { protocolVersion: "2025-11-25", serverInfo, capabilities }

const asRequest = (message: McpSchema.JsonRpcMessage): McpSchema.JsonRpcRequest => {
  assert("method" in message && "id" in message)

  return message as McpSchema.JsonRpcRequest
}

const makeInMemory = (
  options: {
    readonly protocol: McpProtocol.ProtocolAdapter<McpClient.ProtocolVersion>
    readonly maxMessageBytes?: ByteSize.Input
  }
) =>
  Effect.gen(function*() {
    const incoming = yield* Queue.unbounded<unknown, McpClientError>()
    const outgoing = yield* Queue.unbounded<McpSchema.JsonRpcMessage, McpClientError>()

    const peer = yield* makeStdioPeer()
    const transport = yield* McpClient.stdio({
      command: ChildProcess.make("test-mcp-server"),
      protocol: options.protocol,
      maxMessageBytes: options.maxMessageBytes
    }).pipe(Effect.provideService(Spawner.ChildProcessSpawner, peer.spawner))

    yield* Stream.fromQueue(incoming).pipe(
      Stream.runForEach((message) =>
        Queue.offer(peer.output, new TextEncoder().encode(JSON.stringify(message) + "\n"))
      ),
      Effect.catch((error) => Queue.fail(peer.output, error)),
      Effect.forkScoped
    )
    let buffer = ""
    yield* Stream.fromQueue(peer.writes).pipe(
      Stream.runForEach((bytes) =>
        Effect.gen(function*() {
          buffer += new TextDecoder().decode(bytes)
          const lines = buffer.split("\n")
          buffer = lines.pop()!
          for (const line of lines) yield* Queue.offer(outgoing, JSON.parse(line))
        })
      ),
      Effect.forkScoped
    )

    yield* Effect.addFinalizer(() =>
      Effect.gen(function*() {
        yield* Queue.fail(
          incoming,
          new McpClientError({ reason: { _tag: "ClosedError", message: "MCP peer closed" } })
        )
        yield* Queue.fail(
          outgoing,
          new McpClientError({ reason: { _tag: "ClosedError", message: "MCP peer closed" } })
        )
      })
    )

    return {
      stdioPeer: peer,
      transport,
      incoming,
      outgoing,
      nextRequest: Queue.take(outgoing).pipe(Effect.map(asRequest))
    }
  })

// The controlled process speaks JSON-RPC through the public stdio transport.
// Handshake ordering differs by protocol: https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle
const connect = Effect.fnUntraced(function*(
  version: McpClient.ProtocolVersion,
  options: Partial<McpClient.Options> = {},
  transportOptions: { maxMessageBytes?: ByteSize.Input } = {},
  serverCapabilities: McpSchema.ServerCapabilities = capabilities
) {
  const protocol = version === "2026-07-28" ? McpProtocol.v2026_07_28 : McpProtocol.v2025_11_25
  const peer = yield* makeInMemory({ protocol, ...transportOptions })

  const fiber = yield* McpClient.make({ clientInfo, ...options }).pipe(
    Effect.provideService(McpClient.Transport, peer.transport),
    Effect.forkChild
  )

  const nextRequest = peer.nextRequest
  const initial = yield* nextRequest
  assert.strictEqual(initial.method, version === "2026-07-28" ? "server/discover" : "initialize")
  yield* Queue.offer(peer.incoming, {
    jsonrpc: "2.0",
    id: initial.id,
    result: version === "2026-07-28"
      ? result(version, {
        supportedVersions: [version],
        capabilities: serverCapabilities,
        ttlMs: 0,
        cacheScope: "private"
      })
      : { ...profile, capabilities: serverCapabilities }
  })
  const client = yield* Fiber.join(fiber)

  if (version === "2025-11-25") {
    assert.deepStrictEqual(yield* Queue.take(peer.outgoing), { jsonrpc: "2.0", method: "notifications/initialized" })
  }

  const reply = (message: McpSchema.JsonRpcRequest, value: unknown) =>
    Queue.offer(peer.incoming, { jsonrpc: "2.0", id: message.id, result: value })

  return { ...peer, client, nextRequest, reply, initialRequest: initial }
})

type RequestHandler = (
  message: McpSchema.JsonRpcRequest,
  receive: (message: unknown) => Effect.Effect<void, McpClientError>
) => Effect.Effect<void, McpClientError>

const scriptedHttp = (
  protocol: McpProtocol.ProtocolAdapter<McpClient.ProtocolVersion>,
  onRequest: RequestHandler
) =>
  McpClient.http({ url: "http://localhost/mcp", protocol }).pipe(
    Effect.provideService(
      HttpClient.HttpClient,
      HttpClient.make((request) =>
        Effect.gen(function*() {
          if (request.method !== "POST") {
            return HttpClientResponse.fromWeb(request, new Response(null, { status: 405 }))
          }
          assert(request.body._tag === "Uint8Array")
          const message = JSON.parse(new TextDecoder().decode(request.body.body)) as McpSchema.JsonRpcMessage
          if (!("id" in message) || !("method" in message)) {
            return HttpClientResponse.fromWeb(request, new Response(null, { status: 202 }))
          }
          const responses: Array<unknown> = []
          const receive = (value: unknown) =>
            Effect.sync(() => {
              responses.push(value)
            })
          if (message.method === "initialize" || message.method === "server/discover") {
            responses.push({
              jsonrpc: "2.0",
              id: message.id,
              result: protocol.protocolVersion === "2025-11-25"
                ? profile :
                { supportedVersions: ["2026-07-28"], capabilities, ttlMs: 0, cacheScope: "private" }
            })
          } else yield* onRequest(asRequest(message), receive)
          return HttpClientResponse.fromWeb(
            request,
            new Response(JSON.stringify(responses[0]), {
              headers: { "content-type": "application/json" }
            })
          )
        }).pipe(
          Effect.mapError((cause) =>
            new HttpClientError.HttpClientError({ reason: new HttpClientError.TransportError({ request, cause }) })
          )
        )
      )
    )
  )

const chunkedBody = (chunks: ReadonlyArray<string | Uint8Array>) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk)
      }

      controller.close()
    }
  })

const makeStdioPeer = Effect.fnUntraced(function*(exitOnEof = true) {
  const output = yield* Queue.unbounded<Uint8Array, Cause.Done | McpClientError>()
  const writes = yield* Queue.unbounded<Uint8Array>()
  const exit = yield* Deferred.make<Spawner.ExitCode>()
  const ended = yield* Deferred.make<void>()
  const kills: Array<ChildProcess.KillOptions | undefined> = []

  const handle = Spawner.makeHandle({
    pid: Spawner.ProcessId(1),
    stdin: Sink.forEach((bytes: Uint8Array) => Queue.offer(writes, bytes)).pipe(
      Sink.ensuring(
        Deferred.succeed(ended, undefined).pipe(
          Effect.andThen(exitOnEof ? Deferred.succeed(exit, Spawner.ExitCode(0)) : Effect.void)
        )
      )
    ),
    stdout: Stream.fromQueue(output).pipe(
      Stream.mapError((cause) =>
        PlatformError.systemError({ _tag: "Unknown", module: "ChildProcess", method: "stdout", cause })
      )
    ),
    stderr: Stream.empty,
    all: Stream.empty,
    exitCode: Deferred.await(exit),
    isRunning: Effect.succeed(true),
    kill: (options) =>
      Effect.sync(() => kills.push(options)).pipe(
        Effect.andThen(Deferred.succeed(exit, Spawner.ExitCode(0))),
        Effect.asVoid
      ),
    unref: Effect.succeed(Effect.void),
    getInputFd: () => Sink.drain,
    getOutputFd: () => Stream.empty
  })

  const spawner = Spawner.make(() => Effect.succeed(handle))

  return { output, writes, exit, ended, kills, spawner }
})

const tool = (name: string) => ({ name, inputSchema: { type: "object" as const } })

const modernProfile = {
  resultType: "complete",
  _meta: { "io.modelcontextprotocol/serverInfo": serverInfo },
  supportedVersions: ["2026-07-28"],
  capabilities: {},
  ttlMs: 0,
  cacheScope: "private"
}

const rejectedVersion = { requested: "2026-07-28", supported: ["2026-07-28"] }

const discovery = Effect.fnUntraced(function*(timeout = "1 second") {
  const peer = yield* makeInMemory({ protocol: McpProtocol.v2026_07_28 })

  const fiber = yield* McpClient.make({ clientInfo, timeout }).pipe(
    Effect.provideService(McpClient.Transport, peer.transport),
    Effect.result,
    Effect.forkChild
  )

  const takeRequest = Queue.take(peer.outgoing).pipe(Effect.map((message) => {
    assert("method" in message && "id" in message)

    return message as McpSchema.JsonRpcRequest
  }))

  const first = yield* takeRequest

  const reject = (id: McpSchema.RequestId, data: unknown, code = -32022) =>
    Queue.offer(peer.incoming, { jsonrpc: "2.0", id, error: { code, message: "Rejected", data } })

  return { ...peer, fiber, first, takeRequest, reject }
})

describe("McpClient", () => {
  describe("dual operations", () => {
    it.effect.each([false, true])(
      "should preserve structured results when using a client pipeline, data-first=%s",
      (first) =>
        Effect.gen(function*() {
          const peer = yield* connect("2025-11-25")
          const schema = Schema.Struct({ count: Schema.Number })
          const params = { tool: tool("read"), arguments: { file: "report" } }

          const operation = first
            ? McpClient.callTool(peer.client, { ...params, schema: schema })
            : peer.client.pipe(McpClient.callTool({ ...params, schema: schema }))

          const call = yield* operation.pipe(Effect.map((value) => value.count + 1), Effect.forkChild)
          const outgoing = yield* peer.nextRequest
          assert.strictEqual(outgoing.method, "tools/call")
          assert.deepStrictEqual(outgoing.params, { name: "read", arguments: { file: "report" } })
          yield* peer.reply(outgoing, { content: [], structuredContent: { count: 2 } })
          assert.strictEqual(yield* Fiber.join(call), 3)
        })
    )
  })

  it.effect("should validate results when the selected protocol adapter requires an additional field", () =>
    Effect.gen(function*() {
      const protocol = {
        ...McpProtocol.v2025_11_25,
        clientRpcs: {
          ...McpProtocol.v2025_11_25.clientRpcs,
          requests: new Map(McpProtocol.v2025_11_25.clientRpcs.requests).set(
            "tools/list",
            Rpc.make("tools/list", {
              payload: Schema.Struct({}),
              success: Schema.Struct({ tools: Schema.Array(McpSchema.Tool), marker: Schema.String })
            })
          )
        }
      }

      const transport = yield* scriptedHttp(
        protocol,
        (message, receive) => receive({ jsonrpc: "2.0", id: message.id, result: { tools: [] } })
      )

      const client = yield* McpClient.make({ clientInfo }).pipe(
        Effect.provideService(McpClient.Transport, transport)
      )

      const error = yield* client.listTools().pipe(Effect.flip)
      assert(error.reason._tag === "ValidationError")
    }))

  for (const version of ["2025-11-25", "2026-07-28"] as const) {
    describe(version, () => {
      // isError is a tool result, not a JSON-RPC failure; the schema helper adds its own failure policy.
      // https://modelcontextprotocol.io/specification/2025-11-25/server/tools
      // https://modelcontextprotocol.io/specification/2026-07-28/server/tools
      it.effect("should return tool-reported errors when the call result sets isError", () =>
        Effect.gen(function*() {
          const peer = yield* connect(version)

          const call = yield* peer.client.callTool({
            tool: tool("read")
          }).pipe(Effect.forkChild)

          const outgoing = yield* peer.nextRequest
          assert.strictEqual(outgoing.method, "tools/call")

          if (version === "2026-07-28") {
            assert.deepStrictEqual(outgoing.params?._meta, {
              "io.modelcontextprotocol/protocolVersion": version,
              "io.modelcontextprotocol/clientInfo": clientInfo,
              "io.modelcontextprotocol/clientCapabilities": {}
            })
          }

          yield* peer.reply(
            outgoing,
            result(version, {
              content: [{ type: "text", text: "file not found" }, {
                type: "image",
                data: "AQID",
                mimeType: "image/png"
              }],
              isError: true
            })
          )
          const value = yield* Fiber.join(call)
          assert.strictEqual(value.isError, true)
          assert.deepStrictEqual(value.content, [
            { type: "text", text: "file not found" },
            { type: "image", data: new Uint8Array([1, 2, 3]), mimeType: "image/png" }
          ])
        }))

      // The selected dated result schema rejects malformed success payloads.
      // https://modelcontextprotocol.io/specification/2026-07-28/schema#calltoolresult
      it.effect("should fail validation when a tool result violates the dated schema", () =>
        Effect.gen(function*() {
          const peer = yield* connect(version)
          const call = yield* peer.client.callTool({ tool: tool("read") }).pipe(Effect.flip, Effect.forkChild)
          const outgoing = yield* peer.nextRequest
          yield* peer.reply(outgoing, result(version, { content: [{ type: "text", text: 42 }] }))
          assert.strictEqual((yield* Fiber.join(call)).reason._tag, "ValidationError")
        }))
      // Cancellation differs by transport/version; timeout duration and no replay are client policies.
      // https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/cancellation
      // https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/cancellation
      it.effect("should cancel the pending request when the operation deadline expires", () =>
        Effect.gen(function*() {
          const peer = yield* connect(version)
          const call = yield* peer.client.callTool({ tool: tool("slow") }).pipe(Effect.flip, Effect.forkChild)
          const outgoing = yield* peer.nextRequest
          yield* TestClock.adjust("60 seconds")
          assert.strictEqual((yield* Fiber.join(call)).reason._tag, "TimeoutError")
          assert.deepStrictEqual(yield* Queue.take(peer.outgoing), {
            jsonrpc: "2.0",
            method: "notifications/cancelled",
            params: { requestId: outgoing.id }
          })
        }))
      it.effect("should cancel without replay when a tool call is interrupted", () =>
        Effect.gen(function*() {
          const peer = yield* connect(version)
          const call = yield* peer.client.callTool({ tool: tool("write") }).pipe(Effect.forkChild)
          const outgoing = yield* peer.nextRequest
          yield* Fiber.interrupt(call)
          assert.deepStrictEqual(yield* Queue.take(peer.outgoing), {
            jsonrpc: "2.0",
            method: "notifications/cancelled",
            params: { requestId: outgoing.id }
          })
          assert.strictEqual(yield* Queue.size(peer.outgoing), 0)
        }))

      // Cursors are opaque, including an empty string. Stream construction is lazy by client API policy.
      // https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/pagination
      it.effect("should fetch the next tool page when the cursor is an empty string", () =>
        Effect.gen(function*() {
          const peer = yield* connect(version)
          const tools = peer.client.listTools()
          assert.strictEqual(yield* Queue.size(peer.outgoing), 0)
          const listing = yield* tools.pipe(Effect.forkChild)
          const first = yield* peer.nextRequest
          yield* peer.reply(
            first,
            result(version, {
              tools: [{ name: "first", inputSchema: { type: "object" } }],
              nextCursor: "",
              ttlMs: 0,
              cacheScope: "private"
            })
          )
          const next = yield* peer.nextRequest
          assert.strictEqual(next.params?.cursor, "")
          yield* peer.reply(
            next,
            result(version, {
              tools: [{
                name: "last",
                inputSchema: { type: "object", properties: { forbidden: false, anything: true } },
                execution: { taskSupport: "required" }
              }],
              ttlMs: 0,
              cacheScope: "private"
            })
          )
          const discovered = yield* Fiber.join(listing)
          assert.deepStrictEqual(discovered.map((tool) => tool.name), ["first", "last"])
          assert.deepStrictEqual(discovered[1].inputSchema, {
            type: "object",
            properties: { forbidden: false, anything: true }
          })
          assert.deepStrictEqual("execution" in discovered[1] ? discovered[1].execution : undefined, {
            taskSupport: "required"
          })
        }))
    })
  }

  // Remote JSON-RPC errors retain code and data at the caller boundary.
  // https://www.jsonrpc.org/specification#response_object
  it.effect("should preserve error code and data when the server returns a JSON-RPC error", () =>
    Effect.gen(function*() {
      const peer = yield* connect("2025-11-25")
      const call = yield* peer.client.callTool({ tool: tool("missing") }).pipe(Effect.flip, Effect.forkChild)
      const outgoing = yield* peer.nextRequest
      yield* Queue.offer(peer.incoming, {
        jsonrpc: "2.0",
        id: outgoing.id,
        error: { code: -32602, message: "unknown tool", data: { name: "missing" } }
      })
      const error = yield* Fiber.join(call)
      assert(error.reason._tag === "ProtocolError")
      assert.strictEqual(error.reason.code, -32602)
      assert.deepStrictEqual(error.reason.data, { name: "missing" })
    }))

  it.effect("should fail every pending operation when the reader fails", () =>
    Effect.gen(function*() {
      const peer = yield* connect("2025-11-25")
      const first = yield* peer.client.callTool({ tool: tool("one") }).pipe(Effect.flip, Effect.forkChild)
      const second = yield* peer.client.callTool({ tool: tool("two") }).pipe(Effect.flip, Effect.forkChild)
      yield* Queue.take(peer.outgoing)
      yield* Queue.take(peer.outgoing)
      yield* Queue.fail(
        peer.incoming,
        new McpClientError({ reason: { _tag: "TransportError", message: "peer exited" } })
      )
      assert.strictEqual((yield* Fiber.join(first)).reason._tag, "TransportError")
      assert.strictEqual((yield* Fiber.join(second)).reason._tag, "TransportError")
    }))

  // Request correlation must preserve the ID type, not just its text.
  // https://www.jsonrpc.org/specification#response_object
  it.effect("should ignore a string response ID when the request ID is numeric", () =>
    Effect.gen(function*() {
      const peer = yield* connect("2025-11-25")
      const call = yield* peer.client.callTool({ tool: tool("read") }).pipe(Effect.forkChild)
      const outgoing = yield* peer.nextRequest
      yield* Queue.offer(peer.incoming, {
        jsonrpc: "2.0",
        id: String(outgoing.id),
        result: result("2025-11-25", { content: [{ type: "text", text: "wrong" }] })
      })
      yield* peer.reply(outgoing, result("2025-11-25", { content: [{ type: "text", text: "right" }] }))
      assert.deepStrictEqual((yield* Fiber.join(call)).content, [{ type: "text", text: "right" }])
    }))
  // https://modelcontextprotocol.io/specification/2026-07-28/schema#result
  describe("tool results", () => {
    it.effect("should reject interactive input without replay when a modern tool requires continuation", () =>
      Effect.gen(function*() {
        const peer = yield* connect("2026-07-28")
        const call = yield* peer.client.callTool({ tool: tool("approve") }).pipe(Effect.flip, Effect.forkChild)
        const outgoing = yield* peer.nextRequest
        assert.deepStrictEqual(outgoing.params?._meta, {
          "io.modelcontextprotocol/protocolVersion": "2026-07-28",
          "io.modelcontextprotocol/clientInfo": clientInfo,
          "io.modelcontextprotocol/clientCapabilities": {}
        })
        yield* peer.reply(outgoing, { resultType: "input_required", requestState: "approval" })
        assert.strictEqual((yield* Fiber.join(call)).reason._tag, "UnsupportedError")
        assert.strictEqual(yield* Queue.size(peer.outgoing), 0)

        const next = yield* peer.client.callTool({ tool: tool("read") }).pipe(Effect.forkChild)
        yield* peer.reply(yield* peer.nextRequest, { content: [] })
        assert.deepStrictEqual((yield* Fiber.join(next)).content, [])
      }))

    it.effect("should return tool content when a modern result omits identity and resultType", () =>
      Effect.gen(function*() {
        const peer = yield* connect("2026-07-28")
        const client = peer.client
        const call = yield* client.callTool({ tool: tool("read") }).pipe(Effect.forkChild)
        const outgoing = yield* peer.nextRequest
        yield* Queue.offer(peer.incoming, { jsonrpc: "2.0", id: outgoing.id, result: { content: [] } })
        assert.deepStrictEqual((yield* Fiber.join(call)).content, [])
      }))

    it.effect("should fail before decoding when a tool result reports an error", () =>
      Effect.gen(function*() {
        const failedResult = {
          content: [{ type: "text" as const, text: "charge declined" }],
          structuredContent: { paid: false },
          isError: true
        }

        const transport = yield* scriptedHttp(McpProtocol.v2025_11_25, (message, receive) =>
          receive({
            jsonrpc: "2.0",
            id: message.id,
            result: failedResult
          }))

        const client = yield* McpClient.make({ clientInfo }).pipe(
          Effect.provideService(McpClient.Transport, transport)
        )

        const error = yield* client.callTool({ tool: tool("read"), schema: Schema.Unknown }).pipe(Effect.flip)
        assert(error.reason._tag === "ToolError")
        assert.deepStrictEqual(error.reason.result, McpSchema.CallToolResult.make(failedResult))
      }))
  })

  describe("modern result validation", () => {
    for (
      const [name, value, reason] of [
        ["unknown result type", { content: [], resultType: "unknown" }, "ValidationError"],
        ["malformed identity", {
          content: [],
          _meta: { "io.modelcontextprotocol/serverInfo": { name: 1, version: "1" } }
        }, "ValidationError"],
        ["missing input requirements", { resultType: "input_required" }, "ValidationError"],
        ["malformed input identity", {
          resultType: "input_required",
          requestState: "opaque",
          _meta: { "io.modelcontextprotocol/serverInfo": {} }
        }, "ValidationError"],
        ["non-object result", false, "ValidationError"],
        [
          "opaque continuation",
          { resultType: "input_required", requestState: "opaque", _meta: { custom: "value" } },
          "UnsupportedError"
        ]
      ] as const
    ) {
      it.effect(`should reject a tool call when the server returns ${name}`, () =>
        Effect.gen(function*() {
          const client = yield* McpClient.make({ clientInfo }).pipe(
            Effect.provideService(
              McpClient.Transport,
              yield* scriptedHttp(
                McpProtocol.v2026_07_28,
                (message, receive) => receive({ jsonrpc: "2.0", id: message.id, result: value })
              )
            )
          )
          const error = yield* client.callTool({ tool: tool("read") }).pipe(Effect.flip)
          assert.strictEqual(error.reason._tag, reason)
        }))
    }
  })

  describe("deadlines and admission", () => {
    it.effect("should allow a nested tool call when a result decoder calls the same client", () =>
      Effect.gen(function*() {
        const names: Array<unknown> = []
        const transport = yield* scriptedHttp(McpProtocol.v2025_11_25, (message, receive) => {
          names.push(message.params?.name)
          return receive({
            jsonrpc: "2.0",
            id: message.id,
            result: {
              content: [],
              structuredContent: message.params?.name === "outer" ? { name: "inner" } : { value: "decoded" }
            }
          })
        })
        const client = yield* McpClient.make({ clientInfo }).pipe(
          Effect.provideService(McpClient.Transport, transport)
        )
        const schema = Schema.Struct({ name: Schema.String }).pipe(Schema.decodeTo(Schema.String, {
          decode: SchemaGetter.transformEffect(({ name }) =>
            client.callTool({ tool: tool(name), schema: Schema.Struct({ value: Schema.String }) }).pipe(
              Effect.map((result) => result.value),
              Effect.orDie
            )
          ),
          encode: SchemaGetter.transform((name) => ({ name }))
        }))
        assert.strictEqual(yield* client.callTool({ tool: tool("outer"), schema: schema }), "decoded")
        assert.deepStrictEqual(names, ["outer", "inner"])
      }))

    it.effect("should time out at the original deadline when structured result decoding blocks", () =>
      Effect.gen(function*() {
        const peer = yield* connect("2026-07-28")
        const decoding = yield* Deferred.make<void>()

        const schema = Schema.String.pipe(Schema.decodeTo(Schema.Number, {
          decode: SchemaGetter.transformEffect(() =>
            Deferred.succeed(decoding, undefined).pipe(Effect.andThen(Effect.never))
          ),
          encode: SchemaGetter.transform(String)
        }))

        const call = yield* peer.client.callTool({ tool: tool("read"), schema: schema }).pipe(
          Effect.flip,
          Effect.forkChild
        )

        const outgoing = yield* peer.nextRequest
        yield* TestClock.adjust("40 seconds")
        yield* peer.reply(outgoing, result("2026-07-28", { content: [], structuredContent: "42" }))
        yield* Deferred.await(decoding)
        yield* TestClock.adjust("20 seconds")
        assert.strictEqual((yield* Fiber.join(call)).reason._tag, "TimeoutError")
      }))

    it.effect("should admit other operations when terminal structured content is being decoded", () =>
      Effect.gen(function*() {
        const peer = yield* connect("2026-07-28")
        const started = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()

        const schema = Schema.String.pipe(Schema.decodeTo(Schema.Number, {
          decode: SchemaGetter.transformEffect(() =>
            Deferred.succeed(started, undefined).pipe(
              Effect.andThen(Deferred.await(release)),
              Effect.as(42)
            )
          ),
          encode: SchemaGetter.transform(String)
        }))

        const first = yield* peer.client.callTool({ tool: tool("read"), schema: schema }).pipe(Effect.forkChild)
        yield* peer.reply(
          yield* peer.nextRequest,
          result("2026-07-28", { content: [], structuredContent: "42" })
        )
        yield* Deferred.await(started)

        const second = yield* peer.client.callTool({ tool: tool("other") }, { timeout: "1 second" }).pipe(
          Effect.forkChild
        )

        const outgoing = yield* peer.nextRequest
        assert.strictEqual(outgoing.params?.name, "other")
        yield* peer.reply(outgoing, result("2026-07-28", { content: [] }))
        assert.deepStrictEqual((yield* Fiber.join(second)).content, [])
        yield* Deferred.succeed(release, undefined)
        assert.strictEqual(yield* Fiber.join(first), 42)
      }))
  })

  describe("construction and shutdown", () => {
    it.effect("should decline interactive requests and answer ping when a legacy server initiates requests", () =>
      Effect.gen(function*() {
        const peer = yield* connect("2025-11-25")
        assert.deepStrictEqual(peer.initialRequest.params?.capabilities, {})
        for (const method of ["roots/list", "sampling/createMessage", "elicitation/create", "unknown/method"]) {
          yield* Queue.offer(peer.incoming, { jsonrpc: "2.0", id: method, method, params: {} })
          const response = yield* Queue.take(peer.outgoing)
          assert("error" in response)
          assert.strictEqual(response.id, method)
          assert.strictEqual(response.error.code, McpSchema.METHOD_NOT_FOUND_ERROR_CODE)
        }
        yield* Queue.offer(peer.incoming, { jsonrpc: "2.0", id: "ping", method: "ping" })
        assert.deepStrictEqual(yield* Queue.take(peer.outgoing), { jsonrpc: "2.0", id: "ping", result: {} })
        const call = yield* peer.client.callTool({ tool: tool("read") }).pipe(Effect.forkChild)
        yield* peer.reply(yield* peer.nextRequest, { content: [] })
        assert.deepStrictEqual((yield* Fiber.join(call)).content, [])
      }))

    it.effect("should continue tool calls when unsolicited notifications arrive", () =>
      Effect.gen(function*() {
        const peer = yield* connect("2025-11-25")
        const call = yield* peer.client.callTool({ tool: tool("read") }).pipe(Effect.forkChild)
        const outgoing = yield* peer.nextRequest
        yield* Queue.offer(peer.incoming, {
          jsonrpc: "2.0",
          method: "notifications/progress",
          params: { progressToken: "read", progress: 1 }
        })
        yield* peer.reply(outgoing, { content: [] })
        assert.deepStrictEqual((yield* Fiber.join(call)).content, [])
      }))

    it.effect("should release pending operations when the client scope closes", () =>
      Effect.gen(function*() {
        const scope = yield* Scope.make()
        const peer = yield* connect("2025-11-25").pipe(Effect.provideService(Scope.Scope, scope))
        const call = yield* peer.client.callTool({ tool: tool("read") }).pipe(Effect.flip, Effect.forkChild)
        yield* Queue.take(peer.outgoing)
        yield* Scope.close(scope, Exit.void)
        assert.strictEqual((yield* Fiber.join(call)).reason._tag, "ClosedError")
      }))

    // Initialize must never be cancelled by a cancellation notification.
    // https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/cancellation
    it.effect("should omit cancellation when legacy client initialization is interrupted", () =>
      Effect.gen(function*() {
        const peer = yield* makeInMemory({ protocol: McpProtocol.v2025_11_25 })

        const client = yield* McpClient.make({
          clientInfo: McpSchema.Implementation.make({ name: "test", version: "1" })
        }).pipe(
          Effect.provideService(McpClient.Transport, peer.transport),
          Effect.forkChild
        )

        assert.strictEqual((yield* peer.nextRequest).method, "initialize")
        yield* Fiber.interrupt(client)
        assert.strictEqual(yield* Queue.size(peer.outgoing), 0)
      }))

    // Modern discovery identity fields are optional.
    // https://modelcontextprotocol.io/specification/2026-07-28/basic/index
    // https://modelcontextprotocol.io/specification/2026-07-28/schema#discoverresult
    it.effect("should connect without server identity when modern discovery omits optional fields", () =>
      Effect.gen(function*() {
        const peer = yield* makeInMemory({ protocol: McpProtocol.v2026_07_28 })

        const connecting = yield* McpClient.make({
          clientInfo: McpSchema.Implementation.make({ name: "test", version: "1" })
        }).pipe(
          Effect.provideService(McpClient.Transport, peer.transport),
          Effect.forkChild
        )

        const initial = yield* peer.nextRequest
        yield* Queue.offer(peer.incoming, {
          jsonrpc: "2.0",
          id: initial.id,
          result: {
            supportedVersions: ["2026-07-28"],
            capabilities,
            ttlMs: 0,
            cacheScope: "private"
          }
        })
        const client = yield* Fiber.join(connecting)
        assert.strictEqual(client.serverInfo, undefined)
      }))
    describe("initial discovery recovery", () => {
      it.effect("should retry discovery with a fresh ID when rejection supports the selected version", () =>
        Effect.gen(function*() {
          const peer = yield* discovery()
          yield* peer.reject(peer.first.id, rejectedVersion)
          const second = yield* peer.takeRequest
          assert.notStrictEqual(second.id, peer.first.id)
          assert.strictEqual(second.method, "server/discover")
          assert.deepStrictEqual(second.params, peer.first.params)
          yield* Queue.offer(peer.incoming, { jsonrpc: "2.0", id: second.id, result: modernProfile })
          const outcome = yield* Fiber.join(peer.fiber)
          assert(outcome._tag === "Success")
        }))

      it.effect("should expose the second rejection when discovery recovery is exhausted", () =>
        Effect.gen(function*() {
          const peer = yield* discovery()
          yield* peer.reject(peer.first.id, rejectedVersion)
          const second = yield* peer.takeRequest
          yield* peer.reject(second.id, rejectedVersion)
          const outcome = yield* Fiber.join(peer.fiber)
          assert(outcome._tag === "Failure")
          assert(outcome.failure.reason._tag === "ProtocolError")
          assert.strictEqual(outcome.failure.reason.code, -32022)
          assert.deepStrictEqual(outcome.failure.reason.data, rejectedVersion)
          assert.strictEqual(yield* Queue.size(peer.outgoing), 0)
        }))

      it.effect.each([
        { condition: "data is absent", data: undefined, code: -32022 },
        {
          condition: "supported versions are malformed",
          data: { requested: "2026-07-28", supported: [1] },
          code: -32022
        },
        {
          condition: "requested version differs",
          data: { requested: "2025-11-25", supported: ["2026-07-28"] },
          code: -32022
        },
        {
          condition: "selected version is unsupported",
          data: { requested: "2026-07-28", supported: ["2025-11-25"] },
          code: -32022
        },
        { condition: "error code differs", data: rejectedVersion, code: -32603 }
      ])(
        "should preserve rejection without retry when $condition",
        ({ data, code }) =>
          Effect.gen(function*() {
            const peer = yield* discovery()
            yield* peer.reject(peer.first.id, data, code)
            const outcome = yield* Fiber.join(peer.fiber)
            assert(outcome._tag === "Failure")
            assert(outcome.failure.reason._tag === "ProtocolError")
            assert.strictEqual(outcome.failure.reason.code, code)
            assert.deepStrictEqual(outcome.failure.reason.data, data)
            assert.strictEqual(yield* Queue.size(peer.outgoing), 0)
          })
      )

      it.effect("should retain the original deadline when discovery retries after part of its timeout", () =>
        Effect.gen(function*() {
          const peer = yield* discovery()
          yield* TestClock.adjust("400 millis")
          yield* peer.reject(peer.first.id, rejectedVersion)
          yield* peer.takeRequest
          yield* TestClock.adjust("600 millis")
          const outcome = yield* Fiber.join(peer.fiber)
          assert(outcome._tag === "Failure")
          assert.strictEqual(outcome.failure.reason._tag, "TimeoutError")
        }))
    })
  })
})

const descriptor = (name: string) =>
  McpSchema.Tool.make({
    name,
    description: "Read a report",
    inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }
  })

const envelope = Schema.decodeUnknownSync(McpSchema.CallToolResult)

const peer = Effect.fnUntraced(function*(options: {
  readonly tools?: ReadonlyArray<McpSchema.Tool>
  readonly result?: McpSchema.CallToolResult
  readonly failure?: McpClientError
} = {}) {
  const tools = options.tools ?? [descriptor("read")]
  const result = options.result ?? envelope({ content: [{ type: "text", text: "done" }] })
  const wireResult = yield* Schema.encodeEffect(McpSchema.CallToolResult)(result)
  const wireTools = yield* Effect.forEach(tools, (tool) => Schema.encodeEffect(McpSchema.Tool)(tool))
  const calls: Array<{ readonly params: unknown }> = []
  const transport = yield* scriptedHttp(McpProtocol.v2025_11_25, (message, receive) => {
    if (message.method === "tools/list") {
      const cursor = (message.params as { cursor?: string } | undefined)?.cursor
      return receive({
        jsonrpc: "2.0",
        id: message.id,
        result: cursor === undefined
          ? { tools: wireTools.slice(0, 1), ...(tools.length > 1 ? { nextCursor: "second" } : {}) }
          : { tools: wireTools.slice(1) }
      })
    }
    assert.strictEqual(message.method, "tools/call")
    calls.push({ params: message.params })
    return options.failure === undefined
      ? receive({ jsonrpc: "2.0", id: message.id, result: wireResult })
      : Effect.fail(options.failure)
  })
  const client = yield* McpClient.make({ clientInfo }).pipe(Effect.provideService(McpClient.Transport, transport))
  return { client, calls, tools }
})

const handle = <Tools extends Record<string, Tool.Any>>(
  toolkit: Toolkit.WithHandler<Tools>,
  name: keyof Tools,
  params: unknown
) => toolkit.handle(name, params as Tool.ParametersEncoded<Tools[keyof Tools]>).pipe(Effect.flatMap(Stream.runCollect))

describe("McpClient.toolkit", () => {
  it.effect("should discover every page and dispatch the selected descriptor when tool names are prefixed", () =>
    Effect.gen(function*() {
      const remote = yield* peer({ tools: [descriptor("read"), descriptor("other")] })
      const toolkit = yield* McpClient.toolkit(remote.client, "reports__")
      assert.deepStrictEqual(Object.keys(toolkit.tools), ["reports__read", "reports__other"])
      assert.deepStrictEqual(Tool.getJsonSchema(toolkit.tools.reports__other), remote.tools[1].inputSchema)
      assert.strictEqual(Context.get(toolkit.tools.reports__other.annotations, Tool.Strict), false)
      const output = yield* handle(toolkit, "reports__other", { path: "quarterly", extra: "retained" })
      assert.strictEqual(output[0].result, "done")
      assert.strictEqual(output[0].encodedResult, "done")
      assert.strictEqual(output[0].isFailure, false)
      assert.deepStrictEqual(remote.calls[0].params, {
        name: "other",
        arguments: { path: "quarterly", extra: "retained" }
      })
    }))

  it.effect("should fail construction without invoking a tool when names are invalid or duplicate", () =>
    Effect.gen(function*() {
      for (const tools of [[descriptor("bad name")], [descriptor("read"), descriptor("read")]]) {
        const remote = yield* peer({ tools })
        const error = yield* McpClient.toolkit(remote.client).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "ConfigurationError")
        assert.deepStrictEqual(remote.calls, [])
      }
    }))

  it.effect("should reject arguments before remote dispatch when they are not JSON objects", () =>
    Effect.gen(function*() {
      const remote = yield* peer()
      const toolkit = yield* McpClient.toolkit(remote.client)
      for (const params of [null, [], "wrong", { value: 1n }]) {
        const error = yield* handle(toolkit, "read", params).pipe(Effect.flip)
        assert(error instanceof McpClientError)
        assert.strictEqual(error.reason._tag, "ValidationError")
      }
      assert.deepStrictEqual(remote.calls, [])
    }))

  it.effect("should retain failures without replay when remote tool execution fails", () =>
    Effect.gen(function*() {
      const result = envelope({ content: [{ type: "text", text: "denied" }], isError: true })
      const remote = yield* peer({ result })
      const toolkit = yield* McpClient.toolkit(remote.client)
      const error = yield* handle(toolkit, "read", {}).pipe(Effect.flip)
      assert(error instanceof McpClientError)
      assert(error.reason._tag === "ToolError")
      assert.deepStrictEqual(error.reason.result, result)
      assert.strictEqual(remote.calls.length, 1)

      const failure = new McpClientError({ reason: { _tag: "TransportError", message: "Disconnected" } })
      const offline = yield* peer({ failure })
      const offlineToolkit = yield* McpClient.toolkit(offline.client)
      assert.strictEqual((yield* handle(offlineToolkit, "read", {}).pipe(Effect.flip)).reason._tag, "TransportError")
      assert.strictEqual(offline.calls.length, 1)
    }))

  it.effect("should convert text and preserve unsupported results when MCP content contains different block types", () =>
    Effect.gen(function*() {
      const cases = [
        {
          result: envelope({
            content: [
              { type: "text", text: "First" },
              { type: "resource_link", name: "Report", uri: "https://example.com/report" },
              { type: "resource", resource: { uri: "memory:note", text: "Note" } }
            ],
            structuredContent: { excluded: true }
          }),
          text: "First\nReport: https://example.com/report\nNote"
        },
        { result: envelope({ content: [], structuredContent: { count: 2 } }), text: "{\"count\":2}" }
      ]
      for (const { result, text } of cases) {
        const remote = yield* peer({ result })
        const toolkit = yield* McpClient.toolkit(remote.client)
        assert.strictEqual((yield* handle(toolkit, "read", {}))[0].result, text)
      }
      const result = envelope({ content: [{ type: "image", data: "AA==", mimeType: "image/png" }] })
      const remote = yield* peer({ result })
      const toolkit = yield* McpClient.toolkit(remote.client)
      const error = yield* handle(toolkit, "read", {}).pipe(Effect.flip)
      assert(error instanceof McpClientError)
      assert(error.reason._tag === "UnsupportedError")
      assert.deepStrictEqual(error.reason.result, result)
    }))

  it.effect("should preserve converted text in conversation history when a language model executes an MCP tool", () =>
    Effect.gen(function*() {
      const remote = yield* peer()
      const toolkit = yield* McpClient.toolkit(remote.client)
      const response = yield* LanguageModel.generateText({ prompt: "Read the report", toolkit }).pipe(
        TestUtils.withLanguageModel({ generateText: [{ type: "tool-call", id: "call-1", name: "read", params: {} }] })
      )
      const result = response.content.find((part) => part.type === "tool-result")
      assert(result !== undefined && result.type === "tool-result")
      const codec = Schema.fromJsonString(AiResponse.AllParts(toolkit))
      const restored = yield* Schema.decodeUnknownEffect(codec)(yield* Schema.encodeEffect(codec)(result))
      assert(restored.type === "tool-result")
      assert.strictEqual(restored.result, "done")
      assert.strictEqual(restored.isFailure, false)
      const historyCodec = Schema.fromJsonString(Prompt.Prompt)
      const history = yield* Schema.decodeUnknownEffect(historyCodec)(
        yield* Schema.encodeEffect(historyCodec)(Prompt.fromResponseParts([restored]))
      )
      const message = history.content[0]
      assert(message.role === "tool")
      const part = message.content[0]
      assert(part.type === "tool-result")
      assert.strictEqual(part.result, "done")
      assert.strictEqual(remote.calls.length, 1)
    }))
})

for (const protocol of [McpProtocol.v2025_11_25, McpProtocol.v2026_07_28]) {
  const make = Effect.fnUntraced(function*(onRequest: RequestHandler, timeout: Duration.Input = "60 seconds") {
    const transport = yield* scriptedHttp(protocol, onRequest)
    return yield* McpClient.make({ clientInfo, timeout }).pipe(Effect.provideService(McpClient.Transport, transport))
  })

  describe(`bounded tools discovery ${protocol.protocolVersion}`, () => {
    it.effect("should collect fresh complete tools when discovery is called again", () =>
      Effect.gen(function*() {
        let scan = 0
        const client = yield* make((request, receive) => {
          const cursor = request.params?.cursor
          if (cursor === undefined) scan++
          return receive({
            jsonrpc: "2.0",
            id: request.id,
            result: result(protocol.protocolVersion, {
              tools: [tool(`${scan}-${cursor === undefined ? "first" : "last"}`)],
              ...(cursor === undefined ? { nextCursor: "" } : {}),
              ttlMs: 0,
              cacheScope: "private"
            })
          })
        })
        assert.strictEqual(scan, 0)
        assert.deepStrictEqual((yield* client.listTools()).map((tool) => tool.name), ["1-first", "1-last"])
        assert.deepStrictEqual((yield* client.listTools()).map((tool) => tool.name), ["2-first", "2-last"])
      }))

    for (const limit of ["cursor", "pages", "tools"] as const) {
      it.effect(`should fail without emitting partial tools when discovery exceeds the ${limit} limit`, () =>
        Effect.gen(function*() {
          let pages = 0
          const emitted: Array<string> = []
          const client = yield* make((request, receive) => {
            pages++
            return receive({
              jsonrpc: "2.0",
              id: request.id,
              result: result(protocol.protocolVersion, {
                tools: limit === "tools" ? Array.from({ length: 10_001 }, (_, i) => tool(String(i))) : [tool("first")],
                ...(limit === "tools" ? {} : { nextCursor: limit === "cursor" ? "again" : String(pages) }),
                ttlMs: 0,
                cacheScope: "private"
              })
            })
          })
          const error = yield* client.listTools().pipe(
            Effect.tap((tools) => Effect.sync(() => emitted.push(...tools.map((tool) => tool.name)))),
            Effect.flip
          )
          assert.strictEqual(error.reason._tag, "LimitError")
          assert.strictEqual(pages, limit === "pages" ? 100 : limit === "cursor" ? 2 : 1)
          assert.deepStrictEqual(emitted, [])
        }))
    }

    it.effect("should share one discovery deadline when successive pages each use part of the timeout", () =>
      Effect.gen(function*() {
        const secondPage = yield* Deferred.make<void>()
        let pages = 0
        const client = yield* make((request, receive) => {
          pages++
          return pages === 1
            ? Effect.sleep("400 millis").pipe(Effect.andThen(receive({
              jsonrpc: "2.0",
              id: request.id,
              result: result(protocol.protocolVersion, {
                tools: [tool("first")],
                nextCursor: "next",
                ttlMs: 0,
                cacheScope: "private"
              })
            })))
            : Deferred.succeed(secondPage, undefined).pipe(Effect.andThen(Effect.never))
        }, "1 second")
        const collecting = yield* client.listTools().pipe(Effect.flip, Effect.forkChild)
        yield* TestClock.adjust("400 millis")
        yield* Deferred.await(secondPage)
        yield* TestClock.adjust("600 millis")
        assert.strictEqual((yield* Fiber.join(collecting)).reason._tag, "TimeoutError")
      }))
  })
}

const jsonResponse = (message: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(message), { headers: { "content-type": "application/json", ...headers } })

const httpTransport = (reply: (request: HttpClientRequest.HttpClientRequest) => Effect.Effect<Response>, options: {
  protocol?: McpProtocol.ProtocolAdapter<McpClient.ProtocolVersion>
  maxMessageBytes?: ByteSize.Input
  headers?: Readonly<Record<string, string>>
} = {}) =>
  McpClient.http({
    url: "http://localhost/mcp",
    protocol: options.protocol ?? McpProtocol.v2026_07_28,
    maxMessageBytes: options.maxMessageBytes,
    headers: options.headers
  }).pipe(Effect.provideService(
    HttpClient.HttpClient,
    HttpClient.make((request) =>
      reply(request).pipe(Effect.map((response) => HttpClientResponse.fromWeb(request, response)))
    )
  ))

const httpMessage = (request: HttpClientRequest.HttpClientRequest) => {
  assert(request.body._tag === "Uint8Array")
  return JSON.parse(new TextDecoder().decode(request.body.body)) as McpSchema.JsonRpcRequest
}

const connectHttp = Effect.fnUntraced(function*(
  reply: (
    message: McpSchema.JsonRpcRequest,
    request: HttpClientRequest.HttpClientRequest
  ) => Effect.Effect<Response>,
  options: {
    protocol?: McpProtocol.ProtocolAdapter<McpClient.ProtocolVersion>
    maxMessageBytes?: ByteSize.Input
    headers?: Readonly<Record<string, string>>
    timeout?: Duration.Input
    session?: string
    onDelete?: () => Effect.Effect<Response>
    onNotification?: (message: McpSchema.JsonRpcMessage) => Effect.Effect<Response>
  } = {}
) {
  const protocol = options.protocol ?? McpProtocol.v2026_07_28
  const requests: Array<HttpClientRequest.HttpClientRequest> = []
  const replyHttp = (request: HttpClientRequest.HttpClientRequest) => {
    requests.push(request)
    if (request.method === "DELETE") return options.onDelete?.() ?? Effect.succeed(new Response(null, { status: 204 }))
    const message = httpMessage(request)
    if (message.method === "initialize" || message.method === "server/discover") {
      return Effect.succeed(
        jsonResponse({
          jsonrpc: "2.0",
          id: message.id,
          result: protocol.protocolVersion === "2025-11-25"
            ? profile :
            result("2026-07-28", { supportedVersions: ["2026-07-28"], capabilities, ttlMs: 0, cacheScope: "private" })
        }, options.session ? { "mcp-session-id": options.session } : {})
      )
    }
    if (!("id" in message)) {
      return options.onNotification?.(message) ?? Effect.succeed(new Response(null, { status: 202 }))
    }
    return reply(message, request)
  }
  const httpClient = HttpClient.make((request) =>
    replyHttp(request).pipe(Effect.map((response) => HttpClientResponse.fromWeb(request, response)))
  )
  const context = yield* Layer.build(
    McpClient.layerHttp({
      clientInfo,
      protocol,
      url: "http://localhost/mcp",
      headers: options.headers,
      maxMessageBytes: options.maxMessageBytes,
      ...(options.timeout === undefined ? {} : { timeout: options.timeout })
    }).pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, httpClient)))
  )
  const client = Context.get(context, McpClient.McpClient)
  return { client, requests }
})

describe("McpClient HTTP delivery", () => {
  for (const media of ["application/json", "Application/JSON; charset=utf-8", "Text/Event-Stream; charset=utf-8"]) {
    it.effect(`should return discovered tools when the response media type is ${media}`, () =>
      Effect.gen(function*() {
        const peer = yield* connectHttp((message) => {
          const body = JSON.stringify({
            jsonrpc: "2.0",
            id: message.id,
            result: { ttlMs: 0, cacheScope: "private", tools: [tool("read")] }
          })
          return Effect.succeed(
            new Response(media.toLowerCase().startsWith("text/") ? `data: ${body}\n\n` : body, {
              headers: { "content-type": media }
            })
          )
        })
        assert.deepStrictEqual((yield* peer.client.listTools()).map((tool) => tool.name), ["read"])
      }))
  }

  it.effect("should preserve buffered SSE data when retry directives arrive between fragmented data fields", () =>
    Effect.gen(function*() {
      const peer = yield* connectHttp((message) => {
        const json = JSON.stringify({
          jsonrpc: "2.0",
          id: message.id,
          result: { ttlMs: 0, cacheScope: "private", tools: [] }
        })
        return Effect.succeed(
          new Response(
            chunkedBody([
              `id: event-1\ndata: ${json.slice(0, 16)}\nretry: 1000\n`,
              `data: ${json.slice(16)}\n\n`
            ]),
            { headers: { "content-type": "text/event-stream" } }
          )
        )
      })
      assert.deepStrictEqual(yield* peer.client.listTools(), [])
    }))

  it.effect("should enforce UTF-8 JSON byte limits when SSE arrives in different chunk layouts", () =>
    Effect.gen(function*() {
      const value = { ttlMs: 0, cacheScope: "private", tools: [tool("世界".repeat(100))] }
      const json = JSON.stringify({ jsonrpc: "2.0", id: 2, result: value })
      const bytes = new TextEncoder().encode(json).length
      for (const size of [bytes, bytes - 1]) {
        const body = `data: ${json}\n\n`
        for (const chunks of [[body], [`data: ${json}`, "\n\n"], Array.from(body)]) {
          const peer = yield* connectHttp(() =>
            Effect.succeed(
              new Response(chunkedBody(chunks), {
                headers: { "content-type": "text/event-stream" }
              })
            ), { maxMessageBytes: size })
          if (size === bytes) assert.strictEqual((yield* peer.client.listTools())[0].name, value.tools[0].name)
          else assert.strictEqual((yield* peer.client.listTools().pipe(Effect.flip)).reason._tag, "LimitError")
        }
      }
    }))

  it.effect("should ignore SSE metadata when fields span chunks and use different line endings", () =>
    Effect.gen(function*() {
      const value = { ttlMs: 0, cacheScope: "private", tools: [tool("x".repeat(400))] }
      const json = JSON.stringify({ jsonrpc: "2.0", id: 2, result: value })
      const bytes = new TextEncoder().encode(json).length
      for (const field of [": ", "id: ", "event: ", "retry: ", "extension: "]) {
        for (const ending of ["\n", "\r", "\r\n"]) {
          const peer = yield* connectHttp(() =>
            Effect.succeed(
              new Response(
                chunkedBody([
                  `data: ${json}${ending}`,
                  field,
                  "x".repeat(bytes * 2),
                  ending,
                  ending
                ]),
                { headers: { "content-type": "text/event-stream" } }
              )
            ), { maxMessageBytes: bytes })
          assert.strictEqual((yield* peer.client.listTools())[0].name, value.tools[0].name)
        }
      }
    }))

  for (const trailing of ["malformed complete event", "oversized partial line"] as const) {
    it.effect(`should finish discovery when the terminal SSE result precedes a ${trailing}`, () =>
      Effect.gen(function*() {
        const peer = yield* connectHttp((message) =>
          Effect.succeed(
            new Response(
              chunkedBody([
                `data: ${
                  JSON.stringify({
                    jsonrpc: "2.0",
                    id: message.id,
                    result: { ttlMs: 0, cacheScope: "private", tools: [] }
                  })
                }\n\n` +
                (trailing === "malformed complete event" ? "data: invalid-json\n\n" : `data: ${"x".repeat(1100)}`)
              ]),
              { headers: { "content-type": "text/event-stream" } }
            )
          ), { maxMessageBytes: 1024 })
        assert.deepStrictEqual(yield* peer.client.listTools(), [])
      }))
  }

  for (const body of ["oversized JSON", "unfinished SSE"]) {
    it.effect(`should reject discovery when the server sends ${body}`, () =>
      Effect.gen(function*() {
        const peer = yield* connectHttp((message) =>
          Effect.succeed(
            new Response(
              body === "oversized JSON" ?
                JSON.stringify({
                  jsonrpc: "2.0",
                  id: message.id,
                  result: { ttlMs: 0, cacheScope: "private", tools: [tool("x".repeat(2000))] }
                })
                : `data: ${"x".repeat(3000)}`,
              { headers: { "content-type": body === "oversized JSON" ? "application/json" : "text/event-stream" } }
            )
          ), { maxMessageBytes: 1024 })
        assert.strictEqual((yield* peer.client.listTools().pipe(Effect.flip)).reason._tag, "LimitError")
      }))
  }

  for (const response of ["empty acknowledgment", "unsupported media", "missing terminal result"]) {
    it.effect(`should fail discovery when the server sends an ${response}`, () =>
      Effect.gen(function*() {
        const peer = yield* connectHttp(() =>
          Effect.succeed(
            response === "empty acknowledgment" ?
              new Response(null, { status: 202 })
              : new Response(response === "unsupported media" ? "text" : ": comment\n\n", {
                headers: { "content-type": response === "unsupported media" ? "text/plain" : "text/event-stream" }
              })
          )
        )
        const error = yield* peer.client.listTools().pipe(Effect.flip)
        assert.strictEqual(
          error.reason._tag,
          response === "missing terminal result" ? "TransportError" : "ProtocolError"
        )
      }))
  }

  it.effect("should reject both calls when concurrent HTTP exchanges receive each other's response IDs", () =>
    Effect.gen(function*() {
      const peer = yield* connectHttp((message) =>
        Effect.succeed(jsonResponse({
          jsonrpc: "2.0",
          id: message.id === 2 ? 3 : 2,
          result: { ttlMs: 0, cacheScope: "private", tools: [] }
        }))
      )
      const failures = yield* Effect.all([
        peer.client.listTools().pipe(Effect.flip),
        peer.client.listTools().pipe(Effect.flip)
      ], { concurrency: "unbounded" })
      assert.deepStrictEqual(failures.map((error) => error.reason._tag), ["ProtocolError", "ProtocolError"])
    }))

  it.effect("should continue discovery when server cancellation arrives before the terminal HTTP response", () =>
    Effect.gen(function*() {
      const peer = yield* connectHttp((message) =>
        Effect.succeed(
          new Response(
            `data: ${
              JSON.stringify({ jsonrpc: "2.0", method: "notifications/cancelled", params: { requestId: message.id } })
            }\n\n` +
              `data: ${
                JSON.stringify({
                  jsonrpc: "2.0",
                  id: message.id,
                  result: { ttlMs: 0, cacheScope: "private", tools: [] }
                })
              }\n\n`,
            { headers: { "content-type": "text/event-stream" } }
          )
        ), { protocol: McpProtocol.v2025_11_25 })
      assert.deepStrictEqual(yield* peer.client.listTools(), [])
    }))

  for (
    const [status, filtered, body] of [
      [401, false, "json-rpc"],
      [403, true, "json-rpc"],
      [401, true, "plain"],
      [403, false, "malformed"],
      [403, true, "oversized"],
      [400, false, "non-envelope"]
    ] as const
  ) {
    it.effect(`should preserve safe rejection details when HTTP ${status} has ${body} content and filtered=${filtered}`, () =>
      Effect.gen(function*() {
        let attempts = 0
        const remote = { jsonrpc: "2.0", id: 1, error: { code: -32000, message: "Denied", data: { scope: "tools" } } }
        const client = HttpClient.make((request) =>
          Effect.sync(() => {
            attempts++
            const content = body === "json-rpc" ? JSON.stringify(remote) : body === "non-envelope" ?
              JSON.stringify({ error: remote.error })
              : body === "oversized"
              ? "x".repeat(2000)
              : "denied"
            return HttpClientResponse.fromWeb(
              request,
              new Response(content, {
                status,
                headers: {
                  "content-type": body === "plain" ? "text/plain" : "Application/JSON; charset=utf-8",
                  "www-authenticate": "Bearer realm=\"tools\"",
                  "retry-after": "30",
                  "set-cookie": "secret-response-cookie"
                }
              })
            )
          })
        ).pipe(
          HttpClient.mapRequest((request) => ({
            ...request,
            headers: { ...request.headers, authorization: "secret-request-token" }
          }))
        )
        const transport = yield* McpClient.http({
          url: "http://localhost/mcp",
          protocol: McpProtocol.v2026_07_28,
          maxMessageBytes: 1024
        }).pipe(
          Effect.provideService(HttpClient.HttpClient, filtered ? HttpClient.filterStatusOk(client) : client)
        )
        const error = yield* McpClient.make({ clientInfo }).pipe(
          Effect.provideService(McpClient.Transport, transport),
          Effect.flip
        )
        assert(error.reason._tag === "HttpError")
        assert.strictEqual(error.reason.status, status)
        assert.strictEqual(error.reason.wwwAuthenticate, "Bearer realm=\"tools\"")
        assert.strictEqual(error.reason.retryAfter, "30")
        assert.strictEqual(error.reason.code, body === "json-rpc" ? -32000 : undefined)
        assert.deepStrictEqual(error.reason.data, body === "json-rpc" ? { scope: "tools" } : undefined)
        assert.strictEqual(error.message, body === "json-rpc" ? "Denied" : `MCP HTTP status ${status}`)
        assert.isFalse(JSON.stringify(error).includes("secret-"))
        assert.strictEqual(attempts, 1)
      }))
  }

  for (const phase of ["initialization", "discovery"] as const) {
    it.effect(`should retain HTTP status when optional error details stall during ${phase}`, () =>
      Effect.gen(function*() {
        const received = yield* Deferred.make<void>()
        let cancelled = false
        const rejection = () =>
          Deferred.succeed(received, undefined).pipe(Effect.as(
            new Response(
              new ReadableStream({
                cancel() {
                  cancelled = true
                }
              }),
              { status: 401, headers: { "content-type": "application/json", "www-authenticate": "Bearer" } }
            )
          ))
        const transport = yield* httpTransport((request) => {
          const message = httpMessage(request)
          if (phase === "discovery" && message.method === "initialize") {
            return Effect.succeed(jsonResponse({ jsonrpc: "2.0", id: message.id, result: profile }))
          }
          if (phase === "discovery" && message.method !== "tools/list") {
            return Effect.succeed(new Response(null, { status: 202 }))
          }
          return rejection()
        }, { protocol: McpProtocol.v2025_11_25 })
        const constructing = McpClient.make({ clientInfo, timeout: "1 second" }).pipe(
          Effect.provideService(McpClient.Transport, transport)
        )
        const operation: Effect.Effect<unknown, McpClientError, Scope.Scope> = phase === "initialization"
          ? constructing
          : (yield* constructing).listTools()
        const call = yield* operation.pipe(Effect.flip, Effect.forkChild)
        yield* Deferred.await(received)
        yield* TestClock.adjust("1 second")
        const error = yield* Fiber.join(call)
        assert(error.reason._tag === "HttpError")
        assert.strictEqual(error.reason.status, 401)
        assert.strictEqual(error.reason.wwwAuthenticate, "Bearer")
        assert.isTrue(cancelled)
      }))
  }

  it.effect("should retain HTTP status when the response body cannot be read", () =>
    Effect.gen(function*() {
      const peer = yield* connectHttp(() =>
        Effect.succeed(
          new Response(
            new ReadableStream({
              start(controller) {
                controller.error(new Error("body unavailable"))
              }
            }),
            { status: 403, headers: { "content-type": "application/json" } }
          )
        )
      )
      const error = yield* peer.client.listTools().pipe(Effect.flip)
      assert(error.reason._tag === "HttpError")
      assert.strictEqual(error.reason.status, 403)
    }))

  it.effect("should permit subsequent calls when a modern HTTP request returns 404", () =>
    Effect.gen(function*() {
      let attempts = 0
      const peer = yield* connectHttp((message) =>
        Effect.succeed(
          ++attempts === 1 ?
            new Response(null, { status: 404 })
            : jsonResponse({ jsonrpc: "2.0", id: message.id, result: { ttlMs: 0, cacheScope: "private", tools: [] } })
        )
      )
      assert.strictEqual((yield* peer.client.listTools().pipe(Effect.flip)).reason._tag, "HttpError")
      assert.deepStrictEqual(yield* peer.client.listTools(), [])
      assert.strictEqual(attempts, 2)
    }))
})

describe("McpClient HTTP tool routing", () => {
  it.effect("should omit unroutable tools when modern discovery contains unsupported header annotations", () =>
    Effect.gen(function*() {
      const valid = {
        name: "valid",
        inputSchema: {
          type: "object" as const,
          properties: {
            nested: { type: "object", properties: { region: { type: "string", "x-mcp-header": "Region" } } }
          }
        }
      }
      const invalid = {
        name: "invalid",
        inputSchema: {
          type: "object" as const,
          properties: {
            region: { type: "number", "x-mcp-header": "Region" }
          }
        }
      }
      const peer = yield* connectHttp((message) =>
        Effect.succeed(
          jsonResponse({
            jsonrpc: "2.0",
            id: message.id,
            result: { ttlMs: 0, cacheScope: "private", tools: [valid, invalid] }
          })
        )
      )
      const tools = yield* peer.client.listTools()
      assert.deepStrictEqual(tools.map((tool) => tool.name), ["valid"])
    }))

  for (const operation of ["prompt", "resource"] as const) {
    it.effect(`should mirror the ${operation} identifier in modern HTTP routing headers`, () =>
      Effect.gen(function*() {
        const identifier = "demo://Hello, 世界"
        let headers: Readonly<Record<string, string>> = {}
        const peer = yield* connectHttp((message, request) => {
          headers = request.headers
          assert.strictEqual(message.method, operation === "prompt" ? "prompts/get" : "resources/read")
          return Effect.succeed(jsonResponse({
            jsonrpc: "2.0",
            id: message.id,
            result: operation === "prompt"
              ? { messages: [] }
              : { contents: [], ttlMs: 0, cacheScope: "private" }
          }))
        })
        if (operation === "prompt") {
          yield* peer.client.getPrompt({ prompt: McpSchema.Prompt.make({ name: identifier }) })
        } else {
          yield* peer.client.readResource({ uri: identifier })
        }
        assert.strictEqual(headers["mcp-method"], operation === "prompt" ? "prompts/get" : "resources/read")
        assert.strictEqual(headers["mcp-name"], "=?base64?ZGVtbzovL0hlbGxvLCDkuJbnlYw=?=")
      }))
  }

  it.effect("should route discovered tools when nested header values contain Unicode", () =>
    Effect.gen(function*() {
      const definition = {
        name: "valid",
        inputSchema: {
          type: "object" as const,
          properties: {
            nested: { type: "object", properties: { region: { type: "string", "x-mcp-header": "Region" } } }
          }
        }
      }
      let headers: Readonly<Record<string, string>> = {}
      const peer = yield* connectHttp((message, request) => {
        if (message.method === "tools/call") headers = request.headers
        return Effect.succeed(jsonResponse({
          jsonrpc: "2.0",
          id: message.id,
          result: message.method === "tools/list"
            ? { ttlMs: 0, cacheScope: "private", tools: [definition] }
            : { content: [] }
        }))
      }, { headers: { authorization: "Bearer application-token" } })
      const tools = yield* peer.client.listTools()
      yield* peer.client.callTool({ tool: tools[0], arguments: { nested: { region: "Hello, 世界" } } })
      assert.strictEqual(headers["mcp-param-region"], "=?base64?SGVsbG8sIOS4lueVjA==?=")
      assert.strictEqual(headers["mcp-method"], "tools/call")
      assert.strictEqual(headers["mcp-name"], "valid")
      assert.strictEqual(headers.authorization, "Bearer application-token")
    }))

  it.effect("should retain ordinary tools when defaults and examples contain header-like instance data", () =>
    Effect.gen(function*() {
      const definition = {
        name: "defaults",
        inputSchema: {
          type: "object" as const,
          properties: {
            value: {
              type: "object",
              default: { "x-mcp-header": "instance-data" },
              examples: [{ "x-mcp-header": "data" }]
            }
          }
        }
      }
      const peer = yield* connectHttp((message) =>
        Effect.succeed(
          jsonResponse({
            jsonrpc: "2.0",
            id: message.id,
            result: { ttlMs: 0, cacheScope: "private", tools: [definition] }
          })
        )
      )
      assert.strictEqual((yield* peer.client.listTools())[0].name, definition.name)
    }))

  it.effect("should use each descriptor when concurrent tools share a name but advertise different headers", () =>
    Effect.gen(function*() {
      const headers: Array<Readonly<Record<string, string>>> = []
      const peer = yield* connectHttp((message, request) => {
        headers.push(request.headers)
        return Effect.succeed(jsonResponse({ jsonrpc: "2.0", id: message.id, result: { content: [] } }))
      })
      const first = {
        name: "same",
        inputSchema: { type: "object" as const, properties: { region: { type: "string", "x-mcp-header": "First" } } }
      }
      const second = {
        name: "same",
        inputSchema: { type: "object" as const, properties: { region: { type: "string", "x-mcp-header": "Second" } } }
      }
      yield* Effect.all([
        peer.client.callTool({ tool: first, arguments: { region: "one" } }),
        peer.client.callTool({ tool: second, arguments: { region: "two" } })
      ], { concurrency: "unbounded" })
      assert.strictEqual(headers[0]["mcp-param-first"], "one")
      assert.isUndefined(headers[0]["mcp-param-second"])
      assert.strictEqual(headers[1]["mcp-param-second"], "two")
      assert.isUndefined(headers[1]["mcp-param-first"])
    }))
})

describe("McpClient HTTP lifecycle", () => {
  for (const protocol of [McpProtocol.v2025_11_25, McpProtocol.v2026_07_28]) {
    it.effect(`should release the exchange when a ${protocol.protocolVersion} HTTP call is interrupted`, () =>
      Effect.gen(function*() {
        const started = yield* Deferred.make<void>()
        let interrupted = false
        const peer = yield* connectHttp(
          () =>
            Deferred.succeed(started, undefined).pipe(
              Effect.andThen(Effect.never),
              Effect.onInterrupt(() =>
                Effect.sync(() => {
                  interrupted = true
                })
              )
            ),
          { protocol }
        )
        const call = yield* peer.client.listTools().pipe(Effect.forkChild)
        yield* Deferred.await(started)
        yield* Fiber.interrupt(call)
        assert.isTrue(interrupted)
        const messages = peer.requests.map(httpMessage)
        const cancel = messages.filter((message) => message.method === "notifications/cancelled")
        assert.strictEqual(cancel.length, protocol.protocolVersion === "2025-11-25" ? 1 : 0)
        if (cancel.length) assert.deepStrictEqual(cancel[0].params, { requestId: 2 })
      }))
  }

  it.effect("should bound cancellation delivery when a legacy server does not acknowledge interruption", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      const cancelling = yield* Deferred.make<void>()
      let interrupted = false
      const peer = yield* connectHttp(() => Deferred.succeed(started, undefined).pipe(Effect.andThen(Effect.never)), {
        protocol: McpProtocol.v2025_11_25,
        onNotification: (message) =>
          "method" in message && message.method === "notifications/cancelled"
            ? Deferred.succeed(cancelling, undefined).pipe(
              Effect.andThen(Effect.never),
              Effect.onInterrupt(() =>
                Effect.sync(() => {
                  interrupted = true
                })
              )
            )
            : Effect.succeed(new Response(null, { status: 202 }))
      })
      const call = yield* peer.client.listTools().pipe(Effect.forkChild)
      yield* Deferred.await(started)
      const interruption = yield* Fiber.interrupt(call).pipe(Effect.forkChild)
      yield* Deferred.await(cancelling)
      yield* TestClock.adjust("5 seconds")
      yield* Fiber.join(interruption)
      assert.isTrue(interrupted)
    }))

  it.effect("should omit cancellation when structured decoding is interrupted after a terminal HTTP reply", () =>
    Effect.gen(function*() {
      const decoding = yield* Deferred.make<void>()
      const peer = yield* connectHttp(
        (message) =>
          Effect.succeed(
            jsonResponse({
              jsonrpc: "2.0",
              id: message.id,
              result: { content: [], structuredContent: { value: "value" } }
            })
          ),
        { protocol: McpProtocol.v2025_11_25 }
      )
      const schema = Schema.Struct({ value: Schema.String }).pipe(Schema.decodeTo(Schema.Number, {
        decode: SchemaGetter.transformEffect(() =>
          Deferred.succeed(decoding, undefined).pipe(Effect.andThen(Effect.never))
        ),
        encode: SchemaGetter.transform((value) => ({ value: String(value) }))
      }))
      const call = yield* peer.client.callTool({ tool: tool("read"), schema: schema }).pipe(Effect.forkChild)
      yield* Deferred.await(decoding)
      yield* Fiber.interrupt(call)
      assert.isFalse(peer.requests.some((request) => httpMessage(request).method === "notifications/cancelled"))
    }))

  it.effect("should send the session ID and one DELETE when the legacy connection scope closes", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.make()
      const peer = yield* connectHttp(
        (message) =>
          Effect.succeed(
            jsonResponse({ jsonrpc: "2.0", id: message.id, result: { ttlMs: 0, cacheScope: "private", tools: [] } })
          ),
        {
          protocol: McpProtocol.v2025_11_25,
          session: "session"
        }
      ).pipe(Effect.provideService(Scope.Scope, scope))
      yield* peer.client.listTools()
      assert.strictEqual(peer.requests[2].headers["mcp-session-id"], "session")
      yield* Scope.close(scope, Exit.void)
      yield* Scope.close(scope, Exit.void)
      assert.strictEqual(peer.requests.filter((request) => request.method === "DELETE").length, 1)
      assert.strictEqual((yield* peer.client.listTools().pipe(Effect.flip)).reason._tag, "ClosedError")
    }))

  it.effect("should interrupt session deletion when a legacy DELETE exceeds five seconds", () =>
    Effect.gen(function*() {
      const deleting = yield* Deferred.make<void>()
      let interrupted = false
      const scope = yield* Scope.make()
      yield* connectHttp(
        (message) =>
          Effect.succeed(
            jsonResponse({ jsonrpc: "2.0", id: message.id, result: { ttlMs: 0, cacheScope: "private", tools: [] } })
          ),
        {
          protocol: McpProtocol.v2025_11_25,
          session: "session",
          onDelete: () =>
            Deferred.succeed(deleting, undefined).pipe(
              Effect.andThen(Effect.never),
              Effect.onInterrupt(() =>
                Effect.sync(() => {
                  interrupted = true
                })
              )
            )
        }
      ).pipe(Effect.provideService(Scope.Scope, scope))
      const closing = yield* Scope.close(scope, Exit.void).pipe(Effect.forkChild)
      yield* Deferred.await(deleting)
      yield* TestClock.adjust("5 seconds")
      yield* Fiber.join(closing)
      assert.isTrue(interrupted)
    }))

  it.effect("should reject future calls without replay when a legacy session expires with HTTP 404", () =>
    Effect.gen(function*() {
      let attempts = 0
      const peer = yield* connectHttp(() => {
        attempts++
        return Effect.succeed(new Response(null, { status: 404 }))
      }, {
        protocol: McpProtocol.v2025_11_25,
        session: "session"
      })
      for (let i = 0; i < 2; i++) {
        const error = yield* peer.client.listTools().pipe(Effect.flip)
        assert(error.reason._tag === "ClosedError")
        assert.strictEqual(error.reason.sessionExpired, true)
      }
      assert.strictEqual(attempts, 1)
    }))

  it.effect("should share the handshake deadline when legacy initialized delivery blocks", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      const stopped = yield* Deferred.make<void>()
      const transport = yield* httpTransport((request) => {
        const message = httpMessage(request)
        return message.method === "initialize"
          ? Effect.sleep("400 millis").pipe(
            Effect.as(jsonResponse({ jsonrpc: "2.0", id: message.id, result: profile }))
          )
          : Deferred.succeed(started, undefined).pipe(
            Effect.andThen(Effect.never),
            Effect.onInterrupt(() => Deferred.succeed(stopped, undefined))
          )
      }, { protocol: McpProtocol.v2025_11_25 })
      const connecting = yield* McpClient.make({ clientInfo, timeout: "1 second" }).pipe(
        Effect.provideService(McpClient.Transport, transport),
        Effect.flip,
        Effect.forkChild
      )
      yield* TestClock.adjust("400 millis")
      yield* Deferred.await(started)
      yield* TestClock.adjust("600 millis")
      assert.strictEqual((yield* Fiber.join(connecting)).reason._tag, "TimeoutError")
      yield* Deferred.await(stopped)
    }))

  for (const interrupted of [false, true]) {
    it.effect(`should release HTTP delivery when post-handshake construction ${interrupted ? "is interrupted" : "fails"}`, () =>
      Effect.gen(function*() {
        const started = yield* Deferred.make<void>()
        const stopped = yield* Deferred.make<void>()
        const transport = yield* httpTransport((request) => {
          const message = httpMessage(request)
          if (message.method === "initialize") {
            return Effect.succeed(jsonResponse({ jsonrpc: "2.0", id: message.id, result: profile }))
          }
          return Deferred.succeed(started, undefined).pipe(
            Effect.andThen(interrupted ? Effect.never : Effect.succeed(new Response(null, { status: 403 }))),
            Effect.ensuring(Deferred.succeed(stopped, undefined))
          )
        }, { protocol: McpProtocol.v2025_11_25 })
        const connecting = yield* McpClient.make({ clientInfo }).pipe(
          Effect.provideService(McpClient.Transport, transport),
          Effect.exit,
          Effect.forkChild
        )
        yield* Deferred.await(started)
        if (interrupted) yield* Fiber.interrupt(connecting)
        else assert.isTrue(Exit.isFailure(yield* Fiber.join(connecting)))
        yield* Deferred.await(stopped)
      }))
  }
})

describe("McpClient stdio delivery", () => {
  it.effect("should provide a connected stdio client and close its process when the layer scope ends", () =>
    Effect.gen(function*() {
      const peer = yield* makeStdioPeer()
      yield* Effect.scoped(Effect.gen(function*() {
        const building = yield* Layer.build(
          McpClient.layerStdio({
            clientInfo,
            command: ChildProcess.make("test-mcp-server"),
            protocol: McpProtocol.v2025_11_25
          }).pipe(Layer.provide(Layer.succeed(Spawner.ChildProcessSpawner, peer.spawner)))
        ).pipe(Effect.forkChild)
        const initial = JSON.parse(new TextDecoder().decode(yield* Queue.take(peer.writes)))
        assert.strictEqual(initial.method, "initialize")
        assert.deepStrictEqual(initial.params.clientInfo, clientInfo)
        yield* Queue.offer(
          peer.output,
          new TextEncoder().encode(
            JSON.stringify({ jsonrpc: "2.0", id: initial.id, result: profile }) + "\n"
          )
        )
        const client = Context.get(yield* Fiber.join(building), McpClient.McpClient)
        assert.deepStrictEqual(client.serverInfo, serverInfo)
      }))
      assert.isTrue(yield* Deferred.isDone(peer.ended))
      assert.isTrue(yield* Deferred.isDone(peer.exit))
    }))

  it.effect("should preserve Unicode content when a response arrives one byte at a time", () =>
    Effect.gen(function*() {
      const peer = yield* connect("2025-11-25")
      const call = yield* peer.client.callTool({ tool: tool("read") }).pipe(Effect.forkChild)
      const outgoing = yield* peer.nextRequest
      const bytes = new TextEncoder().encode(
        JSON.stringify({ jsonrpc: "2.0", id: outgoing.id, result: { content: [{ type: "text", text: "世界" }] } }) +
          "\n"
      )
      for (const byte of bytes) yield* Queue.offer(peer.stdioPeer.output, new Uint8Array([byte]))
      assert.deepStrictEqual((yield* Fiber.join(call)).content, [{ type: "text", text: "世界" }])
    }))

  it.effect("should deliver the final response when the subprocess writes it and exits immediately", () =>
    Effect.gen(function*() {
      const peer = yield* connect("2025-11-25")
      const call = yield* peer.client.callTool({ tool: tool("read") }).pipe(Effect.forkChild)
      const outgoing = yield* peer.nextRequest
      yield* Queue.offer(
        peer.stdioPeer.output,
        new TextEncoder().encode(
          JSON.stringify({ jsonrpc: "2.0", id: outgoing.id, result: { content: [{ type: "text", text: "done" }] } }) +
            "\n"
        )
      )
      yield* Deferred.succeed(peer.stdioPeer.exit, Spawner.ExitCode(0))
      yield* Queue.end(peer.stdioPeer.output)
      assert.deepStrictEqual((yield* Fiber.join(call)).content, [{ type: "text", text: "done" }])
    }))

  it.effect("should fail pending calls when the subprocess exits without a response", () =>
    Effect.gen(function*() {
      const peer = yield* connect("2025-11-25")
      const call = yield* peer.client.callTool({ tool: tool("read") }).pipe(Effect.flip, Effect.forkChild)
      yield* peer.nextRequest
      yield* Deferred.succeed(peer.stdioPeer.exit, Spawner.ExitCode(1))
      yield* TestClock.adjust("5 seconds")
      const error = yield* Fiber.join(call)
      assert.strictEqual(error.reason._tag, "TransportError")
      assert.strictEqual(error.message, "MCP process exited (1)")
    }))

  it.effect("should fail pending calls when an unterminated stdio line exceeds the byte limit", () =>
    Effect.gen(function*() {
      const peer = yield* connect("2025-11-25", {}, { maxMessageBytes: 1024 })
      const call = yield* peer.client.callTool({ tool: tool("read") }).pipe(Effect.flip, Effect.forkChild)
      yield* peer.nextRequest
      yield* Queue.offer(peer.stdioPeer.output, new TextEncoder().encode("x".repeat(1025)))
      assert.strictEqual((yield* Fiber.join(call)).reason._tag, "LimitError")
    }))

  it.effect("should reject pending and subsequent calls when the peer closes stdout", () =>
    Effect.gen(function*() {
      const peer = yield* connect("2026-07-28")
      const call = yield* peer.client.callTool({ tool: tool("read") }).pipe(Effect.flip, Effect.forkChild)
      yield* peer.nextRequest
      yield* Queue.end(peer.stdioPeer.output)
      assert.strictEqual((yield* Fiber.join(call)).reason._tag, "TransportError")
      assert.strictEqual(
        (yield* peer.client.callTool({ tool: tool("read") }).pipe(Effect.flip)).reason._tag,
        "TransportError"
      )
    }))

  it.effect("should close stdin and delegate termination when the subprocess outlives its scope", () =>
    Effect.gen(function*() {
      const peer = yield* makeStdioPeer(false)
      const scope = yield* Scope.make()
      yield* McpClient.stdio({ command: ChildProcess.make("server"), protocol: McpProtocol.v2025_11_25 }).pipe(
        Effect.provideService(Spawner.ChildProcessSpawner, peer.spawner),
        Effect.provideService(Scope.Scope, scope)
      )
      const closing = yield* Scope.close(scope, Exit.void).pipe(Effect.forkChild)
      yield* Deferred.await(peer.ended)
      assert.deepStrictEqual(peer.kills, [])
      yield* TestClock.adjust("5 seconds")
      yield* Fiber.join(closing)
      assert.deepStrictEqual(peer.kills, [{ killSignal: "SIGTERM", forceKillAfter: 5000 }])
    }))
})

describe("McpClient bounded operations", () => {
  it.effect("should time out before sending when all admission permits are occupied", () =>
    Effect.gen(function*() {
      const peer = yield* connect("2026-07-28")
      for (let i = 0; i < 64; i++) {
        yield* peer.client.callTool({ tool: tool("busy") }).pipe(Effect.forkChild)
        yield* peer.nextRequest
      }
      const waiting = yield* peer.client.callTool({ tool: tool("waiting") }, { timeout: "1 second" }).pipe(
        Effect.flip,
        Effect.forkChild
      )
      yield* TestClock.adjust("1 second")
      assert.strictEqual((yield* Fiber.join(waiting)).reason._tag, "TimeoutError")
      assert.strictEqual(yield* Queue.size(peer.outgoing), 0)
    }))

  it.effect("should release permits before decoding when every admitted result makes a nested call", () =>
    Effect.gen(function*() {
      const allOuterCalls = yield* Deferred.make<void>()
      let outerCount = 0
      let innerCount = 0
      const transport = yield* scriptedHttp(McpProtocol.v2025_11_25, (message, receive) =>
        Effect.gen(function*() {
          const outer = message.params?.name === "outer"
          if (outer) {
            outerCount++
            if (outerCount === 64) yield* Deferred.succeed(allOuterCalls, undefined)
            yield* Deferred.await(allOuterCalls)
          } else innerCount++
          yield* receive({
            jsonrpc: "2.0",
            id: message.id,
            result: {
              content: [],
              structuredContent: outer ? { name: "inner" } : { value: "decoded" }
            }
          })
        }))
      const client = yield* McpClient.make({ clientInfo }).pipe(Effect.provideService(McpClient.Transport, transport))
      const schema = Schema.Struct({ name: Schema.String }).pipe(Schema.decodeTo(Schema.String, {
        decode: SchemaGetter.transformEffect(({ name }) =>
          client.callTool({ tool: tool(name), schema: Schema.Struct({ value: Schema.String }) }).pipe(
            Effect.map((result) => result.value),
            Effect.orDie
          )
        ),
        encode: SchemaGetter.transform((name) => ({ name }))
      }))
      const values = yield* Effect.all(
        Array.from({ length: 64 }, () => client.callTool({ tool: tool("outer"), schema: schema })),
        { concurrency: "unbounded" }
      )
      assert.deepStrictEqual(values, Array(64).fill("decoded"))
      assert.strictEqual(innerCount, 64)
    }))

  it.effect("should fail before sending when the discovered tool requires the tasks extension", () =>
    Effect.gen(function*() {
      const peer = yield* connect("2026-07-28")
      const definition = { ...tool("read"), execution: { taskSupport: "required" } }
      const error = yield* peer.client.callTool({ tool: definition }).pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "UnsupportedError")
      assert.strictEqual(yield* Queue.size(peer.outgoing), 0)
    }))

  it.effect("should return an empty snapshot without requesting tools when the server omits the tools capability", () =>
    Effect.gen(function*() {
      const transport = yield* httpTransport((request) => {
        const message = httpMessage(request)
        assert.strictEqual(message.method, "server/discover")
        return Effect.succeed(jsonResponse({ jsonrpc: "2.0", id: message.id, result: modernProfile }))
      })
      const client = yield* McpClient.make({ clientInfo }).pipe(Effect.provideService(McpClient.Transport, transport))
      assert.deepStrictEqual(yield* client.listTools(), [])
    }))

  for (const size of [0, -1, "invalid"] as const) {
    it.effect(`should reject transport construction when the message size is ${size}`, () =>
      Effect.gen(function*() {
        const error = yield* httpTransport(() => Effect.succeed(new Response(null)), {
          maxMessageBytes: size as ByteSize.Input
        }).pipe(
          Effect.flip
        )
        assert.strictEqual(error.reason._tag, "ConfigurationError")
      }))
  }

  it.effect("should reject an operation without sending when its deadline override is invalid", () =>
    Effect.gen(function*() {
      const peer = yield* connect("2026-07-28")
      const error = yield* peer.client.listTools({ timeout: 0 }).pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "ConfigurationError")
      assert.strictEqual(yield* Queue.size(peer.outgoing), 0)
    }))
})

for (const version of ["2025-11-25", "2026-07-28"] as const) {
  describe(`prompts and resources ${version}`, () => {
    const prompt = McpSchema.Prompt.make({ name: "review", arguments: [{ name: "code", required: true }] })
    const resource = McpSchema.Resource.make({ name: "document", uri: "test://document" })

    it.effect("should discover and retrieve prompts and resources over HTTP", () =>
      Effect.gen(function*() {
        const protocol = version === "2025-11-25" ? McpProtocol.v2025_11_25 : McpProtocol.v2026_07_28
        const methods: Array<string> = []
        const transport = yield* scriptedHttp(protocol, (request, receive) => {
          methods.push(request.method)
          const value = request.method === "prompts/list" ?
            { prompts: [prompt] }
            : request.method === "resources/list" ?
            { resources: [resource] }
            : request.method === "prompts/get" ?
            { messages: [{ role: "user", content: { type: "text", text: "Review" } }] }
            : { contents: [{ uri: resource.uri, text: "Document" }] }
          return receive({
            jsonrpc: "2.0",
            id: request.id,
            result: result(version, { ...value, ttlMs: 0, cacheScope: "private" })
          })
        })
        const client = yield* McpClient.make({ clientInfo }).pipe(Effect.provideService(McpClient.Transport, transport))
        const prompts = yield* client.listPrompts()
        assert.strictEqual((yield* client.getPrompt({ prompt: prompts[0] })).messages.length, 1)
        const resources = yield* client.listResources()
        assert.deepStrictEqual((yield* client.readResource({ uri: resources[0].uri })).contents, [{
          uri: resource.uri,
          text: "Document"
        }])
        assert.deepStrictEqual(methods, ["prompts/list", "prompts/get", "resources/list", "resources/read"])
      }))

    for (const kind of ["prompts", "resources"] as const) {
      const entry = kind === "prompts" ? prompt : resource
      const list = (client: McpClient.Client, options?: McpClient.CallOptions) =>
        kind === "prompts" ? client.listPrompts(options) : client.listResources(options)

      it.effect(`should collect all ${kind} pages including an empty cursor and refresh each snapshot`, () =>
        Effect.gen(function*() {
          const peer = yield* connect(version)
          for (let scan = 0; scan < 2; scan++) {
            const operation = kind === "prompts"
              ? scan === 0 ? McpClient.listPrompts(peer.client) : peer.client.pipe(McpClient.listPrompts())
              : scan === 0
              ? McpClient.listResources(peer.client)
              : peer.client.pipe(McpClient.listResources())
            const fiber = yield* operation.pipe(Effect.forkChild)
            const first = yield* peer.nextRequest
            assert.strictEqual(first.method, `${kind}/list`)
            assert.strictEqual(first.params?.cursor, undefined)
            yield* peer.reply(
              first,
              result(version, { [kind]: [entry], nextCursor: "", ttlMs: 0, cacheScope: "private" })
            )
            const second = yield* peer.nextRequest
            assert.strictEqual(second.params?.cursor, "")
            yield* peer.reply(second, result(version, { [kind]: [entry], ttlMs: 0, cacheScope: "private" }))
            assert.deepStrictEqual(yield* Fiber.join(fiber), [entry, entry])
          }
        }))

      for (const limit of ["cursor", "pages", "items"] as const) {
        it.effect(`should fail when ${kind} discovery exceeds the ${limit} limit`, () =>
          Effect.gen(function*() {
            const peer = yield* connect(version)
            const fiber = yield* list(peer.client).pipe(Effect.flip, Effect.forkChild)
            const count = limit === "pages" ? 100 : limit === "cursor" ? 2 : 1
            for (let page = 0; page < count; page++) {
              const request = yield* peer.nextRequest
              yield* peer.reply(
                request,
                result(version, {
                  [kind]: limit === "items"
                    ? Array.from({ length: 10_001 }, () => entry)
                    : [entry],
                  ...(limit === "items" ? {} : { nextCursor: limit === "cursor" ? "again" : String(page) }),
                  ttlMs: 0,
                  cacheScope: "private"
                })
              )
            }
            assert.strictEqual((yield* Fiber.join(fiber)).reason._tag, "LimitError")
          }))
      }

      it.effect(`should use one deadline across ${kind} pages`, () =>
        Effect.gen(function*() {
          const peer = yield* connect(version)
          const fiber = yield* list(peer.client, { timeout: "1 second" }).pipe(Effect.flip, Effect.forkChild)
          const first = yield* peer.nextRequest
          yield* TestClock.adjust("400 millis")
          yield* peer.reply(
            first,
            result(version, { [kind]: [entry], nextCursor: "next", ttlMs: 0, cacheScope: "private" })
          )
          yield* peer.nextRequest
          yield* TestClock.adjust("600 millis")
          assert.strictEqual((yield* Fiber.join(fiber)).reason._tag, "TimeoutError")
        }))
    }

    for (const first of [true, false]) {
      it.effect(`should preserve prompt messages and metadata with data-first=${first}`, () =>
        Effect.gen(function*() {
          const peer = yield* connect(version)
          const params = { prompt, arguments: { code: "const x = 1" } }
          const call = first ? McpClient.getPrompt(peer.client, params) : peer.client.pipe(McpClient.getPrompt(params))
          const fiber = yield* call.pipe(Effect.forkChild)
          const request = yield* peer.nextRequest
          assert.strictEqual(request.method, "prompts/get")
          assert.strictEqual(request.params?.name, "review")
          assert.deepStrictEqual(request.params?.arguments, params.arguments)
          const value = result(version, {
            description: "Review code",
            messages: [{ role: "user", content: { type: "text", text: "Review this code" } }],
            _meta: { ...modernMeta, custom: "retained" }
          })
          yield* peer.reply(request, value)
          const response = yield* Fiber.join(fiber)
          assert.deepStrictEqual(response.messages, value.messages)
          assert.strictEqual(response.description, value.description)
          assert.deepStrictEqual(response._meta, value._meta)
        }))

      it.effect(`should read unlisted resource URIs and preserve text and binary contents with data-first=${first}`, () =>
        Effect.gen(function*() {
          const peer = yield* connect(version)
          const params = { uri: "test://unlisted" }
          const call = first
            ? McpClient.readResource(peer.client, params)
            : peer.client.pipe(McpClient.readResource(params))
          const fiber = yield* call.pipe(Effect.forkChild)
          const request = yield* peer.nextRequest
          assert.strictEqual(request.method, "resources/read")
          assert.strictEqual(request.params?.uri, params.uri)
          const value = result(version, {
            contents: [
              { uri: params.uri, mimeType: "text/plain", text: "Hello" },
              { uri: "test://image", mimeType: "image/png", blob: "aGVsbG8=" }
            ],
            ttlMs: 0,
            cacheScope: "private",
            _meta: { ...modernMeta, custom: "retained" }
          })
          yield* peer.reply(request, value)
          const response = yield* Fiber.join(fiber)
          assert.deepStrictEqual(response.contents, [
            { uri: params.uri, mimeType: "text/plain", text: "Hello" },
            { uri: "test://image", mimeType: "image/png", blob: new TextEncoder().encode("hello") }
          ])
          assert.deepStrictEqual(response._meta, value._meta)
        }))
    }

    it.effect("should return empty discovery and reject calls when capabilities are absent", () =>
      Effect.gen(function*() {
        const peer = yield* connect(version, {}, {}, {})
        assert.deepStrictEqual(yield* peer.client.listPrompts(), [])
        assert.deepStrictEqual(yield* peer.client.listResources(), [])
        assert.strictEqual((yield* peer.client.getPrompt({ prompt }).pipe(Effect.flip)).reason._tag, "UnsupportedError")
        assert.strictEqual(
          (yield* peer.client.readResource({ uri: resource.uri }).pipe(Effect.flip)).reason._tag,
          "UnsupportedError"
        )
      }))

    for (const kind of ["prompt", "resource"] as const) {
      const call = (
        client: McpClient.Client,
        options?: McpClient.CallOptions
      ): Effect.Effect<McpSchema.GetPromptResult | McpSchema.ReadResourceResult, McpClientError> =>
        kind === "prompt" ? client.getPrompt({ prompt }, options) : client.readResource({ uri: resource.uri }, options)

      it.effect(`should preserve protocol errors from ${kind} requests`, () =>
        Effect.gen(function*() {
          const peer = yield* connect(version)
          const fiber = yield* call(peer.client).pipe(Effect.flip, Effect.forkChild)
          const request = yield* peer.nextRequest
          if (kind === "prompt") assert.strictEqual(request.params?.arguments, undefined)
          yield* Queue.offer(peer.incoming, {
            jsonrpc: "2.0",
            id: request.id,
            error: { code: -32602, message: "Missing" }
          })
          const error = yield* Fiber.join(fiber)
          assert.strictEqual(error.reason._tag, "ProtocolError")
          assert.strictEqual(error.reason.message, "Missing")
        }))

      it.effect(`should validate ${kind} results`, () =>
        Effect.gen(function*() {
          const peer = yield* connect(version)
          const fiber = yield* call(peer.client).pipe(Effect.flip, Effect.forkChild)
          yield* peer.reply(
            yield* peer.nextRequest,
            result(version, kind === "prompt" ? { messages: "invalid" } : { contents: "invalid" })
          )
          assert.strictEqual((yield* Fiber.join(fiber)).reason._tag, "ValidationError")
        }))

      it.effect(`should apply the per-call deadline to ${kind} requests`, () =>
        Effect.gen(function*() {
          const peer = yield* connect(version)
          const fiber = yield* call(peer.client, { timeout: "1 second" }).pipe(Effect.flip, Effect.forkChild)
          yield* peer.nextRequest
          yield* TestClock.adjust("1 second")
          assert.strictEqual((yield* Fiber.join(fiber)).reason._tag, "TimeoutError")
        }))
    }
  })
}
