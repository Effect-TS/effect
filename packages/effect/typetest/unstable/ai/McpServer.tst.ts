import type * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import { McpProtocol, McpSchema, McpServer } from "effect/unstable/ai"
import * as McpProtocolInternal from "effect/unstable/ai/internal/mcpProtocol"
import * as Rpc from "effect/unstable/rpc/Rpc"
import * as RpcGroup from "effect/unstable/rpc/RpcGroup"
import { describe, expect, it } from "tstyche"

const serverOptions = {
  name: "TestServer",
  version: "1.0.0",
  protocols: [McpProtocol.v2025_11_25]
} as const

describe("McpServer", () => {
  describe("decoded prompt parameters", () => {
    it("direct string handler receives a decoded string", () => {
      McpServer.registerPrompt({
        name: "greeting",
        parameters: { name: Schema.String },
        content: (params) => {
          expect(params.name).type.toBe<string>()
          expect(params).type.toBe<{ readonly name: string }>()
          return Effect.succeed("hello")
        }
      })
    })

    it("direct transformed handler receives a number, not encoded text", () => {
      McpServer.registerPrompt({
        name: "count",
        parameters: { count: Schema.FiniteFromString },
        content: (params) => {
          expect(params.count).type.toBe<number>()
          expect(params).type.toBe<{ readonly count: number }>()
          return Effect.succeed("count")
        }
      })
    })

    it("direct handler preserves Struct.Type optional and readonly shape", () => {
      const parameters = {
        name: Schema.String,
        suffix: Schema.optional(Schema.String)
      }
      McpServer.registerPrompt({
        name: "optional",
        parameters,
        content: (params) => {
          expect(params).type.toBe<Schema.Struct.Type<typeof parameters>>()
          expect(params).type.toBe<{ readonly name: string; readonly suffix?: string | undefined }>()
          expect(params.suffix).type.toBe<string | undefined>()
          return Effect.succeed("optional")
        }
      })
    })

    it("direct string completion accepts decoded suggestions", () => {
      expect(McpServer.registerPrompt).type.toBeCallableWith({
        name: "string-completion",
        parameters: { name: Schema.String },
        completion: { name: () => Effect.succeed(["Alice"]) },
        content: () => Effect.succeed("hello")
      })
    })

    it("direct transformed completion accepts decoded number suggestions", () => {
      expect(McpServer.registerPrompt).type.toBeCallableWith({
        name: "number-completion",
        parameters: { count: Schema.FiniteFromString },
        completion: { count: () => Effect.succeed([1, 2]) },
        content: () => Effect.succeed("count")
      })
    })

    it("direct no-parameter handler still receives an empty object", () => {
      McpServer.registerPrompt({
        name: "empty",
        content: (params) => {
          expect(params).type.toBe<{}>()
          return Effect.succeed("empty")
        }
      })
    })

    it("direct handler cannot consume schema objects", () => {
      expect(McpServer.registerPrompt).type.not.toBeCallableWith({
        name: "schema-handler",
        parameters: { name: Schema.String },
        content: (_params: { name: Schema.String }) => Effect.succeed("invalid")
      })
    })

    it("direct completion cannot return schema objects", () => {
      expect(McpServer.registerPrompt).type.not.toBeCallableWith({
        name: "schema-completion",
        parameters: { name: Schema.String },
        completion: { name: () => Effect.succeed([Schema.String]) },
        content: () => Effect.succeed("invalid")
      })
    })

    it("direct completion cannot return encoded strings for a number schema", () => {
      expect(McpServer.registerPrompt).type.not.toBeCallableWith({
        name: "encoded-completion",
        parameters: { count: Schema.FiniteFromString },
        completion: { count: () => Effect.succeed(["1"]) },
        content: () => Effect.succeed("invalid")
      })
    })

    it("direct handler cannot consume an unrelated decoded type", () => {
      expect(McpServer.registerPrompt).type.not.toBeCallableWith({
        name: "wrong-handler",
        parameters: { name: Schema.String },
        content: (_params: { name: number }) => Effect.succeed("invalid")
      })
    })

    it("sibling string handler is a positive control", () => {
      McpServer.prompt({
        name: "greeting",
        parameters: { name: Schema.String },
        content: (params) => {
          expect(params.name).type.toBe<string>()
          expect(params).type.toBe<{ readonly name: string }>()
          return Effect.succeed(params.name.toUpperCase())
        }
      })
    })

    it("sibling transformed and optional shape is a positive control", () => {
      const parameters = { count: Schema.FiniteFromString, suffix: Schema.optional(Schema.String) }
      McpServer.prompt({
        name: "count",
        parameters,
        content: (params) => {
          expect(params.count).type.toBe<number>()
          expect(params).type.toBe<Schema.Struct.Type<typeof parameters>>()
          expect(params).type.toBe<{ readonly count: number; readonly suffix?: string | undefined }>()
          return Effect.succeed(params.count.toFixed(0))
        }
      })
    })

    it("sibling string completion is a positive control", () => {
      expect(McpServer.prompt).type.toBeCallableWith({
        name: "string-completion",
        parameters: { name: Schema.String },
        completion: { name: () => Effect.succeed(["Alice"]) },
        content: () => Effect.succeed("hello")
      })
    })

    it("sibling number completion is a positive control", () => {
      expect(McpServer.prompt).type.toBeCallableWith({
        name: "number-completion",
        parameters: { count: Schema.FiniteFromString },
        completion: { count: () => Effect.succeed([1, 2]) },
        content: () => Effect.succeed("count")
      })
    })

    it("sibling handler cannot consume schema objects", () => {
      expect(McpServer.prompt).type.not.toBeCallableWith({
        name: "schema-handler",
        parameters: { name: Schema.String },
        content: (_params: { name: Schema.String }) => Effect.succeed("invalid")
      })
    })

    it("sibling completion cannot return schema objects", () => {
      expect(McpServer.prompt).type.not.toBeCallableWith({
        name: "schema-completion",
        parameters: { name: Schema.String },
        completion: { name: () => Effect.succeed([Schema.String]) },
        content: () => Effect.succeed("invalid")
      })
    })
  })

  describe("protocol configuration", () => {
    it("should accept a non-empty protocol declaration when constructing any server", () => {
      expect(McpServer.run).type.toBeCallableWith(serverOptions)
      expect(McpServer.layer).type.toBeCallableWith(serverOptions)
      expect(McpServer.layerStdio).type.toBeCallableWith(serverOptions)
      expect(McpServer.layerHttp).type.toBeCallableWith({
        ...serverOptions,
        path: "/mcp",
        allowedOrigins: ["https://mcp.example"]
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

    it("should expose every historical protocol adapter", () => {
      expect<keyof typeof McpProtocol>().type.toBe<
        "v2024_11_05" | "v2025_03_26" | "v2025_06_18" | "v2025_11_25"
      >()
      expect<McpProtocol.ProtocolVersion>().type.toBe<
        "2024-11-05" | "2025-03-26" | "2025-06-18" | "2025-11-25"
      >()
    })

    it("should expose each historical protocol through the structural adapter interface", () => {
      expect(McpProtocol.v2024_11_05).type.toBeAssignableTo<McpProtocol.ProtocolAdapter<"2024-11-05">>()
      expect(McpProtocol.v2025_03_26).type.toBeAssignableTo<McpProtocol.ProtocolAdapter<"2025-03-26">>()
      expect(McpProtocol.v2025_06_18).type.toBeAssignableTo<McpProtocol.ProtocolAdapter<"2025-06-18">>()
      expect(McpProtocol.v2025_11_25).type.toBeAssignableTo<McpProtocol.ProtocolAdapter<"2025-11-25">>()

      const protocols: readonly [McpProtocol.ProtocolAdapter, ...Array<McpProtocol.ProtocolAdapter>] = [
        McpProtocol.v2024_11_05,
        McpProtocol.v2025_03_26,
        McpProtocol.v2025_06_18,
        McpProtocol.v2025_11_25
      ]

      expect(protocols[0].protocolVersion).type.toBe<McpProtocol.ProtocolVersion>()
      expect(protocols[0].clientRpcs.requests).type.toBeAssignableTo<ReadonlyMap<string, Rpc.Any>>()
    })

    it("should preserve the decoded tool JSON Schema shape", () => {
      expect<Schema.Schema.Type<typeof McpSchema.ToolJsonSchema>>().type.toBe<McpSchema.ToolJsonSchema>()
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

    it("should expose initialization data and the generated reverse RPC client", () => {
      expect(McpSchema.McpServerClient.useSync((client) => client.initializePayload.capabilities)).type.toBe<
        Effect.Effect<McpSchema.ClientCapabilities, never, McpSchema.McpServerClient>
      >()
      expect(McpSchema.McpServerClient.useSync((client) => client.initializePayload.clientInfo)).type.toBe<
        Effect.Effect<McpSchema.Implementation, never, McpSchema.McpServerClient>
      >()
      expect(McpSchema.McpServerClient.use((client) => client.getClient)).type.toBeAssignableTo<
        Effect.Effect<object, never, McpSchema.McpServerClient | Scope.Scope>
      >()
    })
  })
})
