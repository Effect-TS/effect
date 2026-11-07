import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpServer from "effect/ai/McpServer"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { initializeHttpSession, makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"
import { makeServerLayer } from "./TestUtils/McpServerLayer.ts"
import { makeMcpStdioHarness } from "./TestUtils/McpStdioHarness.ts"

const protocol = McpProtocol.v2026_07_28
const uri = "file:///approval/report"
const inputRequests = {
  approval: {
    method: "elicitation/create",
    params: {
      message: "Allow reading the report?",
      requestedSchema: {
        type: "object",
        properties: { approved: { type: "boolean" } },
        required: ["approved"]
      }
    }
  }
} as const

const registrations = (kind: "static" | "template", fail = false) =>
  Layer.effectDiscard(Effect.gen(function*() {
    const server = yield* McpServer.McpServer
    const handle = fail ?
      Effect.fail(
        new McpSchema.MissingRequiredClientCapability({
          message: "This report needs approval",
          data: { requiredCapabilities: { elicitation: { form: {} } } }
        })
      ) :
      McpSchema.McpRequestContext.useSync((context) => {
        const approval = context.inputResponses?.approval
        return context.requestState === "resource-approval" && approval?.action === "accept"
          ? McpSchema.ReadResourceResult.make({ contents: [{ uri, text: "Approved report" }] })
          : new McpSchema.InputRequired({ inputRequests, requestState: "resource-approval" })
      })
    if (kind === "static") {
      yield* server.addResource({
        resource: { uri, name: "Report" },
        annotations: Context.empty(),
        handle
      })
    } else {
      yield* server.addResourceTemplate({
        template: { uriTemplate: "file:///approval/{name}", name: "Report" },
        annotations: Context.empty(),
        routerPath: "file::///approval/:0",
        completions: {},
        handle: (_uri, params) => {
          assert.strictEqual(_uri, uri)
          assert.deepStrictEqual(params, ["report"])
          return handle
        }
      })
    }
  }))

const params = (continuation: Record<string, unknown> = {}, capable = true) => ({
  uri,
  ...continuation,
  _meta: {
    "io.modelcontextprotocol/protocolVersion": protocol.protocolVersion,
    "io.modelcontextprotocol/clientCapabilities": capable ? { elicitation: { form: {} } } : {},
    "io.modelcontextprotocol/clientInfo": { name: "ResourceInputClient", version: "1.0.0" }
  }
})

const result = (message: unknown) => {
  assert.isUndefined((message as { error?: unknown }).error, JSON.stringify(message))
  return Schema.decodeUnknownSync(Schema.Struct({ result: Schema.JsonObject }))(message).result
}

describe("resource input", () => {
  // https://modelcontextprotocol.io/specification/2026-07-28/server/resources#reading-resources
  for (const kind of ["static", "template"] as const) {
    it.effect(`supports ${kind} resource helper input and preserves invalid continuation errors`, () =>
      Effect.gen(function*() {
        const content = Effect.gen(function*() {
          const context = yield* McpSchema.McpRequestContext
          if (context.inputResponses?.approval === undefined) {
            return new McpSchema.InputRequired({ inputRequests, requestState: "helper-approval" })
          }
          if (context.requestState !== "helper-approval") {
            return yield* new McpSchema.InvalidParams({ message: "The approval state is invalid" })
          }
          return kind === "static"
            ? McpSchema.ReadResourceResult.make({ contents: [{ uri, text: "Approved report" }] })
            : "Approved report"
        })
        const registration = kind === "static"
          ? McpServer.resource({ uri, name: "Report", content })
          : McpServer.resource`file:///approval/${Schema.String}`({
            name: "Report",
            content: (resolvedUri, name) => {
              assert.strictEqual(resolvedUri, uri)
              assert.strictEqual(name, "report")
              return content
            }
          })
        const harness = yield* makeMcpStdioHarness(protocol, [protocol], registration)
        const first = result(yield* harness.sendRequest("resources/read", params()))
        assert.strictEqual(first.resultType, "input_required")
        assert.deepStrictEqual(first.inputRequests, inputRequests)
        const invalid = yield* harness.sendRequest(
          "resources/read",
          params({
            requestState: "invalid-state",
            inputResponses: { approval: { action: "accept", content: { approved: true } } }
          })
        )
        const { error } = Schema.decodeUnknownSync(Schema.Struct({ error: McpSchema.McpError }))(invalid)
        assert.strictEqual(error.code, -32602)
        assert.strictEqual(error.message, "The approval state is invalid")
        const completed = result(
          yield* harness.sendRequest(
            "resources/read",
            params({
              requestState: first.requestState,
              inputResponses: { approval: { action: "accept", content: { approved: true } } }
            })
          )
        )
        assert.strictEqual(completed.resultType, "complete")
        assert.deepStrictEqual(completed.contents, [{ uri, text: "Approved report" }])
      }))

    for (const transport of ["stdio", "http"] as const) {
      it.effect(`supports ${kind} resource input and continuation over ${transport}`, () =>
        Effect.gen(function*() {
          const send = transport === "stdio"
            ? (yield* makeMcpStdioHarness(protocol, [protocol], registrations(kind))).sendRequest
            : yield* Effect.gen(function*() {
              const harness = yield* makeHttpHarness(
                registrations(kind).pipe(Layer.provideMerge(makeServerLayer({
                  name: "ResourceInputServer",
                  protocols: [protocol]
                })))
              )
              return (method: string, params?: unknown, id?: string | number) =>
                harness.post({ jsonrpc: "2.0", id, method, params }, {
                  "Mcp-Protocol-Version": protocol.protocolVersion,
                  "Mcp-Method": method,
                  "Mcp-Name": uri
                }).pipe(Effect.flatMap(readMcpHttpResponse))
            })

          const first = result(yield* send("resources/read", params(), "first"))
          assert.strictEqual(first.resultType, "input_required")
          assert.deepStrictEqual(first.inputRequests, inputRequests)
          assert.strictEqual(first.requestState, "resource-approval")
          const second = result(
            yield* send(
              "resources/read",
              params({
                inputResponses: { approval: { action: "accept", content: { approved: true } } },
                requestState: first.requestState
              }),
              "second"
            )
          )
          assert.strictEqual(second.resultType, "complete")
          assert.deepStrictEqual(second.contents, [{ uri, text: "Approved report" }])
        }))
    }

    it.effect(`rejects ${kind} resource input without the required client capability`, () =>
      Effect.gen(function*() {
        const harness = yield* makeHttpHarness(
          registrations(kind).pipe(Layer.provideMerge(makeServerLayer({
            name: "ResourceInputServer",
            protocols: [protocol]
          })))
        )
        const response = yield* harness.post({
          jsonrpc: "2.0",
          id: "missing-capability",
          method: "resources/read",
          params: params({}, false)
        }, {
          "Mcp-Protocol-Version": protocol.protocolVersion,
          "Mcp-Method": "resources/read",
          "Mcp-Name": uri
        })
        assert.strictEqual(response.status, 400)
        const message = Schema.decodeUnknownSync(Schema.Struct({ error: McpSchema.McpError }))(
          yield* readMcpHttpResponse(response)
        )
        assert.strictEqual(message.error.code, -32021)
        assert.deepStrictEqual(message.error.data, { requiredCapabilities: { elicitation: { form: {} } } })
      }))

    // https://modelcontextprotocol.io/specification/2026-07-28/basic#_meta
    for (const selected of [protocol, McpProtocol.v2025_11_25]) {
      for (const transport of ["stdio", "http"] as const) {
        it.effect(`preserves a ${kind} resource capability failure on ${selected.protocolVersion} over ${transport}`, () =>
          Effect.gen(function*() {
            const modern = selected.runtime._tag === "Stateless"
            const message = yield* Effect.gen(function*() {
              if (transport === "stdio") {
                const harness = yield* makeMcpStdioHarness(selected, [selected], registrations(kind, true))
                if (!modern) {
                  yield* harness.initialize()
                }
                return yield* harness.sendRequest("resources/read", modern ? params({}, false) : { uri })
              }
              const harness = yield* makeHttpHarness(
                registrations(kind, true).pipe(
                  Layer.provideMerge(makeServerLayer({ name: "ResourceFailureServer", protocols: [selected] }))
                )
              )
              const headers = modern
                ? { "Mcp-Protocol-Version": selected.protocolVersion, "Mcp-Method": "resources/read", "Mcp-Name": uri }
                : yield* initializeHttpSession(harness, selected)
              const response = yield* harness.post({
                jsonrpc: "2.0",
                id: "failure",
                method: "resources/read",
                params: modern ? params({}, false) : { uri }
              }, headers)
              assert.strictEqual(response.status, modern ? 400 : 200)
              return yield* readMcpHttpResponse(response)
            })
            const { error } = Schema.decodeUnknownSync(Schema.Struct({ error: McpSchema.McpError }))(message)
            assert.strictEqual(error.code, modern ? -32021 : -32602)
            assert.strictEqual(error.message, "This report needs approval")
            assert.deepStrictEqual(error.data, { requiredCapabilities: { elicitation: { form: {} } } })
          }))
      }
    }
  }
})
