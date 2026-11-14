import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpServer from "effect/ai/McpServer"
import * as Tool from "effect/ai/Tool"
import * as Toolkit from "effect/ai/Toolkit"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { getGc } from "../../utils/gc.ts"
import { makeMcpStdioHarness } from "./TestUtils/McpStdioHarness.ts"

class CurrentUser extends Context.Service<CurrentUser, string>()("test/CurrentUser") {}

// Toolkits generated from API documents have thousands of tools, all registered from one context.
const count = 2_000
const tools = Array.from(
  { length: count },
  (_, i) => Tool.make(`op_${i}`, { success: Schema.String, dependencies: [CurrentUser] })
)
const Large = Toolkit.make(...tools)
const handlers = Object.fromEntries(
  tools.map((tool) => [tool.name, () => Effect.map(CurrentUser, (user) => `${tool.name} as ${user}`)])
)

const Auth = McpServer.middleware<{ provides: CurrentUser }>()((effect) =>
  Effect.provideService(effect, CurrentUser, "alice")
)
const layer = McpServer.toolkit(Large).pipe(
  Layer.provide(Auth.layer),
  Layer.provide(Large.toLayer(handlers as never))
)
const makeHarness = Effect.gen(function*() {
  const harness = yield* makeMcpStdioHarness(McpProtocol.v2025_11_25, [McpProtocol.v2025_11_25], layer)
  yield* harness.initialize()
  return harness
})

describe("McpServer with a large toolkit", () => {
  it.effect("serves every tool of the toolkit with the toolkit's middleware", () =>
    Effect.gen(function*() {
      const harness = yield* makeHarness
      const listed = yield* harness.sendRequest("tools/list")
      assert.strictEqual((listed.result as { readonly tools: ReadonlyArray<unknown> }).tools.length, count)
      const last = yield* harness.sendRequest("tools/call", { name: `op_${count - 1}`, arguments: {} })
      assert.deepStrictEqual((last.result as { readonly content: unknown }).content, [{
        type: "text",
        text: `op_${count - 1} as alice`
      }])
    }), { timeout: 30_000 })

  it.effect.skipIf(process.versions.bun !== undefined || process.versions.deno !== undefined)(
    "shares one registration context across the toolkit's tools",
    () =>
      Effect.gen(function*() {
        const gc = yield* Effect.promise(getGc)
        const heapMB = () => {
          gc()
          gc()
          return process.memoryUsage().heapUsed / 1048576
        }
        const before = heapMB()
        yield* makeHarness
        // Copying the toolkit's context once per tool would hold about `count` copies of a
        // `count`-entry context: over 100 MB here, against a few MB shared.
        const grown = heapMB() - before
        assert.isBelow(grown, 60, `building the server grew the heap by ${Math.round(grown)} MB`)
      }),
    { timeout: 30_000 }
  )
})
