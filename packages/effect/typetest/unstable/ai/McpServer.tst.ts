import type * as Cause from "effect/Cause"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { McpProtocol, McpSchema, McpServer } from "effect/unstable/ai"
import * as McpProtocolInternal from "effect/unstable/ai/internal/mcpProtocol"
import * as Rpc from "effect/unstable/rpc/Rpc"
import * as RpcGroup from "effect/unstable/rpc/RpcGroup"
import { describe, expect, it } from "tstyche"

const serverOptions = {
  name: "TestServer",
  version: "1.0.0",
  protocols: [McpProtocol.v2025_06_18]
} as const

describe("McpServer", () => {
  describe("protocol configuration", () => {
    it("should accept a non-empty protocol declaration when constructing any server", () => {
      expect(McpServer.run).type.toBeCallableWith(serverOptions)
      expect(McpServer.layer).type.toBeCallableWith(serverOptions)
      expect(McpServer.layerStdio).type.toBeCallableWith(serverOptions)
      expect(McpServer.layerHttp).type.toBeCallableWith({
        ...serverOptions,
        path: "/mcp"
      })
    })

    it("should require a protocol declaration when constructing a server", () => {
      expect(McpServer.layer).type.not.toBeCallableWith({
        name: "TestServer",
        version: "1.0.0"
      })
    })

    it("should reject an empty protocol declaration when constructing a server", () => {
      expect(McpServer.layer).type.not.toBeCallableWith({
        name: "TestServer",
        version: "1.0.0",
        protocols: [] as const
      })
    })

    it("should reject version strings when protocol adapter values are required", () => {
      expect(McpServer.layer).type.not.toBeCallableWith({
        name: "TestServer",
        version: "1.0.0",
        protocols: ["2025-06-18"] as const
      })
    })

    it("should require client notification RPCs to be included in the complete client RPC group", () => {
      const Request = Rpc.make("request", {
        payload: Schema.Struct({}),
        success: Schema.Struct({})
      })
      const Notification = Rpc.make("notification", {
        payload: Schema.Struct({}),
        success: Schema.Struct({})
      })

      expect(McpProtocolInternal.make).type.not.toBeCallableWith({
        protocolVersion: "test",
        clientRpcs: RpcGroup.make(Request),
        clientNotificationRpcs: RpcGroup.make(Notification),
        serverRequestRpcs: RpcGroup.make(),
        serverNotificationRpcs: RpcGroup.make()
      })
    })

    it("should expose only June and newer adapters when using the phase one built-ins", () => {
      expect<keyof typeof McpProtocol>().type.toBe<"v2025_06_18">()
    })

    it("should expose invalid protocol declarations as typed constructor failures", () => {
      const run = McpServer.run(serverOptions)
      const layer = McpServer.layer(serverOptions)

      expect<Effect.Error<typeof run>>().type.toBe<Cause.IllegalArgumentError>()
      expect<Layer.Error<typeof layer>>().type.toBe<Cause.IllegalArgumentError>()
    })
  })

  describe("request context", () => {
    it("should expose the selected protocol version when a handler reads its client", () => {
      expect(McpSchema.McpServerClient.useSync((client) => client.protocolVersion)).type.toBe<
        Effect.Effect<McpProtocol.ProtocolVersion, never, McpSchema.McpServerClient>
      >()
    })
  })
})
