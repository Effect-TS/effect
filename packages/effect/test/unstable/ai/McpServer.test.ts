import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Context, Effect, Layer, Schema } from "effect"
import type * as Arr from "effect/Array"
import * as McpSchema from "effect/unstable/ai/McpSchema"
import * as McpServer from "effect/unstable/ai/McpServer"
import * as Tool from "effect/unstable/ai/Tool"
import * as Toolkit from "effect/unstable/ai/Toolkit"
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import { RpcSerialization } from "effect/unstable/rpc"
import * as RpcClient from "effect/unstable/rpc/RpcClient"

interface MakeTestClientOptions {
  readonly supportedProtocolVersions?: Arr.NonEmptyReadonlyArray<McpServer.ProtocolVersion>
  readonly register?: Effect.Effect<void, never, McpServer.McpServer>
  readonly onSessionToolCall?: () => void
}

interface RawRequestOptions {
  readonly body: unknown
  readonly sessionId?: string
  readonly protocolVersion?: string
}

interface OperationalRequestOptions {
  readonly body: unknown
  readonly protocolVersion?: string
}

const makeTestClient = (options: MakeTestClientOptions = {}) =>
  Effect.gen(function*() {
    const responses: Array<Response> = []

    const protocolLayer = McpServer.layerHttp({
      name: "TestServer",
      version: "1.0.0",
      path: "/mcp",
      supportedProtocolVersions: options.supportedProtocolVersions ?? McpServer.supportedProtocolVersions
    })
    const serverLayer = Layer.effectDiscard(Effect.gen(function*() {
      const server = yield* McpServer.McpServer
      yield* server.addTool({
        tool: new McpSchema.Tool({
          name: "session",
          inputSchema: { type: "object" }
        }),
        annotations: Context.empty(),
        handle: () =>
          Effect.gen(function*() {
            options.onSessionToolCall?.()
            const client = yield* McpSchema.McpServerClient
            return new McpSchema.CallToolResult({
              content: [{
                type: "text",
                text: JSON.stringify({
                  notifications: server.initializedClients.has(client.clientId),
                  requested: client.initializePayload.protocolVersion,
                  negotiated: client.protocolVersion
                })
              }]
            })
          })
      })
      if (options.register) {
        yield* options.register
      }
    })).pipe(Layer.provideMerge(protocolLayer))
    const { handler, dispose } = HttpRouter.toWebHandler(serverLayer, { disableLogger: true })
    yield* Effect.addFinalizer(() => Effect.promise(() => dispose()))

    let sessionId: string | null = null
    const customFetch: typeof fetch = async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init)
      if (sessionId) {
        request.headers.set("Mcp-Session-Id", sessionId)
      }
      const response = await handler(request)
      sessionId = response.headers.get("Mcp-Session-Id") ?? sessionId
      responses.push(response.clone())
      return response
    }

    const clientLayer = RpcClient.layerProtocolHttp({ url: "http://localhost/mcp" }).pipe(
      Layer.provideMerge([FetchHttpClient.layer, RpcSerialization.layerJsonRpc()]),
      Layer.provide(Layer.succeed(FetchHttpClient.Fetch, customFetch))
    )
    const client = yield* RpcClient.make(McpSchema.ClientRpcs).pipe(
      Effect.provide(clientLayer)
    )

    const initialize = (protocolVersion: string, clientName = "TestClient") =>
      client.initialize({
        protocolVersion,
        capabilities: {},
        clientInfo: { name: clientName, version: "1.0.0" }
      })

    const rawRequest = ({ body, protocolVersion, sessionId }: RawRequestOptions) => {
      const headers = new Headers({ "content-type": "application/json" })
      if (sessionId !== undefined) {
        headers.set("Mcp-Session-Id", sessionId)
      }
      if (protocolVersion !== undefined) {
        headers.set("Mcp-Protocol-Version", protocolVersion)
      }
      return Effect.promise(() =>
        handler(
          new Request("http://localhost/mcp", {
            method: "POST",
            headers,
            body: JSON.stringify(body)
          })
        )
      )
    }

    const operationalRequest = ({ body, protocolVersion }: OperationalRequestOptions) =>
      rawRequest({
        body,
        ...(sessionId === null ? {} : { sessionId }),
        ...(protocolVersion === undefined ? {} : { protocolVersion })
      })

    const createRawSession = () => {
      let rawSessionId: string | undefined
      const initialize = (protocolVersion: string, clientName = "RawClient") =>
        Effect.gen(function*() {
          const response = yield* rawRequest({
            body: {
              jsonrpc: "2.0",
              id: 0,
              method: "initialize",
              params: {
                protocolVersion,
                capabilities: {},
                clientInfo: { name: clientName, version: "1.0.0" }
              }
            }
          })
          rawSessionId = response.headers.get("Mcp-Session-Id") ?? undefined
          return response
        })
      const request = (body: unknown, protocolVersion?: string) =>
        rawRequest({
          body,
          ...(rawSessionId === undefined ? {} : { sessionId: rawSessionId }),
          ...(protocolVersion === undefined ? {} : { protocolVersion })
        })
      return {
        initialize,
        request,
        get sessionId() {
          return rawSessionId
        }
      }
    }

    return { client, createRawSession, initialize, operationalRequest, rawRequest, responses }
  })

const ObjectTool = Tool.make("object-output", {
  success: Schema.Struct({ status: Schema.String })
})
const PrimitiveTool = Tool.make("primitive-output", { success: Schema.String })
const ArrayTool = Tool.make("array-output", { success: Schema.Array(Schema.String) })
const FailingTool = Tool.make("failing", {
  success: Schema.String,
  failure: Schema.String
})
const RepresentativeToolkit = Toolkit.make(ObjectTool, PrimitiveTool, ArrayTool, FailingTool)

const enabledAnnotations = Context.make(
  McpSchema.EnabledWhen,
  (payload) => payload.clientInfo.name === "EnabledClient"
)
const FiniteNumberFromString = Schema.NumberFromString.check(Schema.isFinite())
const CountString = Schema.String.check(Schema.isPattern(/^\d+$/))

const registerRepresentativeCapabilities = Effect.gen(function*() {
  const server = yield* McpServer.McpServer

  yield* server.addTool({
    tool: new McpSchema.Tool({ name: "argumentless", inputSchema: { type: "object" } }),
    annotations: Context.empty(),
    handle: (arguments_) =>
      Effect.succeed(
        new McpSchema.CallToolResult({
          content: [{ type: "text", text: JSON.stringify(arguments_) }]
        })
      )
  })
  yield* server.addTool({
    tool: new McpSchema.Tool({ name: "enabled-tool", inputSchema: { type: "object" } }),
    annotations: enabledAnnotations,
    handle: () => Effect.succeed(new McpSchema.CallToolResult({ content: [] }))
  })

  yield* McpServer.registerToolkit(RepresentativeToolkit).pipe(
    Effect.provide(RepresentativeToolkit.toLayer({
      "object-output": () => Effect.succeed({ status: "ok" }),
      "primitive-output": () => Effect.succeed("ok"),
      "array-output": () => Effect.succeed(["ok"]),
      failing: () => Effect.fail("handler failed")
    }))
  )

  yield* McpServer.registerResource({
    uri: "file:///text",
    name: "text-resource",
    content: Effect.succeed("text content")
  })
  yield* McpServer.registerResource({
    uri: "file:///binary",
    name: "binary-resource",
    content: Effect.succeed(new Uint8Array([1, 2, 3]))
  })
  yield* McpServer.registerResource({
    uri: "file:///enabled",
    name: "enabled-resource",
    content: Effect.succeed("enabled"),
    annotations: enabledAnnotations
  })

  const id = McpSchema.param("id", FiniteNumberFromString)
  yield* McpServer.registerResource`file:///items/${id}`({
    name: "item-template",
    completion: {
      id: () => Effect.succeed(Array.from({ length: 105 }, (_, index) => index))
    },
    content: (uri, value) => Effect.succeed(`${uri}:${value}`)
  })
  yield* McpServer.registerResource`file:///enabled-items/${id}`({
    name: "enabled-template",
    content: (_uri, value) => Effect.succeed(String(value)),
    annotations: enabledAnnotations
  })

  yield* McpServer.registerPrompt({
    name: "count-prompt",
    parameters: { count: CountString },
    completion: {
      count: () => Effect.succeed(Array.from({ length: 105 }, (_, index) => String(index)))
    },
    content: ({ count }) => Effect.succeed(`Count: ${count}`)
  })
  yield* McpServer.registerPrompt({
    name: "enabled-prompt",
    content: () => Effect.succeed("enabled"),
    annotations: enabledAnnotations
  })
})

const makeRepresentativeClient = (protocolVersion: McpServer.ProtocolVersion, clientName = "TestClient") =>
  Effect.gen(function*() {
    const fixture = yield* makeTestClient({ register: registerRepresentativeCapabilities })
    yield* fixture.initialize(protocolVersion, clientName)
    yield* Effect.ignore(fixture.client["notifications/initialized"]({}))
    return fixture.client
  })

const pingRequest = (id: number) => ({ jsonrpc: "2.0", id, method: "ping", params: {} })
const initializedNotification = {
  jsonrpc: "2.0",
  method: "notifications/initialized",
  params: {}
}
const sessionToolRequest = (id: number) => ({
  jsonrpc: "2.0",
  id,
  method: "tools/call",
  params: { name: "session", arguments: {} }
})

const protocolVersionSuite = (protocolVersion: McpServer.ProtocolVersion) => {
  it.effect("echoes the supported protocol version during initialization", () =>
    Effect.gen(function*() {
      const { initialize } = yield* makeTestClient()

      const result = yield* initialize(protocolVersion)

      strictEqual(result.protocolVersion, protocolVersion)
    }))

  it.effect("returns initialization session and protocol headers", () =>
    Effect.gen(function*() {
      const { initialize, responses } = yield* makeTestClient()

      const result = yield* initialize(protocolVersion)

      strictEqual(result.protocolVersion, protocolVersion)
      strictEqual(responses.length, 1)
      strictEqual(responses[0].headers.get("Mcp-Protocol-Version"), protocolVersion)
      strictEqual(typeof responses[0].headers.get("Mcp-Session-Id"), "string")
    }))

  it.effect("returns initialization headers and body over raw HTTP", () =>
    Effect.gen(function*() {
      const { createRawSession } = yield* makeTestClient()
      const session = createRawSession()

      const response = yield* session.initialize(protocolVersion)

      strictEqual(response.status, 200)
      strictEqual(response.headers.get("Mcp-Protocol-Version"), protocolVersion)
      strictEqual(response.headers.get("Mcp-Session-Id"), session.sessionId)
      strictEqual(response.headers.get("content-type"), "application/json")
      deepStrictEqual(yield* Effect.promise(() => response.json()), {
        jsonrpc: "2.0",
        id: 0,
        result: {
          protocolVersion,
          capabilities: { completions: {}, tools: {} },
          serverInfo: { name: "TestServer", version: "1.0.0" }
        }
      }, "raw initialization response")
    }))

  it.effect("handles at least three sequential requests in one HTTP session", () =>
    Effect.gen(function*() {
      const { createRawSession } = yield* makeTestClient()
      const session = createRawSession()
      yield* session.initialize(protocolVersion)
      const notification = yield* session.request(initializedNotification, protocolVersion)

      const first = yield* session.request(pingRequest(1), protocolVersion)
      const second = yield* session.request(pingRequest(2))
      const third = yield* session.request(pingRequest(3), protocolVersion)

      strictEqual(notification.status, 202)
      strictEqual(first.status, 200)
      strictEqual(second.status, 200)
      strictEqual(third.status, 200)
      deepStrictEqual(yield* Effect.promise(() => first.json()), { jsonrpc: "2.0", id: 1, result: {} })
      deepStrictEqual(yield* Effect.promise(() => second.json()), { jsonrpc: "2.0", id: 2, result: {} })
      deepStrictEqual(yield* Effect.promise(() => third.json()), { jsonrpc: "2.0", id: 3, result: {} })
    }))

  it.effect("rejects reinitializing an existing HTTP session", () =>
    Effect.gen(function*() {
      const { initialize } = yield* makeTestClient()

      yield* initialize(protocolVersion)
      const exit = yield* Effect.exit(initialize(protocolVersion))

      strictEqual(exit._tag, "Failure")
    }))

  it.effect("preserves the requested version separately from the negotiated version", () =>
    Effect.gen(function*() {
      const { client, initialize } = yield* makeTestClient({ supportedProtocolVersions: [protocolVersion] })

      yield* initialize("9999-01-01")
      const beforeInitialized = yield* Effect.exit(client["tools/call"]({ name: "session", arguments: {} }))
      strictEqual(beforeInitialized._tag, "Failure")

      yield* Effect.ignore(client["notifications/initialized"]({}))
      const result = yield* client["tools/call"]({ name: "session", arguments: {} })

      strictEqual(result.content[0]?.type, "text")
      if (result.content[0]?.type === "text") {
        strictEqual(
          result.content[0].text,
          JSON.stringify({
            notifications: false,
            requested: "9999-01-01",
            negotiated: protocolVersion
          })
        )
      }
    }))

  it.effect("accepts duplicate initialized notifications", () =>
    Effect.gen(function*() {
      const { client, initialize } = yield* makeTestClient()

      yield* initialize(protocolVersion)
      yield* Effect.ignore(client["notifications/initialized"]({}))
      yield* Effect.ignore(client["notifications/initialized"]({}))
    }))

  it.effect("accepts the negotiated protocol version header", () =>
    Effect.gen(function*() {
      const { initialize, operationalRequest } = yield* makeTestClient()
      yield* initialize(protocolVersion)

      const response = yield* operationalRequest({
        body: { jsonrpc: "2.0", id: 1, method: "ping", params: {} },
        protocolVersion
      })

      strictEqual(response.status, 200)
      strictEqual(response.headers.get("Mcp-Protocol-Version"), protocolVersion)
      strictEqual(response.headers.get("content-type"), "application/json")
    }))

  it.effect("uses the session version when the protocol header is omitted", () =>
    Effect.gen(function*() {
      const { initialize, operationalRequest } = yield* makeTestClient()
      yield* initialize(protocolVersion)

      const response = yield* operationalRequest({
        body: { jsonrpc: "2.0", id: 1, method: "ping", params: {} }
      })

      strictEqual(response.status, 200)
      strictEqual(response.headers.get("Mcp-Protocol-Version"), protocolVersion)
    }))

  it.effect("returns 202 for accepted initialized notifications", () =>
    Effect.gen(function*() {
      const { initialize, operationalRequest } = yield* makeTestClient()
      yield* initialize(protocolVersion)

      const response = yield* operationalRequest({
        body: {
          jsonrpc: "2.0",
          method: "notifications/initialized",
          params: {}
        }
      })

      strictEqual(response.status, 202)
      strictEqual(yield* Effect.promise(() => response.text()), "")
    }))

  it.effect("rejects unsupported and malformed protocol headers", () =>
    Effect.gen(function*() {
      const { createRawSession } = yield* makeTestClient()
      const session = createRawSession()
      yield* session.initialize(protocolVersion)
      yield* session.request(initializedNotification)

      const unsupported = yield* session.request(pingRequest(1), "9999-01-01")
      const malformed = yield* session.request(pingRequest(2), "not-a-version")

      strictEqual(unsupported.status, 400)
      strictEqual(malformed.status, 400)
    }))

  it.effect("rejects a protocol header that differs from the negotiated version", () =>
    Effect.gen(function*() {
      const { createRawSession } = yield* makeTestClient()
      const session = createRawSession()
      yield* session.initialize(protocolVersion)

      const response = yield* session.request(
        pingRequest(1),
        protocolVersion === "2025-11-25" ? "2025-06-18" : "2025-11-25"
      )

      strictEqual(response.status, 400)
    }))

  it.effect("does not invoke handlers for rejected protocol headers", () =>
    Effect.gen(function*() {
      let invocations = 0
      const { createRawSession } = yield* makeTestClient({
        onSessionToolCall: () => {
          invocations++
        }
      })
      const session = createRawSession()
      yield* session.initialize(protocolVersion)
      yield* session.request(initializedNotification)

      const unsupported = yield* session.request(sessionToolRequest(1), "9999-01-01")
      const malformed = yield* session.request(sessionToolRequest(2), "not-a-version")
      const mismatch = yield* session.request(
        sessionToolRequest(3),
        protocolVersion === "2025-11-25" ? "2025-06-18" : "2025-11-25"
      )

      strictEqual(unsupported.status, 400)
      strictEqual(malformed.status, 400)
      strictEqual(mismatch.status, 400)
      strictEqual(invocations, 0)
    }))

  it.effect("advertises registered capabilities", () =>
    Effect.gen(function*() {
      const { initialize } = yield* makeTestClient({ register: registerRepresentativeCapabilities })

      const result = yield* initialize(protocolVersion)

      deepStrictEqual(result.capabilities, {
        completions: {},
        tools: {},
        resources: { subscribe: false },
        prompts: {}
      })
    }))

  it.effect("returns InvalidParams for an unknown tool", () =>
    Effect.gen(function*() {
      const client = yield* makeRepresentativeClient(protocolVersion)

      const error = yield* Effect.flip(client["tools/call"]({ name: "unknown" }))

      strictEqual(error instanceof McpSchema.InvalidParams, true)
    }))

  it.effect("normalizes omitted tool arguments", () =>
    Effect.gen(function*() {
      const client = yield* makeRepresentativeClient(protocolVersion)

      const result = yield* client["tools/call"]({ name: "argumentless" })

      strictEqual(result.content[0]?.type, "text")
      if (result.content[0]?.type === "text") {
        strictEqual(result.content[0].text, "{}")
      }
    }))

  it.effect("returns toolkit handler failures as tool errors", () =>
    Effect.gen(function*() {
      const client = yield* makeRepresentativeClient(protocolVersion)

      const result = yield* client["tools/call"]({ name: "failing" })

      strictEqual(result.isError, true)
      strictEqual(result.content[0]?.type, "text")
    }))

  it.effect("includes structured content only for object tool output", () =>
    Effect.gen(function*() {
      const client = yield* makeRepresentativeClient(protocolVersion)

      const object = yield* client["tools/call"]({ name: "object-output" })
      const primitive = yield* client["tools/call"]({ name: "primitive-output" })
      const array = yield* client["tools/call"]({ name: "array-output" })

      deepStrictEqual(object.structuredContent, { status: "ok" })
      strictEqual(primitive.structuredContent, undefined)
      strictEqual(array.structuredContent, undefined)
    }))

  it.effect("returns InvalidParams for an unknown prompt", () =>
    Effect.gen(function*() {
      const client = yield* makeRepresentativeClient(protocolVersion)

      const error = yield* Effect.flip(client["prompts/get"]({ name: "unknown" }))

      strictEqual(error instanceof McpSchema.InvalidParams, true)
    }))

  it.effect("converts string prompts to user text messages", () =>
    Effect.gen(function*() {
      const client = yield* makeRepresentativeClient(protocolVersion)

      const result = yield* client["prompts/get"]({
        name: "count-prompt",
        arguments: { count: "2" }
      })

      strictEqual(result.messages[0]?.role, "user")
      strictEqual(result.messages[0]?.content.type, "text")
      if (result.messages[0]?.content.type === "text") {
        strictEqual(result.messages[0].content.text, "Count: 2")
      }
    }))

  it.effect("returns InvalidParams for prompt argument decode errors", () =>
    Effect.gen(function*() {
      const client = yield* makeRepresentativeClient(protocolVersion)

      const error = yield* Effect.flip(client["prompts/get"]({
        name: "count-prompt",
        arguments: { count: "not-a-number" }
      }))

      strictEqual(error instanceof McpSchema.InvalidParams, true)
    }))

  it.effect("returns empty contents for an unknown resource", () =>
    Effect.gen(function*() {
      const client = yield* makeRepresentativeClient(protocolVersion)

      const result = yield* client["resources/read"]({ uri: "file:///unknown" })

      deepStrictEqual(result.contents, [])
    }))

  it.effect("converts string and Uint8Array resource content", () =>
    Effect.gen(function*() {
      const client = yield* makeRepresentativeClient(protocolVersion)

      const text = yield* client["resources/read"]({ uri: "file:///text" })
      const binary = yield* client["resources/read"]({ uri: "file:///binary" })

      deepStrictEqual(text.contents, [{ uri: "file:///text", text: "text content" }])
      deepStrictEqual(binary.contents, [{ uri: "file:///binary", blob: new Uint8Array([1, 2, 3]) }])
    }))

  it.effect("decodes resource template parameters and rejects invalid values", () =>
    Effect.gen(function*() {
      const client = yield* makeRepresentativeClient(protocolVersion)

      const result = yield* client["resources/read"]({ uri: "file:///items/2" })
      const error = yield* Effect.flip(client["resources/read"]({ uri: "file:///items/not-a-number" }))

      deepStrictEqual(result.contents, [{ uri: "file:///items/2", text: "file:///items/2:2" }])
      strictEqual(error instanceof McpSchema.InvalidParams, true)
    }))

  it.effect("returns an empty result for an unknown completion", () =>
    Effect.gen(function*() {
      const client = yield* makeRepresentativeClient(protocolVersion)

      const result = yield* client["completion/complete"]({
        ref: { type: "ref/prompt", name: "unknown" },
        argument: { name: "value", value: "" }
      })

      deepStrictEqual(result.completion, { values: [], total: 0, hasMore: false })
    }))

  it.effect("truncates resource and prompt completions to 100 values", () =>
    Effect.gen(function*() {
      const client = yield* makeRepresentativeClient(protocolVersion)

      const resource = yield* client["completion/complete"]({
        ref: { type: "ref/resource", uri: "file:///items/{id}" },
        argument: { name: "id", value: "" }
      })
      const prompt = yield* client["completion/complete"]({
        ref: { type: "ref/prompt", name: "count-prompt" },
        argument: { name: "count", value: "" }
      })

      strictEqual(resource.completion.values.length, 100)
      strictEqual(resource.completion.values[0], "0")
      strictEqual(resource.completion.values[99], "99")
      strictEqual(resource.completion.total, 105)
      strictEqual(resource.completion.hasMore, true)
      strictEqual(prompt.completion.values.length, 100)
      strictEqual(prompt.completion.values[0], "0")
      strictEqual(prompt.completion.values[99], "99")
      strictEqual(prompt.completion.total, 105)
      strictEqual(prompt.completion.hasMore, true)
    }))

  it.effect("filters registered entries using the initialize payload", () =>
    Effect.gen(function*() {
      const disabled = yield* makeRepresentativeClient(protocolVersion)
      const enabled = yield* makeRepresentativeClient(protocolVersion, "EnabledClient")

      const disabledTools = yield* disabled["tools/list"]({})
      const enabledTools = yield* enabled["tools/list"]({})
      const disabledResources = yield* disabled["resources/list"]({})
      const enabledResources = yield* enabled["resources/list"]({})
      const disabledTemplates = yield* disabled["resources/templates/list"]({})
      const enabledTemplates = yield* enabled["resources/templates/list"]({})
      const disabledPrompts = yield* disabled["prompts/list"]({})
      const enabledPrompts = yield* enabled["prompts/list"]({})

      strictEqual(disabledTools.tools.some((tool) => tool.name === "enabled-tool"), false)
      strictEqual(enabledTools.tools.some((tool) => tool.name === "enabled-tool"), true)
      strictEqual(disabledResources.resources.some((resource) => resource.name === "enabled-resource"), false)
      strictEqual(enabledResources.resources.some((resource) => resource.name === "enabled-resource"), true)
      strictEqual(
        disabledTemplates.resourceTemplates.some((template) => template.name === "enabled-template"),
        false
      )
      strictEqual(enabledTemplates.resourceTemplates.some((template) => template.name === "enabled-template"), true)
      strictEqual(disabledPrompts.prompts.some((prompt) => prompt.name === "enabled-prompt"), false)
      strictEqual(enabledPrompts.prompts.some((prompt) => prompt.name === "enabled-prompt"), true)
    }))
}

describe("McpServer", () => {
  describe("configuration", () => {
    it("exposes supported protocol versions from latest to oldest", () => {
      strictEqual(McpServer.supportedProtocolVersions.length, 2)
      strictEqual(McpServer.supportedProtocolVersions[0], "2025-11-25")
      strictEqual(McpServer.supportedProtocolVersions[1], "2025-06-18")
      strictEqual(McpServer.latestProtocolVersion, McpServer.supportedProtocolVersions[0])
    })

    it.effect("uses each server's configured protocol version preference", () =>
      Effect.gen(function*() {
        const preferredLegacy = yield* makeTestClient({
          supportedProtocolVersions: ["2025-06-18", "2025-11-25"]
        })
        const latestOnly = yield* makeTestClient({ supportedProtocolVersions: ["2025-11-25"] })
        const initialize = {
          protocolVersion: "9999-01-01",
          capabilities: {},
          clientInfo: {
            name: "TestClient",
            version: "1.0.0"
          }
        }

        const legacyResult = yield* preferredLegacy.client.initialize(initialize)
        const latestResult = yield* latestOnly.client.initialize(initialize)

        strictEqual(legacyResult.protocolVersion, "2025-06-18")
        strictEqual(latestResult.protocolVersion, "2025-11-25")
      }))

    it.effect("deduplicates configured protocol versions", () =>
      Effect.gen(function*() {
        const { client } = yield* makeTestClient({
          supportedProtocolVersions: ["2025-11-25", "2025-11-25", "2025-06-18"]
        })

        const result = yield* client.initialize({
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: {
            name: "TestClient",
            version: "1.0.0"
          }
        })

        strictEqual(result.protocolVersion, "2025-06-18")
      }))
  })

  describe("2025-06-18", () => {
    protocolVersionSuite("2025-06-18")
  })

  describe("2025-11-25", () => {
    protocolVersionSuite("2025-11-25")

    it.effect("does not advertise HTTP list-change notifications without an SSE stream", () =>
      Effect.gen(function*() {
        const { client } = yield* makeTestClient()

        const result = yield* client.initialize({
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "TestClient", version: "1.0.0" }
        })

        strictEqual(result.capabilities.tools?.listChanged, undefined)
      }))

    it.effect("falls back to the latest protocol version for unsupported offers", () =>
      Effect.gen(function*() {
        const { client, responses } = yield* makeTestClient()

        const result = yield* client.initialize({
          protocolVersion: "9999-01-01",
          capabilities: {},
          clientInfo: {
            name: "TestClient",
            version: "1.0.0"
          }
        })

        yield* client.ping({})

        strictEqual(result.protocolVersion, McpServer.latestProtocolVersion)
        strictEqual(responses.length, 2)
        strictEqual(responses[0].headers.get("Mcp-Protocol-Version"), McpServer.latestProtocolVersion)
      }))

    it.effect("falls back to the latest protocol version for malformed offers", () =>
      Effect.gen(function*() {
        const { client } = yield* makeTestClient()

        const result = yield* client.initialize({
          protocolVersion: "not-a-version",
          capabilities: {},
          clientInfo: {
            name: "TestClient",
            version: "1.0.0"
          }
        })

        strictEqual(result.protocolVersion, McpServer.latestProtocolVersion)
      }))
  })

  describe("shared", () => {
    it.effect("supports interleaved sessions negotiated to different versions", () =>
      Effect.gen(function*() {
        const { createRawSession } = yield* makeTestClient()
        const legacy = createRawSession()
        const latest = createRawSession()

        const legacyInitialize = yield* legacy.initialize("2025-06-18", "LegacyClient")
        const latestInitialize = yield* latest.initialize("2025-11-25", "LatestClient")
        const legacyNotification = yield* legacy.request(initializedNotification, "2025-06-18")
        const latestNotification = yield* latest.request(initializedNotification, "2025-11-25")
        const latestPing = yield* latest.request(pingRequest(1), "2025-11-25")
        const legacyPing = yield* legacy.request(pingRequest(2), "2025-06-18")

        strictEqual(typeof legacy.sessionId, "string")
        strictEqual(typeof latest.sessionId, "string")
        strictEqual(legacy.sessionId === latest.sessionId, false)
        strictEqual(legacyInitialize.headers.get("Mcp-Protocol-Version"), "2025-06-18")
        strictEqual(latestInitialize.headers.get("Mcp-Protocol-Version"), "2025-11-25")
        strictEqual(legacyNotification.status, 202)
        strictEqual(latestNotification.status, 202)
        strictEqual(latestPing.status, 200)
        strictEqual(latestPing.headers.get("Mcp-Protocol-Version"), "2025-11-25")
        strictEqual(legacyPing.status, 200)
        strictEqual(legacyPing.headers.get("Mcp-Protocol-Version"), "2025-06-18")
      }))

    it.effect("isolates session IDs and negotiated versions in both directions", () =>
      Effect.gen(function*() {
        const { createRawSession } = yield* makeTestClient()
        const legacy = createRawSession()
        const latest = createRawSession()
        yield* legacy.initialize("2025-06-18")
        yield* latest.initialize("2025-11-25")

        const legacyAsLatest = yield* legacy.request(pingRequest(1), "2025-11-25")
        const latestAsLegacy = yield* latest.request(pingRequest(2), "2025-06-18")
        const legacyOwnVersion = yield* legacy.request(pingRequest(3), "2025-06-18")
        const latestOwnVersion = yield* latest.request(pingRequest(4), "2025-11-25")

        strictEqual(legacyAsLatest.status, 400)
        strictEqual(latestAsLegacy.status, 400)
        strictEqual(legacyOwnVersion.status, 200)
        strictEqual(legacyOwnVersion.headers.get("Mcp-Protocol-Version"), "2025-06-18")
        strictEqual(latestOwnVersion.status, 200)
        strictEqual(latestOwnVersion.headers.get("Mcp-Protocol-Version"), "2025-11-25")
      }))

    it.effect("allows ping but rejects normal requests before initialization", () =>
      Effect.gen(function*() {
        const { client } = yield* makeTestClient()

        yield* client.ping({})
        const exit = yield* Effect.exit(client["tools/call"]({ name: "session", arguments: {} }))

        strictEqual(exit._tag, "Failure")
      }))

    it.effect("returns 400 when a normal HTTP request omits the session id", () =>
      Effect.gen(function*() {
        const { rawRequest } = yield* makeTestClient()

        const response = yield* rawRequest({
          body: {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name: "session", arguments: {} }
          }
        })

        strictEqual(response.status, 400)
      }))

    it.effect("returns 404 when an HTTP request supplies an unknown session id", () =>
      Effect.gen(function*() {
        const { rawRequest } = yield* makeTestClient()

        const response = yield* rawRequest({
          body: {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name: "session", arguments: {} }
          },
          sessionId: "unknown"
        })

        strictEqual(response.status, 404)
      }))
  })
})
