import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Layer, Schema } from "effect"
import { McpProtocol, McpSchema, McpServer } from "effect/ai"
import { makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"

const uri = "file:///sampling/report"
const text = { type: "text", text: "Report source" } as const
const toolUse = (id: string) => ({ type: "tool_use", id, name: "source", input: {} }) as const
const toolResult = (toolUseId: string) => ({ type: "tool_result", toolUseId, content: [text] }) as const
const validMessages = [
  { role: "assistant", content: [text, toolUse("one"), toolUse("two")] },
  { role: "user", content: [toolResult("two"), toolResult("one")] }
] as const
const invalidMessages = [
  { role: "assistant", content: [toolUse("one"), toolUse("two")] },
  { role: "user", content: toolResult("one") }
] as const

const makeHarness = (
  kind: "static" | "template",
  transport: "http" | "request-http",
  messages: ReadonlyArray<unknown>
) => {
  const inputRequired = new McpSchema.InputRequired({
    inputRequests: { sample: { method: "sampling/createMessage", params: { messages, maxTokens: 64 } } }
  })
  const registrations = Layer.effectDiscard(McpServer.McpServer.use((server) =>
    kind === "static"
      ? server.addResource({
        resource: { uri, name: "Report" },
        annotations: Context.empty(),
        handle: Effect.succeed(inputRequired)
      })
      : server.addResourceTemplate({
        template: { uriTemplate: "file:///sampling/{name}", name: "Report" },
        annotations: Context.empty(),
        routerPath: "file::///sampling/:0",
        completions: {},
        handle: () => Effect.succeed(inputRequired)
      })
  ))
  const options = {
    name: "ResourceSamplingValidation",
    version: "1.0.0",
    path: "/mcp",
    protocols: [McpProtocol.v2026_07_28],
    registrations
  } as const
  return makeHttpHarness(
    transport === "http" ? McpServer.layerHttp(options) : McpServer.layerHttpRequestScoped(options)
  )
}

const readResource = Effect.fnUntraced(function*(
  harness: Effect.Success<ReturnType<typeof makeHarness>>,
  tools: boolean
) {
  const response = yield* harness.post({
    jsonrpc: "2.0",
    id: "read",
    method: "resources/read",
    params: {
      uri,
      _meta: {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientCapabilities": { sampling: tools ? { tools: {} } : {} }
      }
    }
  }, {
    "Mcp-Method": "resources/read",
    "Mcp-Name": uri,
    "Mcp-Protocol-Version": "2026-07-28"
  })
  return { response, message: yield* readMcpHttpResponse(response) }
})

// Resource MRTR uses the same sampling tool-message requirements as tool and prompt requests.
// https://modelcontextprotocol.io/specification/2026-07-28/server/resources#reading-resources
// https://modelcontextprotocol.io/specification/2026-07-28/client/sampling#tool-results
describe("Resource sampling validation", () => {
  for (const kind of ["static", "template"] as const) {
    for (const transport of ["http", "request-http"] as const) {
      describe(`${kind} resource over ${transport}`, () => {
        it.effect("accepts parallel tool results in a different order", () =>
          Effect.gen(function*() {
            const harness = yield* makeHarness(kind, transport, validMessages)
            const { message, response } = yield* readResource(harness, true)
            const decoded = Schema.decodeUnknownSync(Schema.Struct({
              result: Schema.Struct({ resultType: Schema.Literal("input_required"), inputRequests: Schema.JsonObject })
            }))(message)
            assert.strictEqual(response.status, 200)
            assert.deepStrictEqual(decoded.result.inputRequests, {
              sample: { method: "sampling/createMessage", params: { messages: validMessages, maxTokens: 64 } }
            })
          }))

        it.effect("rejects an incomplete tool result history with a sanitized internal error", () =>
          Effect.gen(function*() {
            const harness = yield* makeHarness(kind, transport, invalidMessages)
            const { message, response } = yield* readResource(harness, true)
            assert.strictEqual(response.status, 500)
            assert.deepStrictEqual(message, {
              jsonrpc: "2.0",
              id: "read",
              error: { code: -32603, message: "Internal error" }
            })
          }))

        it.effect("checks sampling.tools before validating the message history", () =>
          Effect.gen(function*() {
            const harness = yield* makeHarness(kind, transport, invalidMessages)
            const { message, response } = yield* readResource(harness, false)
            const decoded = Schema.decodeUnknownSync(Schema.Struct({ error: McpSchema.McpError }))(message)
            assert.strictEqual(response.status, 400)
            assert.strictEqual(decoded.error.code, -32021)
            assert.deepStrictEqual(decoded.error.data, { requiredCapabilities: { sampling: { tools: {} } } })
            assert.notProperty(message, "result")
          }))
      })
    }
  }
})
