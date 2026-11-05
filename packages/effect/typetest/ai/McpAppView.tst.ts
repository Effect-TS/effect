import type * as McpAppView from "effect/ai/McpAppView"
import type * as McpClientError from "effect/ai/McpClientError"
import * as Tool from "effect/ai/Tool"
import type * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "tstyche"

const Report = Tool.make("Report", {
  parameters: Schema.Struct({ runId: Schema.String }),
  success: Schema.Struct({ passed: Schema.Number })
})

declare const view: McpAppView.McpAppView["Service"]

describe("McpAppView", () => {
  it("types the host-delivered call and server calls from the tool's schemas", () => {
    expect(view.toolCall(Report).result).type.toBeAssignableTo<
      Effect.Effect<{ readonly passed: number }, McpAppView.ToolCancelled | McpClientError.ToolError, never>
    >()
    expect(view.toolCall(Report).input).type.toBeAssignableTo<
      Effect.Effect<{ readonly runId: string }, Schema.SchemaError, never>
    >()
    expect(view.callTool).type.toBeCallableWith(Report, { runId: "ok" })
    expect(view.callTool).type.not.toBeCallableWith(Report, { runId: 1 })
  })
})
