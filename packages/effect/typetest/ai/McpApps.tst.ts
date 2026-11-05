import * as McpApps from "effect/ai/McpApps"
import * as Effect from "effect/Effect"
import { describe, expect, it } from "tstyche"

describe("McpApps", () => {
  it("should accept only ui:// URIs for app resources and tool annotations", () => {
    const content = Effect.succeed("<html></html>")
    expect(McpApps.resource).type.toBeCallableWith({ uri: "ui://dashboard/view.html", name: "Dashboard", content })
    expect(McpApps.resource).type.not.toBeCallableWith({ uri: "https://example.com/view.html", name: "View", content })
    expect<McpApps.ToolMeta["resourceUri"]>().type.toBe<`ui://${string}` | undefined>()
  })
})
