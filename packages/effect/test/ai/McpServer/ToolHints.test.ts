import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import type * as McpSchema from "effect/ai/McpSchema"
import * as McpServer from "effect/ai/McpServer"
import * as Tool from "effect/ai/Tool"
import * as Toolkit from "effect/ai/Toolkit"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { makeMcpStdioHarness } from "./TestUtils/McpStdioHarness.ts"

const Tools = Toolkit.make(
  Tool.make("Read", { success: Schema.String }).annotate(Tool.Readonly, true),
  Tool.make("ReadAndDelete", { success: Schema.String }).annotate(Tool.Readonly, true).annotate(
    Tool.Destructive,
    true
  ),
  Tool.make("Write", { success: Schema.String }),
  Tool.make("SafeWrite", { success: Schema.String }).annotate(Tool.Destructive, false)
)

const layer = McpServer.toolkit(Tools).pipe(Layer.provide(Tools.toLayer({
  Read: () => Effect.succeed("read"),
  ReadAndDelete: () => Effect.succeed("read"),
  Write: () => Effect.succeed("written"),
  SafeWrite: () => Effect.succeed("written")
})))

describe("McpServer toolkit hints", () => {
  it.effect("lists read-only tools as not destructive unless they say so", () =>
    Effect.gen(function*() {
      const harness = yield* makeMcpStdioHarness(McpProtocol.v2025_11_25, [McpProtocol.v2025_11_25], layer)
      yield* harness.initialize()
      const listed = yield* harness.sendRequest("tools/list")
      const hints = Object.fromEntries(
        (listed.result as { readonly tools: ReadonlyArray<McpSchema.Tool> }).tools.map((tool) => [
          tool.name,
          [tool.annotations?.readOnlyHint, tool.annotations?.destructiveHint]
        ])
      )
      assert.deepStrictEqual(hints, {
        Read: [true, false],
        ReadAndDelete: [true, true],
        Write: [false, true],
        SafeWrite: [false, false]
      })
    }))
})
