import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Layer, Result, Schema } from "effect"
import { McpProtocol, McpSchema, McpServer } from "effect/ai"
import { makeMcpTestPeer } from "./McpConformance/McpTestPeer.ts"
import { makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"

const text = { type: "text", text: "Weather?" } as const
const toolUse = (id: string) => ({ type: "tool_use", id, name: "weather", input: {} }) as const
const toolResult = (toolUseId: string) => ({ type: "tool_result", toolUseId, content: [text] }) as const
const assistant = (content: Schema.Json) => ({ role: "assistant", content }) as const
const user = (content: Schema.Json) => ({ role: "user", content }) as const
const textResponse = { role: "assistant", content: text, model: "test-model" } as const

const invalidHistories = [
  { name: "a user message containing a tool use", messages: [user(toolUse("one")), user(toolResult("one"))] },
  { name: "an assistant message containing a tool result", messages: [assistant(toolResult("one"))] },
  { name: "an orphan tool result", messages: [user(toolResult("one"))] },
  {
    name: "tool results mixed with ordinary content",
    messages: [assistant(toolUse("one")), user([toolResult("one"), text])]
  },
  {
    name: "a mismatched tool result identifier",
    messages: [assistant(toolUse("one")), user(toolResult("two"))]
  },
  {
    name: "a missing parallel tool result",
    messages: [assistant([toolUse("one"), toolUse("two")]), user(toolResult("one"))]
  },
  {
    name: "an additional tool result",
    messages: [assistant(toolUse("one")), user([toolResult("one"), toolResult("two")])]
  },
  {
    name: "a repeated tool result",
    messages: [assistant(toolUse("one")), user([toolResult("one"), toolResult("one")])]
  },
  {
    name: "duplicate tool use identifiers",
    messages: [assistant([toolUse("one"), toolUse("one")]), user(toolResult("one"))]
  },
  {
    name: "an intervening assistant message",
    messages: [assistant(toolUse("one")), assistant(text), user(toolResult("one"))]
  },
  {
    name: "an empty message instead of tool results",
    messages: [assistant(toolUse("one")), user([])]
  },
  { name: "a tool use without a following result", messages: [assistant(toolUse("one"))] }
] as const

const validHistories = [
  { name: "text-only content arrays", messages: [user([text, text])], tools: false },
  {
    name: "single-block tool use and result messages",
    messages: [assistant(toolUse("one")), user(toolResult("one"))],
    tools: true
  },
  {
    name: "parallel tool results in a different order",
    messages: [assistant([text, toolUse("one"), toolUse("two")]), user([toolResult("two"), toolResult("one")])],
    tools: true
  },
  {
    name: "multiple completed rounds with reused identifiers",
    messages: [assistant(toolUse("one")), user(toolResult("one")), assistant(toolUse("one")), user(toolResult("one"))],
    tools: true
  },
  {
    name: "a failed tool result",
    messages: [assistant(toolUse("one")), user({ ...toolResult("one"), isError: true })],
    tools: true
  }
] as const

const makeModernHarness = (messages: ReadonlyArray<unknown>) => {
  const result = new McpSchema.InputRequired({
    inputRequests: { sample: { method: "sampling/createMessage", params: { messages, maxTokens: 64 } } }
  })
  const registrations = Layer.effectDiscard(McpServer.McpServer.use((server) =>
    Effect.gen(function*() {
      yield* server.addTool({
        tool: new McpSchema.Tool({ name: "sample", inputSchema: { type: "object" } }),
        annotations: Context.empty(),
        handle: () => Effect.succeed(result)
      })
      yield* server.addPrompt({
        prompt: new McpSchema.Prompt({ name: "sample" }),
        annotations: Context.empty(),
        completions: {},
        handle: () => Effect.succeed(result)
      })
    })
  ))
  return makeHttpHarness(McpServer.layerHttp({
    name: "SamplingValidation",
    version: "1.0.0",
    path: "/mcp",
    protocols: [McpProtocol.v2026_07_28],
    registrations
  }))
}

const requestSampling = Effect.fnUntraced(function*(
  harness: Effect.Success<ReturnType<typeof makeModernHarness>>,
  method: "tools/call" | "prompts/get",
  tools: boolean
) {
  const response = yield* harness.post({
    jsonrpc: "2.0",
    id: 1,
    method,
    params: {
      name: "sample",
      arguments: {},
      _meta: {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientCapabilities": { sampling: tools ? { tools: {} } : {} }
      }
    }
  }, { "Mcp-Method": method, "Mcp-Name": "sample", "Mcp-Protocol-Version": "2026-07-28" })
  return { response, message: yield* readMcpHttpResponse(response) }
})

// Tool uses must be followed by matching user tool results before another message.
// https://modelcontextprotocol.io/specification/2025-11-25/client/sampling#tool-results
// https://modelcontextprotocol.io/specification/2026-07-28/client/sampling#tool-results
describe("Sampling message validation", () => {
  describe("2025-11-25", () => {
    for (const { messages, name } of invalidHistories) {
      it.effect(`rejects ${name} before sending a reverse request`, () =>
        Effect.gen(function*() {
          const peer = yield* makeMcpTestPeer(McpProtocol.v2025_11_25, {
            capabilities: { sampling: { tools: {} } },
            handlers: { "sampling/createMessage": () => Effect.succeed(textResponse) }
          })
          const request = Schema.decodeUnknownSync(McpSchema.CreateMessage.payloadSchema)({ messages, maxTokens: 64 })
          const result = yield* Effect.result(peer.reverseClient.createMessage(request))

          assert.strictEqual(result._tag, "Failure")
          if (Result.isFailure(result)) {
            assert.strictEqual(result.failure._tag, "McpReverseOperationError")
            assert.strictEqual(result.failure.operation, "sampling/createMessage")
          }
          assert.deepStrictEqual(yield* peer.requests, [])
        }))
    }

    for (const history of validHistories) {
      it.effect(`accepts ${history.name}`, () =>
        Effect.gen(function*() {
          const peer = yield* makeMcpTestPeer(McpProtocol.v2025_11_25, {
            capabilities: { sampling: history.tools ? { tools: {} } : {} },
            // A new tool use in the client's result remains valid: the next request supplies its result.
            handlers: {
              "sampling/createMessage": () =>
                Effect.succeed(
                  history.tools ?
                    {
                      role: "assistant",
                      content: toolUse("next"),
                      model: "test-model",
                      stopReason: "toolUse"
                    } :
                    textResponse
                )
            }
          })
          const request = Schema.decodeUnknownSync(McpSchema.CreateMessage.payloadSchema)({
            messages: history.messages,
            maxTokens: 64
          })
          yield* peer.reverseClient.createMessage(request)
          assert.strictEqual((yield* peer.requests).length, 1)
        }))
    }

    it.effect("checks sampling.tools before validating the message sequence", () =>
      Effect.gen(function*() {
        const peer = yield* makeMcpTestPeer(McpProtocol.v2025_11_25, { capabilities: { sampling: {} } })
        const request = Schema.decodeUnknownSync(McpSchema.CreateMessage.payloadSchema)({
          messages: [assistant(toolUse("one"))],
          maxTokens: 64
        })
        const error = yield* Effect.flip(peer.reverseClient.createMessage(request))
        assert.strictEqual(error._tag, "McpReverseOperationUnsupported")
        assert.deepStrictEqual(yield* peer.requests, [])
      }))
  })

  for (const method of ["tools/call", "prompts/get"] as const) {
    describe(`2026-07-28 ${method}`, () => {
      for (const { messages, name } of invalidHistories) {
        it.effect(`rejects ${name} without emitting input requests`, () =>
          Effect.gen(function*() {
            const harness = yield* makeModernHarness(messages)
            const { message, response } = yield* requestSampling(harness, method, true)
            assert.deepStrictEqual(message, {
              jsonrpc: "2.0",
              id: 1,
              error: { code: -32603, message: "Internal error" }
            })
            assert.strictEqual(response.status, 500)
          }))
      }

      for (const history of validHistories) {
        it.effect(`accepts ${history.name}`, () =>
          Effect.gen(function*() {
            const harness = yield* makeModernHarness(history.messages)
            const { message, response } = yield* requestSampling(harness, method, history.tools)
            const decoded = Schema.decodeUnknownSync(Schema.Struct({
              result: Schema.Struct({ resultType: Schema.Literal("input_required"), inputRequests: Schema.JsonObject })
            }))(message)
            assert.deepStrictEqual(decoded.result.inputRequests, {
              sample: { method: "sampling/createMessage", params: { messages: history.messages, maxTokens: 64 } }
            })
            assert.strictEqual(response.status, 200)
          }))
      }

      it.effect("checks sampling.tools before validating the message sequence", () =>
        Effect.gen(function*() {
          const harness = yield* makeModernHarness([assistant(toolUse("one"))])
          const { message, response } = yield* requestSampling(harness, method, false)
          const decoded = Schema.decodeUnknownSync(Schema.Struct({ error: McpSchema.McpError }))(message)
          assert.strictEqual(decoded.error.code, -32021)
          assert.deepStrictEqual(decoded.error.data, { requiredCapabilities: { sampling: { tools: {} } } })
          assert.strictEqual(response.status, 400)
        }))
    })
  }
})
