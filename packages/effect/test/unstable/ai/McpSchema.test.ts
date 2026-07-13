import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Schema } from "effect"
import * as McpSchema from "effect/unstable/ai/McpSchema"

const decode = <S extends Schema.Top>(schema: S, input: unknown) => Schema.decodeUnknownEffect(schema)(input)

const assertRejected = <S extends Schema.Top>(schema: S, input: unknown) =>
  Effect.gen(function*() {
    assert.isTrue(Exit.isFailure(yield* Effect.exit(decode(schema, input))))
  })

const InitializeResult20250618 = Schema.Struct({
  protocolVersion: Schema.Literal("2025-06-18"),
  capabilities: Schema.Struct({
    completions: Schema.optionalKey(Schema.Struct({}))
  }),
  serverInfo: Schema.Struct({
    name: Schema.String,
    title: Schema.optionalKey(Schema.String),
    version: Schema.String
  }),
  instructions: Schema.optionalKey(Schema.String),
  _meta: Schema.optionalKey(Schema.Record(Schema.String, Schema.Json))
})

describe("McpSchema", () => {
  describe("2025-11-25", () => {
    it.effect("decodes initialization metadata and capabilities", () =>
      Effect.gen(function*() {
        const value = yield* decode(McpSchema.Initialize.payloadSchema, {
          protocolVersion: "2025-11-25",
          _meta: { progressToken: "init", "io.example/trace": { id: 1 } },
          capabilities: {
            sampling: { context: {}, tools: {} },
            elicitation: { form: {}, url: {} },
            "io.example/capability": { enabled: true }
          },
          clientInfo: {
            name: "client",
            version: "1",
            description: "Example client",
            websiteUrl: "https://example.com",
            icons: [{ src: "https://example.com/icon.svg", mimeType: "image/svg+xml", theme: "light" }]
          }
        })
        assert.deepStrictEqual(value._meta?.["io.example/trace"], { id: 1 })
        assert.deepStrictEqual(value.capabilities.sampling?.tools, {})
      }))

    it.effect("normalizes omitted tool arguments and constrains structured content", () =>
      Effect.gen(function*() {
        const call = yield* decode(McpSchema.CallTool.payloadSchema, { name: "status" })
        assert.deepStrictEqual(call.arguments, {})
        yield* decode(McpSchema.CallToolResult, { content: [], structuredContent: { status: "ok" } })
        yield* assertRejected(McpSchema.CallToolResult, { content: [], structuredContent: [] })
        yield* assertRejected(McpSchema.CallToolResult, { content: [], structuredContent: null })
      }))

    it.effect("requires progress and enforces completion limits", () =>
      Effect.gen(function*() {
        yield* assertRejected(McpSchema.ProgressNotification.payloadSchema, { progressToken: 1 })
        yield* decode(McpSchema.ProgressNotification.payloadSchema, { progressToken: 1, progress: 0 })
        yield* decode(McpSchema.CompleteResult, {
          _meta: { trace: true },
          completion: { values: Array.from({ length: 100 }, (_, index) => String(index)), total: 100 }
        })
        yield* assertRejected(McpSchema.CompleteResult, {
          completion: { values: Array.from({ length: 101 }, (_, index) => String(index)) }
        })
        yield* assertRejected(McpSchema.CompleteResult, { completion: { values: [], total: 0.5 } })
      }))

    it.effect("accepts corrected sampling requests and results", () =>
      Effect.gen(function*() {
        yield* decode(McpSchema.CreateMessage.payloadSchema, {
          messages: [{ role: "user", content: { type: "text", text: "Hello", _meta: { source: "test" } } }],
          maxTokens: 32
        })
        yield* decode(McpSchema.CreateMessageResult, {
          role: "assistant",
          content: [{ type: "text", text: "Hello" }, { type: "text", text: "there" }],
          model: "example-model",
          _meta: { trace: true },
          "io.example/result": { retained: true }
        })
      }))

    it.effect("constrains form elicitation schemas and accepted content", () =>
      Effect.gen(function*() {
        const value = yield* decode(McpSchema.Elicit.payloadSchema, {
          message: "Profile",
          requestedSchema: {
            $schema: "https://json-schema.org/draft/2020-12/schema",
            type: "object",
            properties: {
              name: { type: "string", minLength: 1 },
              age: { type: "integer", minimum: 0 },
              enabled: { type: "boolean" },
              color: { type: "string", enum: ["red", "blue"] },
              legacyColor: { type: "string", enum: ["red"], enumNames: ["Red"] },
              titledColor: {
                type: "string",
                oneOf: [{ const: "red", title: "Red" }]
              },
              tags: { type: "array", items: { type: "string", enum: ["effect"] } },
              titledTags: {
                type: "array",
                items: { anyOf: [{ const: "effect", title: "Effect" }] }
              }
            },
            required: ["name"]
          }
        })
        assert.deepStrictEqual(value.requestedSchema.properties.titledColor, {
          type: "string",
          oneOf: [{ const: "red", title: "Red" }]
        })
        assert.deepStrictEqual(value.requestedSchema.properties.titledTags, {
          type: "array",
          items: { anyOf: [{ const: "effect", title: "Effect" }] }
        })
        yield* assertRejected(McpSchema.Elicit.payloadSchema, {
          message: "Nested",
          requestedSchema: {
            type: "object",
            properties: { nested: { type: "object", properties: {} } }
          }
        })
        yield* decode(McpSchema.ElicitResult, {
          action: "accept",
          content: { name: "Ada", age: 42, enabled: true, tags: ["effect"] }
        })
        yield* assertRejected(McpSchema.ElicitResult, { action: "accept", content: { nested: { value: true } } })
      }))

    it.effect("decodes root metadata and accepts result extensions", () =>
      Effect.gen(function*() {
        const result = yield* decode(McpSchema.ListRootsResult, {
          roots: [{ uri: "file:///workspace", _meta: { source: "client" } }],
          "io.example/result": true
        })
        assert.deepStrictEqual(result.roots[0]?._meta, { source: "client" })
      }))
  })

  describe("2025-06-18", () => {
    it.effect("decodes the common compatibility surface", () =>
      Effect.gen(function*() {
        const initialize = yield* decode(McpSchema.InitializeResult, {
          protocolVersion: "2025-06-18",
          capabilities: { completions: {} },
          serverInfo: { name: "server", version: "1.0.0" }
        })
        assert.strictEqual(initialize.protocolVersion, "2025-06-18")
        assert.deepStrictEqual(initialize.serverInfo, { name: "server", version: "1.0.0" })
        const emitted = yield* Schema.encodeUnknownEffect(McpSchema.InitializeResult)(initialize)
        yield* decode(InitializeResult20250618, emitted)

        yield* decode(McpSchema.CreateMessageResult, {
          role: "assistant",
          content: { type: "text", text: "compatible" },
          model: "model"
        })
        yield* decode(McpSchema.Elicit.payloadSchema, {
          message: "Choose",
          requestedSchema: {
            type: "object",
            properties: {
              choice: { type: "string", enum: ["a"], enumNames: ["Option A"] }
            }
          }
        })
      }))
  })

  describe("shared", () => {
    it.effect("round trips binary content as base64", () =>
      Effect.gen(function*() {
        const bytes = new Uint8Array([0, 1, 2, 255])
        for (const schema of [McpSchema.ImageContent, McpSchema.AudioContent] as const) {
          const encoded = yield* Schema.encodeUnknownEffect(schema)({
            type: schema === McpSchema.ImageContent ? "image" : "audio",
            data: bytes,
            mimeType: "application/octet-stream"
          })
          assert.strictEqual(encoded.data, "AAEC/w==")
        }
        const encoded = yield* Schema.encodeUnknownEffect(McpSchema.BlobResourceContents)({
          uri: "file:///blob",
          blob: bytes
        })
        assert.strictEqual(encoded.blob, "AAEC/w==")
        const decoded = yield* decode(McpSchema.BlobResourceContents, encoded)
        assert.deepStrictEqual(decoded.blob, bytes)
      }))
  })
})
