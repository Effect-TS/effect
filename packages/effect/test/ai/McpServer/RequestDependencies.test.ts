import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpServer from "effect/ai/McpServer"
import * as Tool from "effect/ai/Tool"
import * as Toolkit from "effect/ai/Toolkit"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
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

const WhoAmI = Toolkit.make(Tool.make("WhoAmI", { success: Schema.String, dependencies: [CurrentUser] }))
const WhoAmIHandlers = WhoAmI.toLayer({ WhoAmI: () => Effect.map(CurrentUser, (user) => user) })

describe("McpServer request-level dependencies", () => {
  it.effect("provides declared dependencies from middleware over registration-time values", () =>
    Effect.gen(function*() {
      const Auth = McpServer.middleware<{ provides: CurrentUser }>()((effect) =>
        Effect.provideService(effect, CurrentUser, "request")
      )
      const TestServer = McpServer.toolkit(WhoAmI).pipe(
        Layer.provide(Auth.layer),
        Layer.provide(WhoAmIHandlers),
        Layer.provide(Layer.succeed(CurrentUser, "registration")),
        Layer.provideMerge(McpServer.McpServer.layer)
      )

      const result = yield* McpServer.McpServer.use((server) => server.callTool({ name: "WhoAmI", arguments: {} }))
        .pipe(
          Effect.provideService(McpSchema.McpServerClient, client),
          Effect.provide(TestServer)
        )

      assert.deepStrictEqual(result.content, [{ type: "text", text: JSON.stringify("request") }])
    }))

  it.effect("sends middleware failures as JSON-RPC errors", () =>
    Effect.gen(function*() {
      const Reject = McpServer.middleware<{ provides: CurrentUser }>()(() =>
        Effect.fail(new Unauthorized({ message: "Unauthorized" }))
      )
      const registrations = McpServer.toolkit(WhoAmI).pipe(
        Layer.provide(Reject.layer),
        Layer.provide(WhoAmIHandlers)
      )
      const harness = yield* makeMcpStdioHarness(McpProtocol.v2025_11_25, [McpProtocol.v2025_11_25], registrations)
      yield* harness.initialize()

      const response = yield* harness.sendRequest("tools/call", { name: "WhoAmI", arguments: {} })

      assert.deepStrictEqual(response.error, { code: -32001, message: "Unauthorized" })
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
