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

    return { client, initialize, operationalRequest, rawRequest, responses }
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

    it.effect("returns 400 for an unsupported protocol version header", () =>
      Effect.gen(function*() {
        const { initialize, operationalRequest } = yield* makeTestClient()
        yield* initialize("2025-11-25")

        const response = yield* operationalRequest({
          body: { jsonrpc: "2.0", id: 1, method: "ping", params: {} },
          protocolVersion: "not-a-version"
        })

        strictEqual(response.status, 400)
      }))

    it.effect("returns 400 when the protocol version differs from the session", () =>
      Effect.gen(function*() {
        const { initialize, operationalRequest } = yield* makeTestClient()
        yield* initialize("2025-11-25")

        const response = yield* operationalRequest({
          body: { jsonrpc: "2.0", id: 1, method: "ping", params: {} },
          protocolVersion: "2025-06-18"
        })

        strictEqual(response.status, 400)
      }))
  })

  describe("shared", () => {
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
