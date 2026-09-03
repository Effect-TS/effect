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

describe("decoded prompt runtime controls", () => {
  it.effect("direct registration already decodes string and optional arguments", () =>
    Effect.gen(function*() {
      const server = yield* McpServer.McpServer.make
      const calls: Array<unknown> = []
      yield* McpServer.registerPrompt({
        name: "greeting",
        parameters: { name: Schema.String, suffix: Schema.optional(Schema.String) },
        content: (params) =>
          Effect.sync(() => {
            calls.push(params)
            return params.name.toUpperCase()
          })
      }).pipe(Effect.provideService(McpServer.McpServer, server))
      const result = yield* server.getPromptResult({ name: "greeting", arguments: { name: "Alice" } }).pipe(
        Effect.provideService(McpSchema.McpServerClient, directClient)
      )
      assert.deepStrictEqual(calls, [{ name: "Alice" }])
      assert.deepStrictEqual(result.messages, [{ role: "user", content: { type: "text", text: "ALICE" } }])
    }))

  it.effect("direct registration already decodes numbers and encodes completion suggestions", () =>
    Effect.gen(function*() {
      const server = yield* McpServer.McpServer.make
      const calls: Array<unknown> = []
      const completionInputs: Array<string> = []
      yield* McpServer.registerPrompt({
        name: "count",
        parameters: { count: Schema.FiniteFromString },
        content: (params) =>
          Effect.sync(() => {
            calls.push(params)
            return params.count.toFixed(0)
          }),
        completion: {
          count: (input) =>
            Effect.sync(() => {
              completionInputs.push(input)
              return [12, 13]
            })
        }
      }).pipe(Effect.provideService(McpServer.McpServer, server))
      const result = yield* server.getPromptResult({ name: "count", arguments: { count: "12" } }).pipe(
        Effect.provideService(McpSchema.McpServerClient, directClient)
      )
      const completion = yield* server.completion({
        ref: { type: "ref/prompt", name: "count" },
        argument: { name: "count", value: "1" }
      }).pipe(Effect.provideService(McpSchema.McpServerClient, directClient))
      assert.deepStrictEqual(calls, [{ count: 12 }])
      assert.deepStrictEqual(result.messages, [{ role: "user", content: { type: "text", text: "12" } }])
      assert.deepStrictEqual(completionInputs, ["1"])
      assert.deepStrictEqual(completion.completion, { values: ["12", "13"], total: 2, hasMore: false })
    }))
})
