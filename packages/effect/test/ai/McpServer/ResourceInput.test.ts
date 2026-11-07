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
const otherUri = "file:///approval/other"
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

const registrations = (
  kind: "static" | "template",
  fail = false,
  invocations?: Array<string | undefined> | undefined,
  factoryInvocations?: Array<string> | undefined
) =>
  Layer.effectDiscard(Effect.gen(function*() {
    const server = yield* McpServer.McpServer
    const handle = (resolvedUri: string) =>
      fail ?
        Effect.fail(
          new McpSchema.MissingRequiredClientCapability({
            message: "This report needs approval",
            data: { requiredCapabilities: { elicitation: { form: {} } } }
          })
        ) :
        McpSchema.McpRequestContext.useSync((context) => {
          invocations?.push(context.requestState)
          const approval = context.inputResponses?.approval
          if (approval?.action === "accept") {
            assert.strictEqual(context.requestState, "resource-approval")
            return McpSchema.ReadResourceResult.make({
              contents: [{ uri: resolvedUri, text: "Approved report" }],
              ttlMs: 60_000,
              cacheScope: "public"
            })
          }
          return new McpSchema.InputRequired({ inputRequests, requestState: "resource-approval" })
        })
    if (kind === "static") {
      for (const resourceUri of [uri, otherUri]) {
        yield* server.addResource({
          resource: { uri: resourceUri, name: "Report" },
          annotations: Context.empty(),
          handle: handle(resourceUri)
        })
      }
    } else {
      yield* server.addResourceTemplate({
        template: { uriTemplate: "file:///approval/{name}", name: "Report" },
        annotations: Context.empty(),
        routerPath: "file::///approval/:0",
        completions: {},
        handle: (resolvedUri, params) => {
          factoryInvocations?.push(resolvedUri)
          assert.deepStrictEqual(params, [resolvedUri === uri ? "report" : "other"])
          return handle(resolvedUri)
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
        const invocations: Array<string | undefined> = []
        const content = Effect.gen(function*() {
          const context = yield* McpSchema.McpRequestContext
          invocations.push(context.requestState)
          if (context.inputResponses?.approval === undefined) {
            return new McpSchema.InputRequired({ inputRequests, requestState: "helper-approval" })
          }
          assert.strictEqual(context.requestState, "helper-approval")
          if (context.inputResponses.approval.action !== "accept") {
            return yield* new McpSchema.InvalidParams({ message: "The approval was not accepted" })
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
        const state = Schema.decodeUnknownSync(Schema.String)(first.requestState)
        assert.notStrictEqual(state, "helper-approval")
        assert.notInclude(state, "helper-approval")
        assert.deepStrictEqual(invocations, [undefined])
        const invalid = yield* harness.sendRequest(
          "resources/read",
          params({
            requestState: "invalid-state",
            inputResponses: { approval: { action: "accept", content: { approved: true } } }
          })
        )
        const { error } = Schema.decodeUnknownSync(Schema.Struct({ error: McpSchema.McpError }))(invalid)
        assert.strictEqual(error.code, -32602)
        assert.strictEqual(error.message, "Invalid requestState")
        assert.deepStrictEqual(invocations, [undefined])
        const declined = yield* harness.sendRequest(
          "resources/read",
          params({
            requestState: state,
            inputResponses: { approval: { action: "decline" } }
          })
        )
        const declinedError = Schema.decodeUnknownSync(Schema.Struct({ error: McpSchema.McpError }))(declined).error
        assert.strictEqual(declinedError.code, -32602)
        assert.strictEqual(declinedError.message, "The approval was not accepted")
        assert.deepStrictEqual(invocations, [undefined, "helper-approval"])
        const completed = result(
          yield* harness.sendRequest(
            "resources/read",
            params({
              requestState: state,
              inputResponses: { approval: { action: "accept", content: { approved: true } } }
            })
          )
        )
        assert.strictEqual(completed.resultType, "complete")
        assert.deepStrictEqual(completed.contents, [{ uri, text: "Approved report" }])
        assert.deepStrictEqual(invocations, [undefined, "helper-approval", "helper-approval"])
      }))

    for (const transport of ["stdio", "http", "http-request"] as const) {
      // https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr#server-requirements-basic-workflow
      // https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/caching#cache-key
      it.effect(`seals ${kind} resource input and prevents caching its continuation over ${transport}`, () =>
        Effect.gen(function*() {
          const invocations: Array<string | undefined> = []
          const factoryInvocations: Array<string> = []
          const registration = registrations(kind, false, invocations, factoryInvocations)
          const send = transport === "stdio"
            ? (yield* makeMcpStdioHarness(protocol, [protocol], registration)).sendRequest
            : yield* Effect.gen(function*() {
              const harness = yield* makeHttpHarness(
                registration.pipe(Layer.provideMerge(makeServerLayer({
                  name: "ResourceInputServer",
                  protocols: [protocol],
                  mode: transport === "http" ? "server" : "request"
                })))
              )
              return (method: string, parameters: ReturnType<typeof params>, id: string | number) =>
                harness.post({ jsonrpc: "2.0", id, method, params: parameters }, {
                  "Mcp-Protocol-Version": protocol.protocolVersion,
                  "Mcp-Method": method,
                  "Mcp-Name": parameters.uri
                }).pipe(Effect.flatMap(readMcpHttpResponse))
            })

          const first = result(yield* send("resources/read", params(), "first"))
          assert.strictEqual(first.resultType, "input_required")
          assert.deepStrictEqual(first.inputRequests, inputRequests)
          const state = Schema.decodeUnknownSync(Schema.String)(first.requestState)
          assert.notStrictEqual(state, "resource-approval")
          assert.notInclude(state, "resource-approval")
          assert.notProperty(first, "ttlMs")
          assert.notProperty(first, "cacheScope")
          assert.deepStrictEqual(invocations, [undefined])
          const stateIndex = Math.floor(state.length / 2)
          const tampered = state.slice(0, stateIndex) + (state[stateIndex] === "A" ? "B" : "A") +
            state.slice(stateIndex + 1)
          for (
            const [index, continuation] of [
              { requestState: "invalid-state" },
              { requestState: tampered },
              { requestState: state, uri: otherUri }
            ].entries()
          ) {
            const invalid = yield* send(
              "resources/read",
              params({
                ...continuation,
                inputResponses: { approval: { action: "accept", content: { approved: true } } }
              }),
              `invalid-${index}`
            )
            const { error } = Schema.decodeUnknownSync(Schema.Struct({ error: McpSchema.McpError }))(invalid)
            assert.strictEqual(error.code, -32602)
            assert.strictEqual(error.message, "Invalid requestState")
            assert.deepStrictEqual(invocations, [undefined])
            assert.deepStrictEqual(factoryInvocations, kind === "template" ? [uri] : [])
          }
          const second = result(
            yield* send(
              "resources/read",
              params({
                inputResponses: { approval: { action: "accept", content: { approved: true } } },
                requestState: state
              }),
              "second"
            )
          )
          assert.strictEqual(second.resultType, "complete")
          assert.deepStrictEqual(second.contents, [{ uri, text: "Approved report" }])
          assert.strictEqual(second.ttlMs, 0)
          assert.strictEqual(second.cacheScope, "private")
          assert.deepStrictEqual(invocations, [undefined, "resource-approval"])
          assert.deepStrictEqual(factoryInvocations, kind === "template" ? [uri, uri] : [])
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
