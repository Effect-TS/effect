import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpServer from "effect/ai/McpServer"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as HttpRouter from "effect/http/HttpRouter"
import * as Layer from "effect/Layer"
import * as BaseProtocolTest from "./McpConformance/BaseProtocolTest.ts"
import * as CompletionTest from "./McpConformance/CompletionTest.ts"
import { layer as makeMcpConformanceLayer } from "./McpConformance/McpConformance.ts"
import * as MultiRoundTripTest from "./McpConformance/MultiRoundTripTest.ts"
import * as PromptsTest from "./McpConformance/PromptsTest.ts"
import * as ResourcesTest from "./McpConformance/ResourcesTest.ts"
import * as ToolsTest from "./McpConformance/ToolsTest.ts"
import { MCP_ENDPOINT } from "./TestUtils/McpHttpHarness.ts"
import { makeServerLayer } from "./TestUtils/McpServerLayer.ts"
import { makeWorkerdHarness } from "./TestUtils/McpWorkerdHarness.ts"

const protocol = McpProtocol.v2026_07_28
const conformance = makeMcpConformanceLayer(protocol, { mode: "request" })

describe("mode: request", () => {
  BaseProtocolTest.statelessModernSuite(protocol, conformance)
  ToolsTest.suite(protocol, conformance)
  ToolsTest.statelessModernSuite(protocol, conformance)
  ResourcesTest.suite(protocol, conformance)
  PromptsTest.suite(protocol, conformance, { additionalPromptNames: ["MrtrPrompt"] })
  CompletionTest.suite(protocol, conformance)
  MultiRoundTripTest.suite(protocol, conformance)
})

const progressToken = "progress-1"

const callTool = (name: string, id: number) => ({
  body: {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      name,
      arguments: {},
      _meta: {
        progressToken,
        "io.modelcontextprotocol/protocolVersion": protocol.protocolVersion,
        "io.modelcontextprotocol/clientCapabilities": {},
        "io.modelcontextprotocol/clientInfo": { name: "test", version: "1.0.0" }
      }
    }
  },
  headers: {
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
    "MCP-Protocol-Version": protocol.protocolVersion,
    "Mcp-Method": "tools/call",
    "Mcp-Name": name
  }
})

const toolLayer = (
  name: string,
  handle: (server: McpServer.McpServer["Service"]) => Effect.Effect<McpSchema.CallToolResult>
) =>
  Layer.effectDiscard(Effect.gen(function*() {
    const server = yield* McpServer.McpServer
    yield* server.addTool({
      tool: new McpSchema.Tool({ name, inputSchema: { type: "object" } }),
      annotations: Context.empty(),
      handle: () => handle(server)
    })
  })).pipe(Layer.provideMerge(makeServerLayer({ name: "RequestMode", protocols: [protocol], mode: "request" })))

describe("McpServer.layerHttp mode: request", () => {
  // https://github.com/Effect-TS/effect/issues/9026
  it.live("should serve each POST when timers from completed requests never fire", () =>
    Effect.gen(function*() {
      const worker = yield* makeWorkerdHarness(toolLayer("ReportProgress", (server) =>
        server.notifications["notifications/progress"]({ progressToken, progress: 1 }).pipe(
          Effect.as(new McpSchema.CallToolResult({ content: [{ type: "text", text: "done" }] }))
        )))
      // The first request builds the server and completes without serving MCP.
      const first = yield* worker.request(new Request(MCP_ENDPOINT, { method: "GET" }))
      assert.strictEqual(first.status, 405)

      for (const id of [1, 2]) {
        const { body, headers } = callTool("ReportProgress", id)
        const response = yield* worker.request(
          new Request(MCP_ENDPOINT, { method: "POST", headers, body: JSON.stringify(body) })
        ).pipe(Effect.timeoutOrElse({
          duration: "1 second",
          orElse: () =>
            Effect.die(`POST ${id} stalled`)
        }))
        const messages = response.body.split("\n")
          .filter((line) => line.startsWith("data: "))
          .map((line) => JSON.parse(line.slice(6)))
        assert.deepStrictEqual(messages.map((message) => message.method ?? message.id), [
          "notifications/progress",
          id
        ])
      }
    }))

  it.live("should interrupt the handler when the client aborts its POST", () =>
    Effect.gen(function*() {
      const entered = yield* Deferred.make<void>()
      const interrupted = yield* Deferred.make<void>()
      const { dispose, handler } = HttpRouter.toWebHandler(
        toolLayer("Block", () =>
          Deferred.succeed(entered, undefined).pipe(
            Effect.andThen(Effect.never),
            Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined))
          )),
        { disableLogger: true }
      )
      yield* Effect.addFinalizer(() => Effect.promise(dispose))
      const abort = new AbortController()
      const { body, headers } = callTool("Block", 1)
      const response = handler(
        new Request(MCP_ENDPOINT, { method: "POST", headers, body: JSON.stringify(body), signal: abort.signal })
      )
      response.catch(() => undefined)

      yield* Deferred.await(entered)
      abort.abort()
      yield* Deferred.await(interrupted).pipe(Effect.timeout("1 second"))
    }))

  it.effect("should reject configurations that require a long-lived server", () =>
    Effect.gen(function*() {
      for (
        const options of [
          { protocols: [protocol, McpProtocol.v2025_11_25] },
          { protocols: [protocol], allowSubscriptions: true },
          { protocols: [protocol], allowSessionTermination: true }
        ] as const
      ) {
        const exit = yield* McpServer.layerHttp({
          name: "RequestMode",
          version: "1.0.0",
          path: "/mcp",
          mode: "request",
          ...options
        }).pipe(Layer.provide(HttpRouter.layer), Layer.build, Effect.scoped, Effect.exit)
        assert.isTrue(Exit.isFailure(exit) && Cause.isIllegalArgumentError(Cause.squash(exit.cause)))
      }
    }))
})
