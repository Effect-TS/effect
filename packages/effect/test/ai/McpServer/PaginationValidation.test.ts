import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as Effect from "effect/Effect"
import { layer, McpConformance } from "./McpConformance/McpConformance.ts"

// https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/pagination#error-handling
// https://modelcontextprotocol.io/specification/2025-11-25/server/utilities/pagination#error-handling
describe("MCP single-page pagination", () => {
  for (
    const protocol of [
      McpProtocol.v2024_11_05,
      McpProtocol.v2025_03_26,
      McpProtocol.v2025_06_18,
      McpProtocol.v2025_11_25,
      McpProtocol.v2026_07_28
    ]
  ) {
    it.layer(layer(protocol))(protocol.protocolVersion, (it) => {
      for (const method of ["tools/list", "resources/list", "resources/templates/list", "prompts/list"] as const) {
        for (const cursor of ["unknown", ""]) {
          it.effect(`rejects ${JSON.stringify(cursor)} cursors for ${method} after returning a complete list`, () =>
            Effect.gen(function*() {
              const test = yield* McpConformance
              const initialized = yield* test.initialize({ server: "features" })
              yield* test.notifyInitialized(initialized)
              const first = yield* test.send(initialized, {
                jsonrpc: "2.0",
                id: 2,
                method
              }).pipe(Effect.flatMap(test.decodeResult))
              assert.notProperty(first.result, "nextCursor")

              const response = yield* test.send(initialized, {
                jsonrpc: "2.0",
                id: 3,
                method,
                params: { cursor }
              })
              const error = yield* test.decodeError(response)
              assert.strictEqual(error.error.code, McpSchema.INVALID_PARAMS_ERROR_CODE)
              assert.strictEqual(error.error.message, "Invalid cursor")
            }))
        }
      }
    })
  }
})
