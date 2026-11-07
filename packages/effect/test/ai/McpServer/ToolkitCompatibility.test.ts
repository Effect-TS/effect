import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpServer from "effect/ai/McpServer"
import * as Tool from "effect/ai/Tool"
import * as Toolkit from "effect/ai/Toolkit"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { makeMcpStdioHarness } from "./TestUtils/McpStdioHarness.ts"

const callBusinessTool = Effect.fnUntraced(function*(
  protocol: McpProtocol.ProtocolAdapter,
  registrations: Layer.Layer<never, never, McpServer.McpServer>
) {
  const harness = yield* makeMcpStdioHarness(protocol, [protocol], registrations)
  if (protocol.runtime._tag !== "Stateless") {
    yield* harness.initialize()
  }
  return yield* harness.sendRequest("tools/call", {
    name: "Business",
    arguments: {},
    ...(protocol.runtime._tag === "Stateless"
      ? {
        inputResponses: {},
        _meta: {
          "io.modelcontextprotocol/protocolVersion": protocol.protocolVersion,
          "io.modelcontextprotocol/clientCapabilities": {}
        }
      }
      : {})
  })
})

const resultOf = (message: unknown) =>
  Schema.decodeUnknownSync(Schema.Struct({ result: Schema.JsonObject }))(message).result

const declaredState = "declared-failure-private-state"
const rootsResponse = { roots: [{ uri: "file:///workspace" }] }

const declaredInputRegistrations = (
  failureMode: "error" | "return",
  handlerCalls: Array<string>,
  handlerStates: Array<string | undefined>
) => {
  const toolkit = Toolkit.make(Tool.make("DeclaredInput", {
    parameters: Schema.Struct({ label: Schema.String }),
    success: Schema.String,
    failure: McpSchema.InputRequired,
    failureMode,
    dependencies: [McpSchema.McpRequestContext]
  }))
  return McpServer.toolkit(toolkit).pipe(
    Layer.provide(toolkit.toLayer({
      DeclaredInput: ({ label }) => {
        handlerCalls.push(label)
        return McpSchema.McpRequestContext.use((context) => {
          handlerStates.push(context.requestState)
          if (context.inputResponses?.workspace === undefined) {
            return Effect.fail(
              new McpSchema.InputRequired({
                inputRequests: { workspace: { method: "roots/list" } },
                requestState: declaredState
              })
            )
          }
          assert.strictEqual(context.requestState, declaredState)
          assert.deepStrictEqual(context.inputResponses.workspace, rootsResponse)
          return Effect.succeed(`${label}:ready`)
        })
      }
    }))
  )
}

describe("Toolkit registration compatibility", () => {
  for (const protocol of [McpProtocol.v2025_11_25, McpProtocol.v2026_07_28]) {
    it.effect(`keeps InputRequired-tagged success objects as business data on ${protocol.protocolVersion}`, () =>
      Effect.gen(function*() {
        const toolkit = Toolkit.make(Tool.make("Business", {
          success: Schema.Struct({ _tag: Schema.Literal("InputRequired"), value: Schema.String })
        }))
        const value = { _tag: "InputRequired", value: "business" } as const
        const registrations = McpServer.toolkit(toolkit).pipe(
          Layer.provide(toolkit.toLayer({ Business: () => Effect.succeed(value) }))
        )
        const message = yield* callBusinessTool(protocol, registrations)
        assert.isUndefined(message.error)
        const result = resultOf(message)
        assert.strictEqual(result.isError, false)
        assert.deepStrictEqual(result.structuredContent, value)
        assert.isUndefined(result.requestState)
      }))

    it.effect(`keeps JSON encoding failures for InputRequired instances returned through Schema.Unknown on ${protocol.protocolVersion}`, () =>
      Effect.gen(function*() {
        const toolkit = Toolkit.make(Tool.make("Business", { success: Schema.Unknown }))
        const value = new McpSchema.InputRequired({ requestState: "business" })
        const registrations = McpServer.toolkit(toolkit).pipe(
          Layer.provide(toolkit.toLayer({ Business: () => Effect.succeed(value) }))
        )
        const message = yield* callBusinessTool(protocol, registrations)
        assert.isUndefined(message.error)
        const result = resultOf(message)
        assert.strictEqual(result.isError, true)
        assert.isUndefined(result.structuredContent)
        assert.isUndefined(result.requestState)
      }))

    for (const failureMode of ["error", "return"] as const) {
      it.effect(`keeps declared InvalidParams failures as tool errors in ${failureMode} mode on ${protocol.protocolVersion}`, () =>
        Effect.gen(function*() {
          const toolkit = Toolkit.make(Tool.make("Business", { failure: McpSchema.InvalidParams, failureMode }))
          const registrations = McpServer.toolkit(toolkit).pipe(
            Layer.provide(toolkit.toLayer({
              Business: () => Effect.fail(new McpSchema.InvalidParams({ message: "business-failure" }))
            }))
          )
          const message = yield* callBusinessTool(protocol, registrations)
          assert.isUndefined(message.error)
          const result = resultOf(message)
          assert.strictEqual(result.isError, true)
          const content = Schema.decodeUnknownSync(Schema.Array(Schema.Struct({
            type: Schema.Literal("text"),
            text: Schema.String
          })))(result.content)
          assert.strictEqual(content.length, 1)
          if (failureMode === "return") {
            assert.deepStrictEqual(JSON.parse(content[0].text), {
              code: -32602,
              message: "business-failure",
              _tag: "InvalidParams"
            })
          } else {
            assert.strictEqual(content[0].text, "business-failure")
          }
        }))
    }
  }

  for (const failureMode of ["error", "return"] as const) {
    // https://modelcontextprotocol.io/specification/2025-11-25/client/roots
    it.effect(`resumes declared InputRequired failures through legacy roots requests in ${failureMode} mode`, () =>
      Effect.gen(function*() {
        const handlerCalls: Array<string> = []
        const handlerStates: Array<string | undefined> = []
        const registrations = declaredInputRegistrations(failureMode, handlerCalls, handlerStates)
        const protocol = McpProtocol.v2025_11_25
        const harness = yield* makeMcpStdioHarness(protocol, [protocol], registrations)
        yield* harness.initialize({ roots: {} })
        const pending = yield* harness.startRequest("tools/call", {
          name: "DeclaredInput",
          arguments: { label: "workspace" }
        }, "legacy-roots")
        const reverse = yield* harness.awaitOutboundMethod("roots/list")
        assert.deepStrictEqual(handlerCalls, ["workspace"])
        assert.deepStrictEqual(handlerStates, [undefined])
        const reverseId = Schema.decodeUnknownSync(Schema.Union([Schema.String, Schema.Number]))(reverse.id)
        yield* harness.respond(reverseId, rootsResponse)
        const completed = yield* pending.response
        assert.strictEqual(completed.id, "legacy-roots")
        assert.isUndefined(completed.error)
        const result = resultOf(completed)
        assert.strictEqual(result.isError, false)
        assert.deepStrictEqual(result.content, [{ type: "text", text: "workspace:ready" }])
        assert.isUndefined(result.requestState)
        assert.deepStrictEqual(handlerCalls, ["workspace", "workspace"])
        assert.deepStrictEqual(handlerStates, [undefined, declaredState])
      }))

    // https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr#server-requirements-basic-workflow
    it.effect(`seals declared InputRequired failure state and rejects tampering before the handler in ${failureMode} mode`, () =>
      Effect.gen(function*() {
        const handlerCalls: Array<string> = []
        const handlerStates: Array<string | undefined> = []
        const registrations = declaredInputRegistrations(failureMode, handlerCalls, handlerStates)
        const protocol = McpProtocol.v2026_07_28
        const harness = yield* makeMcpStdioHarness(protocol, [protocol], registrations)
        const params = {
          name: "DeclaredInput",
          arguments: { label: "workspace" },
          _meta: {
            "io.modelcontextprotocol/protocolVersion": protocol.protocolVersion,
            "io.modelcontextprotocol/clientCapabilities": { roots: {} }
          }
        }
        const initial = resultOf(yield* harness.sendRequest("tools/call", params, "initial"))
        assert.strictEqual(initial.resultType, "input_required")
        assert.deepStrictEqual(initial.inputRequests, { workspace: { method: "roots/list" } })
        assert.isUndefined(initial.structuredContent)
        const requestState = Schema.decodeUnknownSync(Schema.String)(initial.requestState)
        assert.notStrictEqual(requestState, declaredState)
        assert.notInclude(requestState, declaredState)
        assert.deepStrictEqual(handlerCalls, ["workspace"])
        assert.deepStrictEqual(handlerStates, [undefined])
        const rejected = yield* harness.sendRequest("tools/call", {
          ...params,
          requestState: `${requestState}:tampered`,
          inputResponses: { workspace: rootsResponse }
        }, "tampered")
        assert.strictEqual(rejected.id, "tampered")
        assert.propertyVal(rejected.error, "code", -32602)
        assert.isUndefined(rejected.result)
        assert.deepStrictEqual(handlerCalls, ["workspace"])
        assert.deepStrictEqual(handlerStates, [undefined])
        const completed = yield* harness.sendRequest("tools/call", {
          ...params,
          requestState,
          inputResponses: { workspace: rootsResponse }
        }, "resumed")
        assert.strictEqual(completed.id, "resumed")
        assert.isUndefined(completed.error)
        const result = resultOf(completed)
        assert.strictEqual(result.resultType, "complete")
        assert.strictEqual(result.isError, false)
        assert.strictEqual(result.structuredContent, "workspace:ready")
        assert.isUndefined(result.requestState)
        assert.deepStrictEqual(handlerCalls, ["workspace", "workspace"])
        assert.deepStrictEqual(handlerStates, [undefined, declaredState])
      }))

    it.effect(`reports InvalidParams as a protocol error from an explicit MCP continuation handler in ${failureMode} mode`, () =>
      Effect.gen(function*() {
        const toolkit = Toolkit.make(Tool.make("Business", { failure: McpSchema.InvalidParams, failureMode }))
        const registrations = McpServer.toolkit(toolkit, {
          handlers: {
            Business: () => Effect.fail(new McpSchema.InvalidParams({ message: "protocol-failure" }))
          }
        })
        const message = yield* callBusinessTool(McpProtocol.v2026_07_28, registrations)
        assert.deepStrictEqual(message.error, { code: -32602, message: "protocol-failure" })
        assert.isUndefined(message.result)
      }))
  }
})
