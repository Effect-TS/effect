import { McpServer } from "effect/unstable/ai"
import { describe, expect, it } from "tstyche"

describe("McpServer", () => {
  it("exposes supported protocol version literals", () => {
    expect(McpServer.supportedProtocolVersions).type.toBe<readonly ["2025-11-25", "2025-06-18"]>()
    expect<McpServer.ProtocolVersion>().type.toBe<"2025-11-25" | "2025-06-18">()
    expect(McpServer.latestProtocolVersion).type.toBe<"2025-11-25">()
  })
})
