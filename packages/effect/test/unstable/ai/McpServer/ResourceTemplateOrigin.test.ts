import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as McpSchema from "effect/unstable/ai/McpSchema"
import * as McpServer from "effect/unstable/ai/McpServer"

const initializePayload = {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "TestClient", version: "1.0.0" }
}
const directClient = McpSchema.McpServerClient.of({
  clientId: 1,
  protocolVersion: "2025-06-18",
  clientCapabilities: {},
  clientInfo: initializePayload.clientInfo,
  initializePayload,
  getClient: Effect.die("not used")
})

const templates = [
  {
    origin: "http://example.test",
    register: McpServer.registerResource`http://example.test/docs/${Schema.String}`,
    registerMultiple: McpServer
      .registerResource`http://example.test/docs/${Schema.String}/pages/${Schema.FiniteFromString}`
  },
  {
    origin: "https://example.test",
    register: McpServer.registerResource`https://example.test/docs/${Schema.String}`,
    registerMultiple: McpServer
      .registerResource`https://example.test/docs/${Schema.String}/pages/${Schema.FiniteFromString}`
  },
  {
    origin: "file://",
    register: McpServer.registerResource`file:///docs/${Schema.String}`,
    registerMultiple: McpServer.registerResource`file:///docs/${Schema.String}/pages/${Schema.FiniteFromString}`
  }
]

describe("resource template origins", () => {
  for (const { origin, register, registerMultiple } of templates) {
    it.effect.each([
      { path: "/docs/alice", decoded: "alice" },
      { path: "/docs/encoded%20space", decoded: "encoded space" },
      { path: "/docs/alice/", decoded: "alice" },
      { path: "/docs//alice", decoded: "alice" }
    ])(`${origin} resolves $path`, ({ path, decoded }) =>
      Effect.gen(function*() {
        const server = yield* McpServer.McpServer.make
        const calls: Array<readonly [string, string]> = []
        yield* register({
          name: "document",
          content: (uri, name) =>
            Effect.sync(() => {
              calls.push([uri, name])
              return name
            })
        }).pipe(Effect.provideService(McpServer.McpServer, server))
        const uri = `${origin}${path}`
        const result = yield* server.findResource(uri).pipe(
          Effect.provideService(McpSchema.McpServerClient, directClient)
        )
        assert.deepStrictEqual(result.contents, [{ uri, text: decoded }])
        assert.deepStrictEqual(calls, [[uri, decoded]])
      }))

    it.effect(`${origin} decodes multiple parameters in order`, () =>
      Effect.gen(function*() {
        const server = yield* McpServer.McpServer.make
        const calls: Array<readonly [string, string, number]> = []
        yield* registerMultiple({
          name: "page",
          content: (uri, name, page) =>
            Effect.sync(() => {
              calls.push([uri, name, page])
              return `${name}:${page}`
            })
        }).pipe(Effect.provideService(McpServer.McpServer, server))
        const uri = `${origin}/docs/encoded%20space/pages/42`
        const result = yield* server.findResource(uri).pipe(
          Effect.provideService(McpSchema.McpServerClient, directClient)
        )
        assert.deepStrictEqual(result.contents, [{ uri, text: "encoded space:42" }])
        assert.deepStrictEqual(calls, [[uri, "encoded space", 42]])
      }))
  }

  for (const { origin, register } of templates.slice(0, 2)) {
    it.effect(`${origin} does not match an unregistered origin`, () =>
      Effect.gen(function*() {
        const server = yield* McpServer.McpServer.make
        let calls = 0
        yield* register({
          name: "document",
          content: () =>
            Effect.sync(() => {
              calls++
              return "wrong origin"
            })
        }).pipe(Effect.provideService(McpServer.McpServer, server))
        const uri = `${origin.replace("example.test", "other.test")}/docs/alice`
        const error = yield* server.findResource(uri).pipe(
          Effect.provideService(McpSchema.McpServerClient, directClient),
          Effect.flip
        )
        assert.instanceOf(error, McpSchema.InvalidParams)
        assert.strictEqual(error.message, `Resource '${uri}' not found`)
        assert.strictEqual(calls, 0)
      }))

    it.effect(`${origin} resolves a concrete resource`, () =>
      Effect.gen(function*() {
        const server = yield* McpServer.McpServer.make
        const uri = `${origin}/static`
        let calls = 0
        yield* McpServer.registerResource({
          uri,
          name: "static",
          content: Effect.sync(() => {
            calls++
            return "static content"
          })
        }).pipe(Effect.provideService(McpServer.McpServer, server))
        const result = yield* server.findResource(uri).pipe(
          Effect.provideService(McpSchema.McpServerClient, directClient)
        )
        assert.deepStrictEqual(result.contents, [{ uri, text: "static content" }])
        assert.strictEqual(calls, 1)
      }))
  }

  it.effect("distinguishes registered hosts and schemes with the same path", () =>
    Effect.gen(function*() {
      const server = yield* McpServer.McpServer.make
      const registrations = [
        ["https://example.test", McpServer.registerResource`https://example.test/docs/${Schema.String}`],
        ["https://other.test", McpServer.registerResource`https://other.test/docs/${Schema.String}`],
        ["http://example.test", McpServer.registerResource`http://example.test/docs/${Schema.String}`]
      ] as const
      const calls: Array<string> = []
      for (const [origin, register] of registrations) {
        yield* register({
          name: origin,
          content: () =>
            Effect.sync(() => {
              calls.push(origin)
              return origin
            })
        }).pipe(Effect.provideService(McpServer.McpServer, server))
      }
      for (const [origin] of registrations) {
        const uri = `${origin}/docs/alice`
        const result = yield* server.findResource(uri).pipe(
          Effect.provideService(McpSchema.McpServerClient, directClient)
        )
        assert.deepStrictEqual(result.contents, [{ uri, text: origin }])
      }
      assert.deepStrictEqual(calls, registrations.map(([origin]) => origin))
    }))
})
