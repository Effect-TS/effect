import { McpServer } from "effect/unstable/ai"
import { describe, expect, it } from "tstyche"

describe("McpServer", () => {
  it("exposes supported protocol version literals", () => {
    expect(McpServer.supportedProtocolVersions).type.toBe<readonly ["2025-11-25", "2025-06-18"]>()
    expect<McpServer.ProtocolVersion>().type.toBe<"2025-11-25" | "2025-06-18">()
    expect(McpServer.latestProtocolVersion).type.toBe<"2025-11-25">()
  })

  it("requires a non-empty list of known protocol versions", () => {
    expect(McpServer.layer).type.toBeCallableWith({
      name: "TestServer",
      version: "1.0.0",
      supportedProtocolVersions: ["2025-06-18", "2025-11-25"] as const
    })
    expect(McpServer.layer).type.not.toBeCallableWith({
      name: "TestServer",
      version: "1.0.0",
      supportedProtocolVersions: [] as const
    })
    expect(McpServer.layer).type.not.toBeCallableWith({
      name: "TestServer",
      version: "1.0.0",
      supportedProtocolVersions: ["2025-03-26"] as const
    })
  })
})
