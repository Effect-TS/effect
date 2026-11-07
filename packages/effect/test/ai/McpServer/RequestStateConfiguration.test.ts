import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpServer from "effect/ai/McpServer"
import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Aead from "effect/crypto/Aead"
import * as Effect from "effect/Effect"
import * as HttpRouter from "effect/http/HttpRouter"
import * as Layer from "effect/Layer"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as TestClock from "effect/testing/TestClock"
import { makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"

const protocol = McpProtocol.v2026_07_28
const rawState = "private-configuration-test-state"
const decodeState = Schema.decodeUnknownSync(Schema.Struct({
  result: Schema.Struct({ resultType: Schema.Literal("input_required"), requestState: Schema.String })
}))
const decodeCompleted = Schema.decodeUnknownSync(Schema.Struct({
  result: Schema.Struct({ content: Schema.Array(Schema.Struct({ type: Schema.Literal("text"), text: Schema.String })) })
}))
const decodeError = Schema.decodeUnknownSync(Schema.Struct({
  error: Schema.Struct({ code: Schema.Number, message: Schema.String })
}))

const makeKey = (byte: number) => Aead.key(Aead.xchacha20Poly1305, new Uint8Array(32).fill(byte))

const makeHarness = Effect.fnUntraced(function*(options?: {
  readonly requestState?: McpServer.RequestStateOptions | undefined
  readonly requestScoped?: boolean | undefined
  readonly authenticate?: boolean | undefined
}) {
  const clock = yield* Clock.Clock
  const invocations: Array<string | undefined> = []
  const registrations = Layer.effectDiscard(Effect.gen(function*() {
    const server = yield* McpServer.McpServer
    yield* server.addTool({
      tool: new McpSchema.Tool({ name: "Stateful", inputSchema: { type: "object" } }),
      annotations: Context.empty(),
      handle: () =>
        McpSchema.McpRequestContext.useSync((context) => {
          invocations.push(context.requestState)
          return context.requestState === undefined
            ? new McpSchema.InputRequired({ requestState: rawState })
            : new McpSchema.CallToolResult({ content: [{ type: "text", text: context.requestState }] })
        })
    })
  }))
  const Auth = McpServer.middleware((effect, { headers }) => {
    const token = headers.authorization
    const principal = token === "Bearer alice-1" || token === "Bearer alice-2"
      ? "alice"
      : token === "Bearer bob"
      ? "bob"
      : undefined
    return Effect.provideService(effect, McpServer.RequestStatePrincipal, principal)
  })
  const serverOptions = {
    name: "State",
    version: "1",
    path: "/mcp" as const,
    protocols: [protocol] as const,
    requestState: options?.requestState
  }
  const server = options?.requestScoped
    ? McpServer.layerHttpRequestScoped(serverOptions)
    : McpServer.layerHttp(serverOptions)
  const harness = yield* makeHttpHarness(
    (options?.authenticate ? Layer.merge(registrations, Auth.layerGlobal) : registrations).pipe(
      Layer.provideMerge(server),
      Layer.provideMerge(Layer.succeed(Clock.Clock, clock))
    )
  )
  let id = 0
  const send = Effect.fnUntraced(function*(
    requestState?: string,
    authorization?: string,
    extraMetadata?: Record<string, unknown>
  ) {
    const response = yield* harness.post({
      jsonrpc: "2.0",
      id: ++id,
      method: "tools/call",
      params: {
        name: "Stateful",
        arguments: { account: "483" },
        ...(requestState === undefined ? {} : { requestState }),
        _meta: {
          "io.modelcontextprotocol/protocolVersion": protocol.protocolVersion,
          "io.modelcontextprotocol/clientCapabilities": {},
          ...extraMetadata
        }
      }
    }, {
      "MCP-Protocol-Version": protocol.protocolVersion,
      "Mcp-Method": "tools/call",
      "Mcp-Name": "Stateful",
      ...(authorization === undefined ? {} : { authorization })
    })
    return { status: response.status, message: yield* readMcpHttpResponse(response) }
  })
  return { invocations, send }
})

const assertCompleted = (response: { readonly status: number; readonly message: unknown }) => {
  assert.strictEqual(response.status, 200)
  assert.deepStrictEqual(decodeCompleted(response.message).result.content, [{ type: "text", text: rawState }])
}

const assertRejected = (response: { readonly status: number; readonly message: unknown }) => {
  assert.strictEqual(response.status, 200)
  const error = decodeError(response.message).error
  assert.strictEqual(error.code, -32602)
  assert.notInclude(error.message, rawState)
  return error
}

// https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr#server-requirements-basic-workflow
describe("requestState configuration", () => {
  for (const requestScoped of [false, true]) {
    describe(requestScoped ? "request-scoped HTTP" : "HTTP", () => {
      it.effect("rejects invalid lifetimes and key rings during layer construction", () =>
        Effect.gen(function*() {
          const key = yield* makeKey(1)
          const invalid: Array<unknown> = [
            { ttl: 0 },
            { ttl: -1 },
            { ttl: Infinity },
            { ttl: NaN },
            { ttl: 2 ** 53 },
            { ttl: "not a duration" },
            { keys: [] },
            { keys: [{ id: "", key }] },
            { keys: [{ id: "same", key }, { id: "same", key }] },
            { keys: [{ id: "invalid", key: {} }] }
          ]
          for (const algorithm of [Aead.aes128Gcm, Aead.aes256Gcm, Aead.chacha20Poly1305]) {
            const unsupported = yield* Aead.key(algorithm, new Uint8Array(algorithm.keyLength).fill(2))
            invalid.push(
              { keys: [{ id: "unsupported", key: unsupported }] },
              { keys: [{ id: "current", key }, { id: "unsupported", key: unsupported }] }
            )
          }
          for (const requestState of invalid) {
            const options = {
              name: "InvalidStateConfiguration",
              version: "1",
              path: "/mcp" as const,
              protocols: [protocol] as const,
              requestState: requestState as McpServer.RequestStateOptions
            }
            const layer = requestScoped ? McpServer.layerHttpRequestScoped(options) : McpServer.layerHttp(options)
            const result = yield* layer.pipe(Layer.provide(HttpRouter.layer), Layer.build, Effect.result)
            assert.isTrue(Result.isFailure(result), "Invalid requestState configuration must fail layer construction")
            if (Result.isFailure(result)) {
              assert.strictEqual(result.failure._tag, "IllegalArgumentError")
              assert.match(result.failure.message, /requestState/)
            }
          }
        }))

      it.effect("expires a continuation at the configured deadline", () =>
        Effect.gen(function*() {
          const harness = yield* makeHarness({ requestScoped, requestState: { ttl: "1 second" } })
          const first = yield* harness.send()
          const state = decodeState(first.message).result.requestState
          yield* TestClock.adjust("999 millis")
          assertCompleted(yield* harness.send(state))
          yield* TestClock.adjust("1 millis")
          assertRejected(yield* harness.send(state))
          assert.deepStrictEqual(harness.invocations, [undefined, rawState])
        }))

      it.effect("expires a continuation after the default five minutes", () =>
        Effect.gen(function*() {
          const harness = yield* makeHarness({ requestScoped })
          const first = yield* harness.send()
          const state = decodeState(first.message).result.requestState
          yield* TestClock.adjust("299999 millis")
          assertCompleted(yield* harness.send(state))
          yield* TestClock.adjust("1 millis")
          assertRejected(yield* harness.send(state))
          assert.deepStrictEqual(harness.invocations, [undefined, rawState])
        }))

      it.effect("isolates default keys between server instances", () =>
        Effect.gen(function*() {
          const first = yield* makeHarness({ requestScoped })
          const second = yield* makeHarness({ requestScoped })
          const state = decodeState((yield* first.send()).message).result.requestState
          assertRejected(yield* second.send(state))
          assert.deepStrictEqual(second.invocations, [])
          assertCompleted(yield* first.send(state))
        }))

      it.effect("resumes across server instances sharing an explicit key", () =>
        Effect.gen(function*() {
          const key = yield* makeKey(1)
          const requestState = { keys: [{ id: "shared", key }] as const }
          const first = yield* makeHarness({ requestScoped, requestState })
          const second = yield* makeHarness({ requestScoped, requestState })
          const state = decodeState((yield* first.send()).message).result.requestState
          assertCompleted(yield* second.send(state))
          assert.deepStrictEqual(second.invocations, [rawState])
        }))

      it.effect("rejects non-extractable AES-GCM keys in any key ring position", () =>
        Effect.gen(function*() {
          const cryptoKey = yield* Effect.promise(() =>
            globalThis.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"])
          )
          const key = yield* Aead.fromCryptoKey(Aead.aes256Gcm, cryptoKey)
          const current = yield* makeKey(1)
          for (
            const keys of [
              [{ id: "aes", key }],
              [{ id: "current", key: current }, { id: "aes", key }]
            ] as const
          ) {
            const options = {
              name: "UnsupportedStateKey",
              version: "1",
              path: "/mcp" as const,
              protocols: [protocol] as const,
              requestState: { keys }
            }
            const layer = requestScoped ? McpServer.layerHttpRequestScoped(options) : McpServer.layerHttp(options)
            const result = yield* layer.pipe(Layer.provide(HttpRouter.layer), Layer.build, Effect.result)
            assert.isTrue(Result.isFailure(result), "AES-GCM state keys must fail layer construction")
            if (Result.isFailure(result)) {
              assert.strictEqual(result.failure._tag, "IllegalArgumentError")
              assert.match(result.failure.message, /requestState/)
            }
          }
        }))

      it.effect("verifies retained rotation keys and issues states with the first key", () =>
        Effect.gen(function*() {
          const old = { id: "old", key: yield* makeKey(1) }
          const current = { id: "current", key: yield* makeKey(2) }
          const issuer = yield* makeHarness({ requestScoped, requestState: { keys: [old] } })
          const rotated = yield* makeHarness({ requestScoped, requestState: { keys: [current, old] } })
          const newOnly = yield* makeHarness({ requestScoped, requestState: { keys: [current] } })
          const oldState = decodeState((yield* issuer.send()).message).result.requestState
          assertCompleted(yield* rotated.send(oldState))
          assertRejected(yield* newOnly.send(oldState))
          const newState = decodeState((yield* rotated.send()).message).result.requestState
          assertCompleted(yield* newOnly.send(newState))
          assertRejected(yield* issuer.send(newState))
          assert.deepStrictEqual(issuer.invocations, [undefined])
          assert.deepStrictEqual(newOnly.invocations, [rawState])
        }))

      it.effect("rejects a matching key id backed by different key material", () =>
        Effect.gen(function*() {
          const first = yield* makeHarness({
            requestScoped,
            requestState: { keys: [{ id: "shared", key: yield* makeKey(1) }] }
          })
          const second = yield* makeHarness({
            requestScoped,
            requestState: { keys: [{ id: "shared", key: yield* makeKey(2) }] }
          })
          const state = decodeState((yield* first.send()).message).result.requestState
          const wrongKey = assertRejected(yield* second.send(state))
          const malformed = assertRejected(yield* second.send("not-a-state"))
          assert.deepStrictEqual(wrongKey, malformed)
          assert.deepStrictEqual(second.invocations, [])
        }))

      it.effect("binds state to the principal supplied inside authorization middleware", () =>
        Effect.gen(function*() {
          const harness = yield* makeHarness({ requestScoped, authenticate: true })
          const state = decodeState((yield* harness.send(undefined, "Bearer alice-1")).message).result.requestState
          assertRejected(yield* harness.send(state, "Bearer bob", { "example.com/principal": "alice" }))
          assertRejected(yield* harness.send(state))
          assert.deepStrictEqual(harness.invocations, [undefined])
          assertCompleted(yield* harness.send(state, "Bearer alice-2"))
          assert.deepStrictEqual(harness.invocations, [undefined, rawState])
        }))

      it.effect("binds state to the authorization header when no principal is provided", () =>
        Effect.gen(function*() {
          const harness = yield* makeHarness({ requestScoped })
          const state = decodeState((yield* harness.send(undefined, "Bearer alice-1")).message).result.requestState
          assertCompleted(yield* harness.send(state, "Bearer alice-1"))
          assertRejected(yield* harness.send(state, "Bearer bob"))
          assertRejected(yield* harness.send(state))
          assert.deepStrictEqual(harness.invocations, [undefined, rawState])
        }))
    })
  }
})
