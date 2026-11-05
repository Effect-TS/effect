import type * as McpAppView from "effect/ai/McpAppView"
import type * as McpClientError from "effect/ai/McpClientError"
import * as Tool from "effect/ai/Tool"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"
import { describe, expect, it } from "tstyche"

const Report = Tool.make("Report", {
  parameters: Schema.Struct({ runId: Schema.String }),
  success: Schema.Struct({ passed: Schema.Number })
})

class MagicNumber extends Context.Service<MagicNumber, number>()("MagicNumber") {}

// Decoding needs `MagicNumber`; encoding needs nothing.
const Scaled = Schema.Number.pipe(Schema.decode({
  decode: SchemaGetter.transformEffect((n: number) => Effect.map(MagicNumber, (magic) => n * magic)),
  encode: SchemaGetter.passthrough()
}))

const Scale = Tool.make("Scale", {
  parameters: Schema.Struct({ factor: Scaled }),
  success: Schema.Struct({ value: Scaled })
})

declare const view: McpAppView.McpAppView["Service"]

describe("McpAppView", () => {
  it("types the host-delivered call and server calls from the tool's schemas", () => {
    // Schema mismatches are defects, so no `SchemaError` appears in the errors.
    expect(view.toolCall(Report).input).type.toBe<Effect.Effect<{ readonly runId: string }, never, never>>()
    expect(view.toolCall(Report).result).type.toBe<
      Effect.Effect<{ readonly passed: number }, McpAppView.ToolCancelled | McpClientError.ToolError, never>
    >()
    expect(view.callTool(Report, { runId: "ok" })).type.toBe<
      Effect.Effect<
        { readonly passed: number },
        McpClientError.ToolError | McpAppView.HostError | McpAppView.UnsupportedCapability,
        never
      >
    >()
    expect(view.callTool).type.not.toBeCallableWith(Report, { runId: 1 })
  })

  it("keeps the services the tool's schemas need", () => {
    expect(view.toolCall(Scale).input).type.toBe<Effect.Effect<{ readonly factor: number }, never, MagicNumber>>()
    expect(view.toolCall(Scale).result).type.toBe<
      Effect.Effect<{ readonly value: number }, McpAppView.ToolCancelled | McpClientError.ToolError, MagicNumber>
    >()
    expect(view.callTool(Scale, { factor: 2 })).type.toBe<
      Effect.Effect<
        { readonly value: number },
        McpClientError.ToolError | McpAppView.HostError | McpAppView.UnsupportedCapability,
        MagicNumber
      >
    >()
  })
})
