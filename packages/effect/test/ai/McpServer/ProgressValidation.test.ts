import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpServer from "effect/ai/McpServer"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as NetAddress from "effect/net/NetAddress"
import * as Queue from "effect/Queue"
import * as RpcServer from "effect/rpc/RpcServer"
import * as Socket from "effect/socket/Socket"
import * as SocketServer from "effect/socket/SocketServer"
import { initializeHttpSession, makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { makeMcpSseReader } from "./TestUtils/McpHttpResponse.ts"
import { type JsonRpcMessage, makeMcpStdioHarness } from "./TestUtils/McpStdioHarness.ts"

const metadata = (protocol: McpProtocol.ProtocolAdapter) =>
  protocol.runtime._tag === "Stateless"
    ? {
      "io.modelcontextprotocol/protocolVersion": protocol.protocolVersion,
      "io.modelcontextprotocol/clientCapabilities": {}
    }
    : {}

const request = (protocol: McpProtocol.ProtocolAdapter, id: string, method: string, params = {}) => ({
  jsonrpc: "2.0",
  id,
  method,
  params: { ...params, _meta: { ...metadata(protocol), ...(params as { _meta?: object })._meta } }
})

const makeSocketHarness = Effect.fnUntraced(function*(
  protocol: McpProtocol.ProtocolAdapter,
  beforeWrite: (message: JsonRpcMessage) => Effect.Effect<void> = () => Effect.void
) {
  const incoming = yield* Queue.unbounded<string>()
  const outgoing = yield* Queue.unbounded<JsonRpcMessage>()
  const write = (chunk: string | Uint8Array | Socket.CloseEvent) =>
    Socket.isCloseEvent(chunk)
      ? Effect.void
      : Effect.suspend(() => {
        const message = JSON.parse(
          typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk)
        ) as JsonRpcMessage
        return beforeWrite(message).pipe(Effect.andThen(Queue.offer(outgoing, message)))
      })
  const socket = Socket.make({
    reader: Effect.succeed({
      pull: Effect.map(Queue.take(incoming), (chunk) => [chunk] as const),
      upgrade: () => Effect.fail(new Socket.SocketError({ reason: new Socket.SocketUpgradeError({}) }))
    }),
    writer: Effect.succeed({ write, writeAll: (chunks) => Effect.forEach(chunks, write, { discard: true }) })
  })
  const transport = yield* RpcServer.makeProtocolSocketServer.pipe(
    Effect.provideService(SocketServer.SocketServer, {
      address: NetAddress.inetAddressFromStringUnsafe("127.0.0.1:0"),
      run: (handler) => handler(socket).pipe(Effect.orDie, Effect.andThen(Effect.never))
    }),
    Effect.provide(McpServer.layerSerialization({ protocols: [protocol] }))
  )
  const services = yield* Layer.build(
    McpServer.layer({
      name: "Progress",
      version: "1",
      protocols: [protocol]
    }).pipe(Layer.provide(Layer.succeed(RpcServer.Protocol, transport)))
  )
  const sendRaw = (message: unknown) => Queue.offer(incoming, `${JSON.stringify(message)}\n`)
  if (protocol.runtime._tag === "Stateful") {
    yield* sendRaw(request(protocol, "initialize", "initialize", {
      protocolVersion: protocol.protocolVersion,
      capabilities: {},
      clientInfo: { name: "test", version: "1" }
    }))
    assert.property(yield* Queue.take(outgoing), "result")
    yield* sendRaw({ jsonrpc: "2.0", method: "notifications/initialized" })
  }
  return { server: Context.get(services, McpServer.McpServer), sendRaw, takeMessage: Queue.take(outgoing) }
})

const readThrough = Effect.fnUntraced(function*(take: Effect.Effect<JsonRpcMessage>, id: string) {
  const messages: Array<JsonRpcMessage> = []
  while (true) {
    const message = yield* take
    messages.push(message)
    if (message.id === id) return messages
  }
})

const progressValues = (messages: ReadonlyArray<JsonRpcMessage>) =>
  messages
    .filter((message) => message.method === "notifications/progress")
    .map((message) => (message.params as { progress: number }).progress)

type Transport = "stdio" | "custom" | "http" | "request-http"

const makeProgressHarness = Effect.fnUntraced(function*(
  protocol: McpProtocol.ProtocolAdapter,
  transport: Transport,
  registration: Layer.Layer<never, never, McpServer.McpServer>
) {
  if (transport === "http" || transport === "request-http") {
    const options = {
      name: "Progress",
      version: "1",
      path: "/mcp",
      registrations: registration
    } as const
    const harness = yield* makeHttpHarness(
      transport === "http"
        ? McpServer.layerHttp({ ...options, protocols: [protocol] })
        : McpServer.layerHttpRequestScoped({ ...options, protocols: [McpProtocol.v2026_07_28] })
    )
    const headers = protocol.runtime._tag === "Stateful"
      ? yield* initializeHttpSession(harness, protocol)
      : { "MCP-Protocol-Version": protocol.protocolVersion, "Mcp-Method": "tools/call", "Mcp-Name": "Progress" }
    return {
      call: Effect.fnUntraced(function*(body: ReturnType<typeof request>) {
        const response = yield* harness.post(body, headers)
        if (!response.headers.get("content-type")?.includes("text/event-stream")) {
          return [yield* Effect.promise(() => response.json() as Promise<JsonRpcMessage>)]
        }
        return yield* makeMcpSseReader(response).drain()
      }),
      start: Effect.fnUntraced(function*(body: ReturnType<typeof request>) {
        const response = yield* harness.post(body, headers)
        const reader = makeMcpSseReader(response)
        yield* Effect.addFinalizer(() => reader.cancel)
        return { takeMessage: reader.take(), cancel: reader.cancel }
      })
    }
  }
  const harness = transport === "stdio"
    ? yield* makeMcpStdioHarness(protocol, [protocol], registration)
    : yield* makeSocketHarness(protocol)
  if (transport === "custom") {
    yield* Layer.build(registration.pipe(Layer.provide(Layer.succeed(McpServer.McpServer, harness.server))))
  } else if (protocol.runtime._tag === "Stateful") {
    yield* (harness as Effect.Success<ReturnType<typeof makeMcpStdioHarness>>).initialize()
  }
  return {
    call: Effect.fnUntraced(function*(body: ReturnType<typeof request>) {
      yield* harness.sendRaw(body)
      return yield* readThrough(harness.takeMessage, body.id)
    }),
    start: Effect.fnUntraced(function*(body: ReturnType<typeof request>) {
      yield* harness.sendRaw(body)
      return {
        takeMessage: harness.takeMessage,
        cancel: harness.sendRaw({
          jsonrpc: "2.0",
          method: "notifications/cancelled",
          params: { requestId: body.id, _meta: metadata(protocol) }
        })
      }
    })
  }
})

describe("MCP progress", () => {
  // https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/progress#behavior-requirements
  // https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/progress#behavior-requirements
  for (const protocol of [McpProtocol.v2026_07_28, McpProtocol.v2025_11_25]) {
    it.effect(`${protocol.protocolVersion} drops progress queued behind a blocked write after cancellation`, () =>
      Effect.gen(function*() {
        const blocked = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()
        const interrupted = yield* Deferred.make<void>()
        const queuedProgress = yield* Deferred.make<Effect.Effect<void>>()
        const harness = yield* makeSocketHarness(
          protocol,
          (message) =>
            message.method === "notifications/progress" && (message.params as { progress: number }).progress === 1
              ? Deferred.succeed(blocked, undefined).pipe(Effect.andThen(Deferred.await(release)))
              : Effect.void
        )
        yield* harness.server.addTool({
          tool: new McpSchema.Tool({ name: "Progress", inputSchema: { type: "object" } }),
          annotations: Context.empty(),
          handle: Effect.fnUntraced(function*() {
            yield* Effect.contextWith((services: Context.Context<never>) =>
              Deferred.succeed(
                queuedProgress,
                harness.server.notifications["notifications/progress"]({
                  progressToken: "token",
                  progress: 2
                }).pipe(Effect.provideContext(services))
              )
            )
            return yield* harness.server.notifications["notifications/progress"]({
              progressToken: "token",
              progress: 1
            })
              .pipe(
                Effect.andThen(Effect.never),
                Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined))
              )
          })
        })
        yield* harness.sendRaw(request(protocol, "blocked", "tools/call", {
          name: "Progress",
          _meta: { progressToken: "token" }
        }))
        yield* Deferred.await(blocked)
        // Start immediately to enqueue before cancellation, while the preceding write remains blocked.
        const queued = yield* (yield* Deferred.await(queuedProgress)).pipe(
          Effect.forkChild({ startImmediately: true })
        )
        yield* harness.sendRaw({
          jsonrpc: "2.0",
          method: "notifications/cancelled",
          params: { requestId: "blocked", _meta: metadata(protocol) }
        })
        yield* Deferred.await(interrupted)
        yield* Deferred.succeed(release, undefined)
        yield* Fiber.join(queued)
        yield* harness.sendRaw(
          request(protocol, "after", protocol.runtime._tag === "Stateful" ? "ping" : "server/discover")
        )
        assert.deepStrictEqual(progressValues(yield* readThrough(harness.takeMessage, "after")), [1])
      }))

    const transports: ReadonlyArray<Transport> = protocol.runtime._tag === "Stateless"
      ? ["stdio", "custom", "http", "request-http"]
      : ["stdio", "custom", "http"]
    for (const transport of transports) {
      it.effect(`${protocol.protocolVersion} ${transport} emits only increasing progress for the active request`, () =>
        Effect.gen(function*() {
          const lateProgress = yield* Deferred.make<Effect.Effect<void>>()
          let first = true
          const registration = Layer.effectDiscard(Effect.gen(function*() {
            const server = yield* McpServer.McpServer
            yield* server.addTool({
              tool: new McpSchema.Tool({ name: "Progress", inputSchema: { type: "object" } }),
              annotations: Context.empty(),
              handle: Effect.fnUntraced(function*() {
                if (!first) yield* yield* Deferred.await(lateProgress)
                first = false
                yield* Effect.contextWith((services: Context.Context<never>) =>
                  Deferred.succeed(
                    lateProgress,
                    server.notifications["notifications/progress"]({ progressToken: "token", progress: 3 }).pipe(
                      Effect.provideContext(services)
                    )
                  )
                )
                yield* server.notifications["notifications/progress"]({ progressToken: "wrong", progress: 100 })
                for (const progress of [0, 1.5, 1.5, 1, 2]) {
                  yield* server.notifications["notifications/progress"]({ progressToken: "token", progress })
                }
                return new McpSchema.CallToolResult({ content: [] })
              })
            })
          }))
          const body = request(protocol, "progress", "tools/call", {
            name: "Progress",
            _meta: { progressToken: "token" }
          })
          const harness = yield* makeProgressHarness(protocol, transport, registration)
          assert.deepStrictEqual(progressValues(yield* harness.call(body)), [0, 1.5, 2])
          yield* yield* Deferred.await(lateProgress)
          // Reusing the request id and token starts a fresh monotonic sequence.
          assert.deepStrictEqual(progressValues(yield* harness.call(body)), [0, 1.5, 2])
        }))

      it.effect(`${protocol.protocolVersion} ${transport} omits progress when the request supplied no token`, () =>
        Effect.gen(function*() {
          const registration = Layer.effectDiscard(Effect.gen(function*() {
            const server = yield* McpServer.McpServer
            yield* server.addTool({
              tool: new McpSchema.Tool({ name: "Progress", inputSchema: { type: "object" } }),
              annotations: Context.empty(),
              handle: () =>
                server.notifications["notifications/progress"]({ progressToken: "token", progress: 1 }).pipe(
                  Effect.as(new McpSchema.CallToolResult({ content: [] }))
                )
            })
          }))
          const harness = yield* makeProgressHarness(protocol, transport, registration)
          const messages = yield* harness.call(request(protocol, "no-token", "tools/call", { name: "Progress" }))
          assert.deepStrictEqual(progressValues(messages), [])
          assert.property(messages.at(-1), "result")
        }))

      it.effect(`${protocol.protocolVersion} ${transport} rejects captured progress after cancellation`, () =>
        Effect.gen(function*() {
          const interrupted = yield* Deferred.make<void>()
          const lateProgress = yield* Deferred.make<Effect.Effect<void>>()
          let first = true
          const registration = Layer.effectDiscard(Effect.gen(function*() {
            const server = yield* McpServer.McpServer
            yield* server.addTool({
              tool: new McpSchema.Tool({ name: "Progress", inputSchema: { type: "object" } }),
              annotations: Context.empty(),
              handle: Effect.fnUntraced(function*() {
                if (first) {
                  first = false
                  yield* Effect.contextWith((services: Context.Context<never>) =>
                    Deferred.succeed(
                      lateProgress,
                      server.notifications["notifications/progress"]({
                        progressToken: "token",
                        progress: 100
                      }).pipe(Effect.provideContext(services))
                    )
                  )
                  return yield* server.notifications["notifications/progress"]({ progressToken: "token", progress: 0 })
                    .pipe(
                      Effect.andThen(Effect.never),
                      Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined))
                    )
                }
                yield* server.notifications["notifications/progress"]({ progressToken: "token", progress: 0 })
                // Even an active request using the same token cannot revive a cancelled context.
                yield* yield* Deferred.await(lateProgress)
                yield* server.notifications["notifications/progress"]({ progressToken: "token", progress: 1 })
                return new McpSchema.CallToolResult({ content: [] })
              })
            })
          }))
          const harness = yield* makeProgressHarness(protocol, transport, registration)
          const call = (id: string) =>
            request(protocol, id, "tools/call", {
              name: "Progress",
              _meta: { progressToken: "token" }
            })
          const running = yield* harness.start(call("cancelled"))
          assert.deepStrictEqual(progressValues([yield* running.takeMessage]), [0])
          yield* running.cancel
          yield* Deferred.await(interrupted)
          yield* yield* Deferred.await(lateProgress)
          const messages = yield* harness.call(call("after-cancellation"))
          assert.deepStrictEqual(progressValues(messages), [0, 1])
          assert.property(messages.at(-1), "result")
        }))
    }
  }
})
