import type * as Effect from "effect/Effect"
import { McpSchema, McpServer } from "effect/unstable/ai"
import { describe, expect, it } from "tstyche"

describe("McpServer", () => {
  describe("configuration", () => {
    it("exposes the exact supported protocol versions", () => {
      expect(McpServer.supportedProtocolVersions).type.toBe<readonly ["2025-11-25", "2025-06-18"]>()
      expect<McpServer.ProtocolVersion>().type.toBe<"2025-11-25" | "2025-06-18">()
    })

    it("accepts the same server options across constructors", () => {
      const options = {
        name: "TestServer",
        version: "1.0.0",
        supportedProtocolVersions: [
          McpServer.supportedProtocolVersions[1],
          McpServer.supportedProtocolVersions[0]
        ] as const
      }

      expect(McpServer.run).type.toBeCallableWith(options)
      expect(McpServer.layer).type.toBeCallableWith(options)
      expect(McpServer.layerStdio).type.toBeCallableWith(options)
      expect(McpServer.layerHttp).type.toBeCallableWith({ ...options, path: "/mcp" })
    })

    it("accepts singleton custom configurations", () => {
      expect(McpServer.layer).type.toBeCallableWith({
        name: "TestServer",
        version: "1.0.0",
        supportedProtocolVersions: [McpServer.supportedProtocolVersions[1]] as const
      })
    })

    it("rejects empty and unknown protocol version arrays", () => {
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

  describe("2025-06-18", () => {
    it("is a supported protocol version", () => {
      expect<"2025-06-18">().type.toBeAssignableTo<McpServer.ProtocolVersion>()
    })
  })

  describe("2025-11-25", () => {
    it("is the latest supported protocol version", () => {
      expect<"2025-11-25">().type.toBeAssignableTo<McpServer.ProtocolVersion>()
      expect(McpServer.latestProtocolVersion).type.toBe<"2025-11-25">()
    })
  })

  describe("shared", () => {
    it("keeps initialize request protocol versions open to future literals", () => {
      type InitializeProtocolVersion = typeof McpSchema.Initialize.payloadSchema.Type["protocolVersion"]

      expect<InitializeProtocolVersion>().type.toBe<string>()
      expect<"2099-01-01">().type.toBeAssignableTo<InitializeProtocolVersion>()
    })

    it("exposes the negotiated protocol version to handlers", () => {
      expect(McpSchema.McpServerClient.useSync((client) => client.protocolVersion)).type.toBe<
        Effect.Effect<"2025-11-25" | "2025-06-18", never, McpSchema.McpServerClient>
      >()
    })
  })
})
