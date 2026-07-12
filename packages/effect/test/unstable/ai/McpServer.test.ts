import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import { Context, Effect, Layer } from "effect"
import type * as Arr from "effect/Array"
import * as McpSchema from "effect/unstable/ai/McpSchema"
import * as McpServer from "effect/unstable/ai/McpServer"
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import { RpcSerialization } from "effect/unstable/rpc"
import * as RpcClient from "effect/unstable/rpc/RpcClient"

const makeTestClient = (
  supportedProtocolVersions: Arr.NonEmptyReadonlyArray<McpServer.ProtocolVersion> = McpServer.supportedProtocolVersions
) =>
  Effect.gen(function*() {
    const responses: Array<Response> = []

    const protocolLayer = McpServer.layerHttp({
      name: "TestServer",
      version: "1.0.0",
      path: "/mcp",
      supportedProtocolVersions
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
                  requested: client.initializePayload.protocolVersion,
                  negotiated: client.protocolVersion
                })
              }]
            })
          })
      })
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

    const httpClient = yield* HttpClient.HttpClient.pipe(
      Effect.provide(clientLayer)
    )

    const sendInitialized = () =>
      Effect.promise(() => {
        const headers = new Headers({ "content-type": "application/json" })
        if (sessionId) {
          headers.set("Mcp-Session-Id", sessionId)
        }
        return handler(
          new Request("http://localhost/mcp", {
            method: "POST",
            headers,
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "notifications/initialized",
              params: {}
            })
          })
        )
      })

    return { client, responses, httpClient, sendInitialized }
  })

describe("McpServer", () => {
  it("exposes supported protocol versions from latest to oldest", () => {
    strictEqual(McpServer.supportedProtocolVersions.length, 2)
    strictEqual(McpServer.supportedProtocolVersions[0], "2025-11-25")
    strictEqual(McpServer.supportedProtocolVersions[1], "2025-06-18")
    strictEqual(McpServer.latestProtocolVersion, McpServer.supportedProtocolVersions[0])
  })

  it.effect("echoes supported protocol versions during initialization", () =>
    Effect.gen(function*() {
      for (const protocolVersion of McpServer.supportedProtocolVersions) {
        const { client } = yield* makeTestClient()

        const result = yield* client.initialize({
          protocolVersion,
          capabilities: {},
          clientInfo: {
            name: "TestClient",
            version: "1.0.0"
          }
        })

        strictEqual(result.protocolVersion, protocolVersion)
      }
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

  it.effect("uses each server's configured protocol version preference", () =>
    Effect.gen(function*() {
      const preferredLegacy = yield* makeTestClient(["2025-06-18", "2025-11-25"])
      const latestOnly = yield* makeTestClient(["2025-11-25"])
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
      const { client } = yield* makeTestClient(["2025-11-25", "2025-11-25", "2025-06-18"])

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

  it.effect("rejects reinitializing an existing HTTP session", () =>
    Effect.gen(function*() {
      const { client } = yield* makeTestClient()
      const initialize = {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: {
          name: "TestClient",
          version: "1.0.0"
        }
      }

      yield* client.initialize(initialize)
      const exit = yield* Effect.exit(client.initialize(initialize))

      strictEqual(exit._tag, "Failure")
    }))

  it.effect("preserves the requested version separately from the negotiated version", () =>
    Effect.gen(function*() {
      const { client } = yield* makeTestClient()

      yield* client.initialize({
        protocolVersion: "9999-01-01",
        capabilities: {},
        clientInfo: {
          name: "TestClient",
          version: "1.0.0"
        }
      })
      const result = yield* client["tools/call"]({ name: "session", arguments: {} })

      strictEqual(result.content[0]?.type, "text")
      if (result.content[0]?.type === "text") {
        strictEqual(
          result.content[0].text,
          JSON.stringify({ requested: "9999-01-01", negotiated: McpServer.latestProtocolVersion })
        )
      }
    }))

  it.effect("accepts duplicate initialized notifications", () =>
    Effect.gen(function*() {
      const { client, sendInitialized } = yield* makeTestClient()

      yield* client.initialize({
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: {
          name: "TestClient",
          version: "1.0.0"
        }
      })
      const first = yield* sendInitialized()
      const second = yield* sendInitialized()

      strictEqual(first.ok, true)
      strictEqual(second.ok, true)
    }))

  it.effect("returns 404 when a non-initialize request omits the MCP session id", () =>
    Effect.gen(function*() {
      const { httpClient } = yield* makeTestClient()

      const response = yield* HttpClientRequest.post("http://locahost/mcp").pipe(
        HttpClientRequest.bodyJsonUnsafe({ jsonrpc: "2.0", method: "ping", params: {}, id: 0 }),
        httpClient.execute
      )

      strictEqual(response.status, 404)
    }))
})
