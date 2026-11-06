import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpServer from "effect/ai/McpServer"
import * as Tool from "effect/ai/Tool"
import * as Toolkit from "effect/ai/Toolkit"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import type * as RpcMessage from "effect/rpc/RpcMessage"
import * as RpcServer from "effect/rpc/RpcServer"
import * as Schema from "effect/Schema"
import { makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"
import { type JsonRpcMessage, makeMcpStdioHarness } from "./TestUtils/McpStdioHarness.ts"

const metadata = {
  "io.modelcontextprotocol/protocolVersion": "2026-07-28",
  "io.modelcontextprotocol/clientCapabilities": {}
}

const resultOf = (message: unknown) =>
  Schema.decodeUnknownSync(Schema.Struct({ result: Schema.JsonObject }))(message).result

const makeCustomHarness = Effect.fnUntraced(function*(
  protocol: McpProtocol.ProtocolAdapter,
  registrations: Layer.Layer<never, never, McpServer.McpServer>
) {
  const serialization = McpServer.makeSerialization({ protocols: [protocol], framing: "json" })
  const parser = serialization.makeUnsafe()
  const outbound = yield* Queue.unbounded<JsonRpcMessage>()
  const disconnects = yield* Queue.unbounded<number>()
  const ready = yield* Deferred.make<(clientId: number, message: RpcMessage.FromClientEncoded) => Effect.Effect<void>>()
  const transport = yield* RpcServer.Protocol.make((write) =>
    Deferred.succeed(ready, write).pipe(Effect.as({
      disconnects,
      send: (_clientId, message) =>
        Effect.suspend(() => {
          const frame = parser.encode(message)
          return frame === undefined
            ? Effect.void
            : Queue.offer(outbound, JSON.parse(typeof frame === "string" ? frame : new TextDecoder().decode(frame)))
        }),
      end: () => Effect.void,
      clientIds: Effect.sync(() => new Set([0])),
      initialMessage: Effect.succeedNone,
      supportsAck: false,
      supportsTransferables: false,
      supportsSpanPropagation: false,
      supportsNotifications: true,
      codecFor: serialization.codecFor
    }))
  )
  yield* Layer.build(
    McpServer.layer({
      name: "CustomToolkitInput",
      version: "1.0.0",
      protocols: [protocol],
      registrations
    }).pipe(Layer.provide(Layer.succeed(RpcServer.Protocol, transport)))
  )
  const write = yield* Deferred.await(ready)
  return {
    send: (message: JsonRpcMessage) =>
      Effect.forEach(
        parser.decode(JSON.stringify(message)),
        (decoded) => write(0, decoded as RpcMessage.FromClientEncoded),
        { discard: true }
      ),
    take: Queue.take(outbound)
  }
})

describe("Toolkit client input", () => {
  // https://modelcontextprotocol.io/specification/2026-07-28/schema#missingrequiredclientcapabilityerror
  for (const failureMode of ["error", "return"] as const) {
    it.effect(`preserves capability failures with failureMode ${failureMode}`, () =>
      Effect.gen(function*() {
        const toolkit = Toolkit.make(Tool.make("RequireInput", {
          failure: McpSchema.MissingRequiredClientCapability,
          failureMode
        }))
        const registrations = McpServer.toolkit(toolkit).pipe(
          Layer.provide(toolkit.toLayer({
            RequireInput: () =>
              Effect.fail(
                new McpSchema.MissingRequiredClientCapability({
                  message: "Form elicitation is required",
                  data: { requiredCapabilities: { elicitation: { form: {} } } }
                })
              )
          }))
        )
        const harness = yield* makeHttpHarness(McpServer.layerHttp({
          name: "ToolkitInput",
          version: "1.0.0",
          path: "/mcp",
          protocols: [McpProtocol.v2026_07_28],
          registrations
        }))
        const response = yield* harness.post({
          jsonrpc: "2.0",
          id: "capability",
          method: "tools/call",
          params: { name: "RequireInput", arguments: {}, _meta: metadata }
        }, {
          "Mcp-Protocol-Version": "2026-07-28",
          "Mcp-Method": "tools/call",
          "Mcp-Name": "RequireInput"
        })

        assert.strictEqual(response.status, 400)
        assert.deepStrictEqual(yield* readMcpHttpResponse(response), {
          jsonrpc: "2.0",
          id: "capability",
          error: {
            code: -32021,
            message: "Form elicitation is required",
            data: { requiredCapabilities: { elicitation: { form: {} } } }
          }
        })
      }))
  }

  // https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr
  it.effect("uses explicit MCP toolkit handlers before ordinary handlers and success encoding", () =>
    Effect.gen(function*() {
      const toolkit = Toolkit.make(Tool.make("Wait", { success: Schema.String }))
      const registrations = McpServer.toolkit(toolkit, {
        handlers: {
          Wait: () => Effect.succeed(new McpSchema.InputRequired({ requestState: "resume" }))
        }
      }).pipe(Layer.provide(toolkit.toLayer({ Wait: () => Effect.succeed("ordinary") })))
      const harness = yield* makeHttpHarness(McpServer.layerHttp({
        name: "ToolkitInput",
        version: "1.0.0",
        path: "/mcp",
        protocols: [McpProtocol.v2026_07_28],
        registrations
      }))
      const response = yield* harness.post({
        jsonrpc: "2.0",
        id: "first",
        method: "tools/call",
        params: { name: "Wait", arguments: {}, _meta: metadata }
      }, {
        "Mcp-Protocol-Version": "2026-07-28",
        "Mcp-Method": "tools/call",
        "Mcp-Name": "Wait"
      })
      const message = Schema.decodeUnknownSync(Schema.Struct({ result: Schema.JsonObject }))(
        yield* readMcpHttpResponse(response)
      )

      assert.strictEqual(message.result.resultType, "input_required")
      assert.strictEqual(message.result.requestState, "resume")
      assert.isUndefined(message.result.structuredContent)
    }))

  // https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr
  it.effect("resumes MCP toolkit handlers with request services and an unchanged success schema", () =>
    Effect.gen(function*() {
      class CurrentUser extends Context.Service<CurrentUser, string>()("ToolkitInput/CurrentUser") {}
      const toolkit = Toolkit.make(Tool.make("CountRoots", {
        parameters: Schema.Struct({ label: Schema.String }),
        success: Schema.Int
      }))
      const auth = McpServer.middleware<{ provides: CurrentUser }>()((effect) =>
        Effect.provideService(effect, CurrentUser, "Alice")
      )
      const registrations = McpServer.toolkit(toolkit, {
        handlers: {
          CountRoots: Effect.fnUntraced(function*({ label }) {
            assert.strictEqual(yield* CurrentUser, "Alice")
            assert.strictEqual(label, "workspace")
            const context = yield* McpSchema.McpRequestContext
            if (context.inputResponses?.workspace === undefined) {
              return new McpSchema.InputRequired({
                inputRequests: { workspace: { method: "roots/list" } },
                requestState: "count-roots"
              })
            }
            assert.strictEqual(context.requestState, "count-roots")
            const input = Schema.decodeUnknownSync(Schema.Struct({
              roots: Schema.Array(Schema.Struct({ uri: Schema.String }))
            }))(context.inputResponses.workspace)
            return input.roots.length
          })
        }
      }).pipe(Layer.provide(auth.layer))
      const harness = yield* makeMcpStdioHarness(McpProtocol.v2026_07_28, [McpProtocol.v2026_07_28], registrations)
      const requestMetadata = {
        ...metadata,
        "io.modelcontextprotocol/clientCapabilities": { roots: {} }
      }
      const list = resultOf(yield* harness.sendRequest("tools/list", { _meta: requestMetadata }))
      const tools = Schema.decodeUnknownSync(Schema.Array(Schema.Struct({
        name: Schema.String,
        outputSchema: Schema.JsonObject
      })))(list.tools)
      assert.deepStrictEqual(tools, [{
        name: "CountRoots",
        outputSchema: { type: "integer", minimum: Number.MIN_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER }
      }])
      const first = resultOf(
        yield* harness.sendRequest("tools/call", {
          name: "CountRoots",
          arguments: { label: "workspace" },
          _meta: requestMetadata
        })
      )
      assert.strictEqual(first.resultType, "input_required")
      assert.deepStrictEqual(first.inputRequests, { workspace: { method: "roots/list" } })
      assert.strictEqual(first.requestState, "count-roots")
      assert.isUndefined(first.structuredContent)
      const second = resultOf(
        yield* harness.sendRequest("tools/call", {
          name: "CountRoots",
          arguments: { label: "workspace" },
          inputResponses: { workspace: { roots: [{ uri: "file:///workspace" }] } },
          requestState: first.requestState,
          _meta: requestMetadata
        })
      )
      assert.strictEqual(second.resultType, "complete")
      assert.strictEqual(second.structuredContent, 1)
      assert.deepStrictEqual(second.content, [{ type: "text", text: "1" }])
    }))

  it.effect("drains bounded preliminary results before an MCP input requirement", () =>
    Effect.gen(function*() {
      const toolkit = Toolkit.make(Tool.make("Progress", { success: Schema.Int }))
      const registrations = McpServer.toolkit(toolkit, {
        handlers: {
          Progress: Effect.fnUntraced(function*(_, context) {
            for (let i = 0; i < 4; i++) {
              yield* context.preliminary(i)
            }
            return new McpSchema.InputRequired({ requestState: "continued" })
          })
        }
      }).pipe(Layer.provide(Layer.succeed(Toolkit.PreliminaryBuffer, 1)))
      const harness = yield* makeMcpStdioHarness(McpProtocol.v2026_07_28, [McpProtocol.v2026_07_28], registrations)
      const result = resultOf(
        yield* harness.sendRequest("tools/call", {
          name: "Progress",
          arguments: {},
          _meta: metadata
        })
      )
      assert.strictEqual(result.resultType, "input_required")
      assert.strictEqual(result.requestState, "continued")
      assert.isUndefined(result.structuredContent)
    }))

  for (const protocol of [McpProtocol.v2025_11_25, McpProtocol.v2026_07_28]) {
    // https://modelcontextprotocol.io/specification/2026-07-28/basic/transports#custom-transports
    // https://modelcontextprotocol.io/specification/2025-11-25/client/roots
    it.effect(`resumes toolkit input and reports capability errors over a custom protocol on ${protocol.protocolVersion}`, () =>
      Effect.gen(function*() {
        const toolkit = Toolkit.make(
          Tool.make("ReadRoots", { success: Schema.String }),
          Tool.make("RequireSampling", { success: Schema.String })
        )
        const registrations = McpServer.toolkit(toolkit, {
          handlers: {
            ReadRoots: () =>
              McpSchema.McpRequestContext.useSync((context) => {
                if (context.inputResponses?.workspace === undefined) {
                  return new McpSchema.InputRequired({
                    inputRequests: { workspace: { method: "roots/list" } },
                    requestState: "custom-roots"
                  })
                }
                assert.strictEqual(context.requestState, "custom-roots")
                assert.deepStrictEqual(context.inputResponses.workspace, { roots: [{ uri: "file:///workspace" }] })
                return "read"
              }),
            RequireSampling: () =>
              Effect.fail(
                new McpSchema.MissingRequiredClientCapability({
                  message: "Sampling is required",
                  data: { requiredCapabilities: { sampling: {} } }
                })
              )
          }
        })
        const harness = yield* makeCustomHarness(protocol, registrations)
        const modern = protocol.runtime._tag === "Stateless"
        const requestMetadata = modern
          ? { _meta: { ...metadata, "io.modelcontextprotocol/clientCapabilities": { roots: {} } } }
          : {}
        if (!modern) {
          yield* harness.send({
            jsonrpc: "2.0",
            id: "initialize",
            method: "initialize",
            params: {
              protocolVersion: protocol.protocolVersion,
              capabilities: { roots: {} },
              clientInfo: { name: "custom-client", version: "1.0.0" }
            }
          })
          assert.isUndefined((yield* harness.take).error)
          yield* harness.send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} })
        }
        yield* harness.send({
          jsonrpc: "2.0",
          id: "roots",
          method: "tools/call",
          params: { name: "ReadRoots", arguments: {}, ...requestMetadata }
        })
        const first = yield* harness.take
        if (modern) {
          const input = resultOf(first)
          assert.strictEqual(input.resultType, "input_required")
          assert.deepStrictEqual(input.inputRequests, { workspace: { method: "roots/list" } })
          yield* harness.send({
            jsonrpc: "2.0",
            id: "roots",
            method: "tools/call",
            params: {
              name: "ReadRoots",
              arguments: {},
              ...requestMetadata,
              requestState: input.requestState,
              inputResponses: { workspace: { roots: [{ uri: "file:///workspace" }] } }
            }
          })
        } else {
          assert.strictEqual(first.method, "roots/list")
          yield* harness.send({ jsonrpc: "2.0", id: first.id, result: { roots: [{ uri: "file:///workspace" }] } })
        }
        const completed = resultOf(yield* harness.take)
        assert.deepStrictEqual(completed.content, [{ type: "text", text: modern ? "\"read\"" : "read" }])
        yield* harness.send({
          jsonrpc: "2.0",
          id: "sampling",
          method: "tools/call",
          params: { name: "RequireSampling", arguments: {}, ...requestMetadata }
        })
        assert.deepStrictEqual((yield* harness.take).error, {
          code: modern ? -32021 : -32602,
          message: "Sampling is required",
          data: { requiredCapabilities: { sampling: {} } }
        })
      }))

    it.effect(`reports typed capability errors from direct toolkit handlers on ${protocol.protocolVersion}`, () =>
      Effect.gen(function*() {
        const toolkit = Toolkit.make(Tool.make("RequireRoots", { success: Schema.String }))
        const registrations = McpServer.toolkit(toolkit, {
          handlers: {
            RequireRoots: () =>
              Effect.fail(
                new McpSchema.MissingRequiredClientCapability({
                  message: "Roots are required",
                  data: { requiredCapabilities: { roots: {} } }
                })
              )
          }
        })
        const harness = yield* makeMcpStdioHarness(protocol, [protocol], registrations)
        if (protocol.runtime._tag !== "Stateless") {
          yield* harness.initialize()
        }
        const message = yield* harness.sendRequest("tools/call", {
          name: "RequireRoots",
          arguments: {},
          ...(protocol.runtime._tag === "Stateless" ? { _meta: metadata } : {})
        })
        assert.deepStrictEqual(message.error, {
          code: protocol.runtime._tag === "Stateless" ? -32021 : -32602,
          message: "Roots are required",
          data: { requiredCapabilities: { roots: {} } }
        })
        assert.isUndefined(message.result)
      }))
  }
})
