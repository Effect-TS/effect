import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpServer from "effect/ai/McpServer"
import * as Tool from "effect/ai/Tool"
import * as Toolkit from "effect/ai/Toolkit"
import type * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as ErrorReporter from "effect/ErrorReporter"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as References from "effect/References"
import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"
import * as Scope from "effect/Scope"
import * as Sink from "effect/Sink"
import * as Stdio from "effect/Stdio"
import * as Stream from "effect/Stream"
import { makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"
import type { JsonRpcMessage } from "./TestUtils/McpStdioHarness.ts"
import { makeMcpStdioHarness } from "./TestUtils/McpStdioHarness.ts"

class CurrentUser extends Context.Service<CurrentUser, string>()("test/CurrentUser") {}

class Unauthorized extends Schema.Error<Unauthorized>("test/Unauthorized")({
  ...McpSchema.McpErrorBase.fields,
  _tag: Schema.tag("Unauthorized"),
  code: Schema.tag(-32001)
}) {}

const client = McpSchema.McpServerClient.of({
  clientId: 1,
  protocolVersion: "2025-06-18",
  clientCapabilities: {},
  clientInfo: { name: "client", version: "1" },
  initializePayload: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "client", version: "1" }
  },
  getClient: Effect.die("not used")
})

const request = (id: number, method: string, params: unknown) => ({ jsonrpc: "2.0", id, method, params })

const initialize = [
  request(0, "initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "client", version: "1" }
  }),
  { jsonrpc: "2.0", method: "notifications/initialized" }
]

// Writes `messages` to stdin before the transport starts, so the first requests race registration.
const serveStdio = Effect.fnUntraced(function*(
  registrations: Layer.Layer<never, never, McpServer.McpServer | McpServer.McpRequest<"Requires", Scope.Scope>>,
  messages: ReadonlyArray<unknown>
) {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const stdin = yield* Queue.unbounded<Uint8Array>()
  const stdout = yield* Queue.unbounded<string | Uint8Array>()
  for (const message of messages) {
    yield* Queue.offer(stdin, encoder.encode(`${JSON.stringify(message)}\n`))
  }
  yield* Layer.launch(McpServer.layerStdio({
    name: "RequestDependencies",
    version: "1.0.0",
    protocols: [McpProtocol.v2025_06_18],
    registrations
  })).pipe(
    Effect.provide(Stdio.layerTest({
      stdin: Stream.fromQueue(stdin),
      stdout: () => Sink.forEach((chunk) => Queue.offer(stdout, chunk))
    })),
    Effect.forkScoped
  )

  let pending = ""
  const received = new Map<unknown, JsonRpcMessage>()
  return Effect.fnUntraced(function*(id: number) {
    while (!received.has(id)) {
      const chunk = yield* Queue.take(stdout)
      pending += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true })
      let newline = pending.indexOf("\n")
      while (newline !== -1) {
        const message: JsonRpcMessage = JSON.parse(pending.slice(0, newline))
        pending = pending.slice(newline + 1)
        received.set(message.id, message)
        newline = pending.indexOf("\n")
      }
    }
    return received.get(id)!
  })
})

describe("McpServer request-level dependencies", () => {
  it.effect("lists registrations passed to the transport on the first request", () =>
    Effect.gen(function*() {
      const release = yield* Deferred.make<void>()
      const Tools = Toolkit.make(Tool.make("Echo"))
      const registrations = McpServer.toolkit(Tools).pipe(
        Layer.provide([Layer.effectDiscard(Deferred.await(release)), Tools.toLayer({ Echo: () => Effect.void })])
      )

      const response = yield* serveStdio(registrations, [...initialize, request(1, "tools/list", {})])
      yield* Effect.yieldNow
      yield* Deferred.succeed(release, undefined)
      const list = yield* response(1)

      assert.deepStrictEqual((list.result as McpSchema.ListToolsResult).tools.map((tool) => tool.name), ["Echo"])
    }))

  it.effect("prefers request values over registration values", () =>
    Effect.gen(function*() {
      class Prefix extends Context.Service<Prefix, string>()("test/Prefix") {}
      class Suffix extends Context.Service<Suffix, string>()("test/Suffix") {}
      const Prefixed = Schema.String.pipe(Schema.decodeTo(Schema.String, {
        decode: SchemaGetter.transformEffect((s: string) => Effect.map(Prefix, (prefix) => `${prefix}${s}`)),
        encode: SchemaGetter.transform((s) => s)
      }))
      const Suffixed = Schema.String.pipe(Schema.decodeTo(Schema.String, {
        decode: SchemaGetter.transformEffect((s: string) => Effect.map(Suffix, (suffix) => `${s}${suffix}`)),
        encode: SchemaGetter.transform((s) => s)
      }))
      // CurrentUser is declared, Prefix is declared and decodes a parameter, Suffix only decodes one.
      const Tools = Toolkit.make(Tool.make("WhoAmI", {
        parameters: Schema.Struct({ tag: Prefixed, note: Suffixed }),
        success: Schema.String,
        dependencies: [CurrentUser, Prefix]
      }))
      const Local = McpServer.middleware<{ provides: CurrentUser | Prefix }>()((effect) =>
        effect.pipe(Effect.provideService(CurrentUser, "local"), Effect.provideService(Prefix, "request:"))
      )
      const Global = McpServer.middleware<{ provides: CurrentUser }>()(
        (effect) => Effect.provideService(effect, CurrentUser, "global"),
        { global: true }
      )
      const registrations = Layer.mergeAll(
        McpServer.toolkit(Tools).pipe(
          Layer.provide(Local.layer),
          Layer.provide(Tools.toLayer({
            WhoAmI: ({ tag, note }) =>
              Effect.gen(function*() {
                return [yield* CurrentUser, tag, yield* Prefix, note].join("|")
              })
          }))
        ),
        McpServer.resource({ uri: "test://user", name: "user", content: Effect.map(CurrentUser, (user) => user) })
      ).pipe(
        Layer.provide([
          Layer.succeed(CurrentUser, "registration"),
          Layer.succeed(Prefix, "registration:"),
          Layer.succeed(Suffix, ":registration")
        ]),
        Layer.provide(Global)
      )

      const response = yield* serveStdio(registrations, [
        ...initialize,
        request(1, "tools/call", { name: "WhoAmI", arguments: { tag: "tag", note: "note" } }),
        request(2, "resources/read", { uri: "test://user" })
      ]).pipe(Effect.provideService(Suffix, ":root"))
      const tool = yield* response(1)
      const resource = yield* response(2)

      assert.deepInclude(tool.result, { content: [{ type: "text", text: "local|request:tag|request:|note:root" }] })
      assert.deepStrictEqual(resource.result, { contents: [{ uri: "test://user", text: "global" }] })
    }))

  it.live("runs handler finalizers when the request ends", () =>
    Effect.gen(function*() {
      const finalized = yield* Deferred.make<void>()
      const Tools = Toolkit.make(Tool.make("Temp", { success: Schema.String, dependencies: [Scope.Scope] }))
      const registrations = McpServer.toolkit(Tools).pipe(
        Layer.provide(Tools.toLayer({
          Temp: () => Effect.as(Effect.addFinalizer(() => Deferred.succeed(finalized, undefined)), "done")
        }))
      )

      const response = yield* serveStdio(registrations, [
        ...initialize,
        request(1, "tools/call", { name: "Temp", arguments: {} })
      ])

      assert.deepInclude((yield* response(1)).result, { content: [{ type: "text", text: "done" }] })
      yield* Deferred.await(finalized).pipe(Effect.timeout("1 second"))
    }))

  it.effect("sends middleware failures as JSON-RPC errors and keeps handler failures as tool results", () =>
    Effect.gen(function*() {
      const Tools = Toolkit.make(
        Tool.make("Guarded"),
        Tool.make("Open", { parameters: Schema.Struct({ text: Schema.String }) })
      )
      const Reject = McpServer.middleware()((effect, { target }) =>
        target === "Open"
          ? effect
          : Effect.fail(new Unauthorized({ message: "Unauthorized", data: { reason: "expired" } }))
      )
      const registrations = Layer.mergeAll(
        McpServer.toolkit(Tools),
        McpServer.resource({ uri: "test://guarded", name: "guarded", content: Effect.succeed("secret") })
      ).pipe(
        Layer.provide(Reject.layer),
        Layer.provide(Tools.toLayer({ Guarded: () => Effect.void, Open: () => Effect.void }))
      )
      const harness = yield* makeMcpStdioHarness(McpProtocol.v2025_11_25, [McpProtocol.v2025_11_25], registrations)
      yield* harness.initialize()

      const tool = yield* harness.sendRequest("tools/call", { name: "Guarded", arguments: {} })
      const resource = yield* harness.sendRequest("resources/read", { uri: "test://guarded" })
      const invalidInput = yield* harness.sendRequest("tools/call", { name: "Open", arguments: { text: 1 } })

      const error = { code: -32001, message: "Unauthorized", data: { reason: "expired" } }
      assert.deepStrictEqual(tool.error, error)
      assert.deepStrictEqual(resource.error, error)
      assert.deepInclude(invalidInput.result, { isError: true })
    }))

  it.effect("reports handler defects as internal errors and propagates handler interruption", () =>
    Effect.gen(function*() {
      const reported: Array<Cause.Cause<unknown>> = []
      let mode: "die" | "interrupt" = "die"
      const fail = () => mode === "die" ? Effect.die(new Error("private handler defect")) : Effect.interrupt
      const TestServer = Layer.mergeAll(
        McpServer.resource({ uri: "test://failing", name: "failing", content: Effect.suspend(fail) }),
        McpServer.prompt({ name: "failing", content: fail })
      ).pipe(Layer.provideMerge(McpServer.McpServer.layer))

      const { defects, interruptions } = yield* Effect.gen(function*() {
        const server = yield* McpServer.McpServer
        const requests = [
          server.findResource("test://failing"),
          server.getPromptResult({ name: "failing" })
        ] as const
        const defects = yield* Effect.forEach(
          requests,
          (effect) => Effect.flip(effect as Effect.Effect<unknown, unknown>)
        )
        mode = "interrupt"
        const interruptions = yield* Effect.forEach(requests, (effect) => Effect.exit(effect as Effect.Effect<unknown>))
        return { defects, interruptions }
      }).pipe(
        Effect.provideService(McpSchema.McpServerClient, client),
        Effect.provide(TestServer),
        Effect.provide(ErrorReporter.layer([ErrorReporter.make(({ cause }) => {
          reported.push(cause)
        })]))
      )

      for (const error of defects) {
        assert.instanceOf(error, McpSchema.InternalError)
        assert.strictEqual((error as McpSchema.InternalError).message, "Internal error")
      }
      for (const exit of interruptions) {
        assert.isTrue(Exit.hasInterrupts(exit))
      }
      assert.lengthOf(reported, defects.length)
    }))

  it.effect("falls back to the server log level on stateless requests without one", () =>
    Effect.gen(function*() {
      const registrations = McpServer.resource({
        uri: "test://log-level",
        name: "log-level",
        content: Effect.map(References.CurrentLogLevel, (level) => level)
      }).pipe(Layer.provide(Layer.succeed(References.CurrentLogLevel, "Error")))
      const harness = yield* makeMcpStdioHarness(McpProtocol.v2026_07_28, [McpProtocol.v2026_07_28], registrations)
        .pipe(Effect.provideService(References.CurrentLogLevel, "Debug"))
      yield* harness.initialize()

      const response = yield* harness.sendRequest("resources/read", { uri: "test://log-level" })

      assert.deepInclude(response.result, { contents: [{ uri: "test://log-level", text: "Debug" }] })
    }))

  it.effect("builds request-scoped HTTP registrations once and applies global middleware on every POST", () =>
    Effect.gen(function*() {
      let builds = 0
      let calls = 0
      const Tools = Toolkit.make(Tool.make("Echo"))
      const Count = McpServer.middleware()((effect) => Effect.andThen(Effect.sync(() => calls++), effect), {
        global: true
      })
      const registrations = McpServer.toolkit(Tools).pipe(
        Layer.provide(Count),
        Layer.provide([
          Layer.effectDiscard(Effect.sync(() => builds++)),
          Tools.toLayer({ Echo: () => Effect.void })
        ])
      )
      const harness = yield* makeHttpHarness(McpServer.layerHttpRequestScoped({
        name: "RequestDependencies",
        version: "1.0.0",
        path: "/mcp",
        protocols: [McpProtocol.v2026_07_28],
        registrations
      }))
      const callEcho = (id: number) =>
        harness.post({
          jsonrpc: "2.0",
          id,
          method: "tools/call",
          params: {
            name: "Echo",
            arguments: {},
            _meta: {
              "io.modelcontextprotocol/protocolVersion": "2026-07-28",
              "io.modelcontextprotocol/clientCapabilities": {},
              "io.modelcontextprotocol/clientInfo": { name: "client", version: "1" }
            }
          }
        }, { "MCP-Protocol-Version": "2026-07-28", "Mcp-Method": "tools/call", "Mcp-Name": "Echo" }).pipe(
          Effect.flatMap(readMcpHttpResponse),
          Effect.map((body) => body as JsonRpcMessage)
        )

      const responses = [yield* callEcho(1), yield* callEcho(2)]

      for (const response of responses) {
        assert.deepInclude(response.result, { isError: false })
      }
      assert.strictEqual(builds, 1)
      assert.strictEqual(calls, 2)
    }))

  it.effect("installs only its own middleware globally", () =>
    Effect.gen(function*() {
      const calls: Array<string> = []
      const record = (name: string) => (effect: Effect.Effect<McpServer.MiddlewareSuccess, McpSchema.McpErrorBase>) =>
        Effect.andThen(Effect.sync(() => calls.push(name)), effect)
      const Local = McpServer.middleware()(record("local"))
      const Global = McpServer.middleware()(record("global"), { global: true })
      // Local is provided around the global middleware, but must only run for the registration it is provided to.
      const TestServer = Layer.mergeAll(
        Layer.mergeAll(
          McpServer.resource({ uri: "test://local", name: "local", content: Effect.succeed("local") }),
          Global
        ).pipe(Layer.provide(Local.layer)),
        McpServer.resource({ uri: "test://other", name: "other", content: Effect.succeed("other") })
      ).pipe(Layer.provideMerge(McpServer.McpServer.layer))

      const { localCalls, otherCalls } = yield* Effect.gen(function*() {
        const server = yield* McpServer.McpServer
        yield* server.findResource("test://local")
        const localCalls = calls.splice(0)
        yield* server.findResource("test://other")
        return { localCalls, otherCalls: calls.splice(0) }
      }).pipe(
        Effect.provideService(McpSchema.McpServerClient, client),
        Effect.provide(TestServer)
      )

      assert.deepStrictEqual(localCalls, ["global", "local"])
      assert.deepStrictEqual(otherCalls, ["global"])
    }))
})
