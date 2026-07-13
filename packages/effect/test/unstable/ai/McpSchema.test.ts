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
    it.effect("decodes implementation descriptions, websites, and icons", () =>
      Effect.gen(function*() {
        const value = yield* decode(McpSchema.Initialize.payloadSchema, {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: {
            name: "client",
            version: "1",
            description: "Example client",
            websiteUrl: "https://example.com",
            icons: [{ src: "https://example.com/icon.svg", mimeType: "image/svg+xml", theme: "light" }]
          }
        })
        assert.deepStrictEqual(value.clientInfo, {
          name: "client",
          version: "1",
          description: "Example client",
          websiteUrl: "https://example.com",
          icons: [{ src: "https://example.com/icon.svg", mimeType: "image/svg+xml", theme: "light" }]
        })
      }))

    it.effect("decodes sampling and form elicitation capability subfields", () =>
      Effect.gen(function*() {
        const value = yield* decode(McpSchema.Initialize.payloadSchema, {
          protocolVersion: "2025-11-25",
          capabilities: {
            sampling: { context: {} },
            elicitation: { form: {} },
            "io.example/capability": { enabled: true }
          },
          clientInfo: { name: "client", version: "1" }
        })
        assert.deepStrictEqual(value.capabilities.sampling?.context, {})
        assert.deepStrictEqual(value.capabilities.elicitation?.form, {})
      }))

    it.effect("decodes icons on protocol objects", () =>
      Effect.gen(function*() {
        const icons = [{ src: "https://example.com/icon.svg", sizes: ["16x16"], theme: "dark" as const }]
        const resource = yield* decode(McpSchema.Resource, {
          uri: "file:///resource",
          name: "resource",
          icons
        })
        const template = yield* decode(McpSchema.ResourceTemplate, {
          uriTemplate: "file:///{name}",
          name: "template",
          icons
        })
        const prompt = yield* decode(McpSchema.Prompt, { name: "prompt", icons })
        const tool = yield* decode(McpSchema.Tool, { name: "tool", inputSchema: { type: "object" }, icons })
        assert.deepStrictEqual(resource.icons, icons)
        assert.deepStrictEqual(template.icons, icons)
        assert.deepStrictEqual(prompt.icons, icons)
        assert.deepStrictEqual(tool.icons, icons)
      }))

    it.effect("accepts single sampling content", () =>
      Effect.gen(function*() {
        const message = yield* decode(McpSchema.SamplingMessage, {
          role: "user",
          content: { type: "text", text: "Hello", _meta: { source: "test" } }
        })
        assert.strictEqual(Array.isArray(message.content), false)
      }))

    it.effect("accepts array sampling content", () =>
      Effect.gen(function*() {
        const result = yield* decode(McpSchema.CreateMessageResult, {
          role: "assistant",
          content: [{ type: "text", text: "Hello" }, { type: "text", text: "there" }],
          model: "example-model",
          _meta: { trace: true },
          "io.example/result": { retained: true }
        })
        assert.strictEqual(Array.isArray(result.content), true)
      }))

    it.effect("accepts titled and untitled single- and multi-select elicitation", () =>
      Effect.gen(function*() {
        const value = yield* decode(McpSchema.Elicit.payloadSchema, {
          message: "Choose",
          requestedSchema: {
            type: "object",
            properties: {
              color: { type: "string", enum: ["red", "blue"] },
              titledColor: {
                type: "string",
                oneOf: [{ const: "red", title: "Red" }]
              },
              tags: { type: "array", items: { type: "string", enum: ["effect"] } },
              titledTags: {
                type: "array",
                items: { anyOf: [{ const: "effect", title: "Effect" }] }
              }
            }
          }
        })
        assert.deepStrictEqual(value.requestedSchema.properties.color, {
          type: "string",
          enum: ["red", "blue"]
        })
        assert.deepStrictEqual(value.requestedSchema.properties.titledColor, {
          type: "string",
          oneOf: [{ const: "red", title: "Red" }]
        })
        assert.deepStrictEqual(value.requestedSchema.properties.tags, {
          type: "array",
          items: { type: "string", enum: ["effect"] }
        })
        assert.deepStrictEqual(value.requestedSchema.properties.titledTags, {
          type: "array",
          items: { anyOf: [{ const: "effect", title: "Effect" }] }
        })
      }))

    it.effect("preserves elicitation defaults and explicit form mode", () =>
      Effect.gen(function*() {
        const value = yield* decode(McpSchema.Elicit.payloadSchema, {
          mode: "form",
          message: "Preferences",
          requestedSchema: {
            type: "object",
            properties: {
              name: { type: "string", default: "Ada" },
              count: { type: "integer", default: 1 },
              enabled: { type: "boolean", default: true },
              colors: {
                type: "array",
                items: { type: "string", enum: ["red", "blue"] },
                default: ["red"]
              }
            }
          }
        })
        assert.strictEqual(value.mode, "form")
        assert.strictEqual(value.requestedSchema.properties.name?.default, "Ada")
        assert.strictEqual(value.requestedSchema.properties.count?.default, 1)
        assert.strictEqual(value.requestedSchema.properties.enabled?.default, true)
        assert.deepStrictEqual(value.requestedSchema.properties.colors?.default, ["red"])
      }))

    it.effect("accepts primitive elicitation result content", () =>
      Effect.gen(function*() {
        yield* decode(McpSchema.ElicitResult, {
          action: "accept",
          content: { name: "Ada", age: 42, enabled: true, tags: ["effect"] }
        })
        yield* assertRejected(McpSchema.ElicitResult, { action: "accept", content: { nested: { value: true } } })
      }))

    it.effect("decodes resource links and resource content metadata", () =>
      Effect.gen(function*() {
        const link = yield* decode(McpSchema.ResourceLink, {
          type: "resource_link",
          uri: "file:///guide",
          name: "guide",
          _meta: { source: "tool" }
        })
        const content = yield* decode(McpSchema.TextResourceContents, {
          uri: "file:///guide",
          text: "Guide",
          _meta: { revision: 2 }
        })
        assert.deepStrictEqual(link._meta, { source: "tool" })
        assert.deepStrictEqual(content._meta, { revision: 2 })
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
    it.effect("round trips the initialization compatibility surface", () =>
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
      }))

    it.effect("decodes implementation, resource, prompt, and tool titles", () =>
      Effect.gen(function*() {
        const implementation = yield* decode(McpSchema.Implementation, {
          name: "server",
          title: "Example Server",
          version: "1"
        })
        const resource = yield* decode(McpSchema.Resource, {
          uri: "file:///guide",
          name: "guide",
          title: "Guide"
        })
        const prompt = yield* decode(McpSchema.Prompt, { name: "review", title: "Review" })
        const tool = yield* decode(McpSchema.Tool, {
          name: "search",
          title: "Search",
          inputSchema: { type: "object" }
        })
        assert.strictEqual(implementation.title, "Example Server")
        assert.strictEqual(resource.title, "Guide")
        assert.strictEqual(prompt.title, "Review")
        assert.strictEqual(tool.title, "Search")
      }))

    it.effect("normalizes omitted tool arguments", () =>
      Effect.gen(function*() {
        const call = yield* decode(McpSchema.CallTool.payloadSchema, { name: "status" })
        assert.deepStrictEqual(call.arguments, {})
      }))

    it.effect("requires object-root tool input and output schemas", () =>
      Effect.gen(function*() {
        yield* decode(McpSchema.Tool, {
          name: "status",
          inputSchema: { type: "object", properties: { verbose: { type: "boolean" } } },
          outputSchema: { type: "object", properties: { status: { type: "string" } } }
        })
        yield* assertRejected(McpSchema.Tool, { name: "status", inputSchema: { type: "array" } })
        yield* assertRejected(McpSchema.Tool, {
          name: "status",
          inputSchema: { type: "object" },
          outputSchema: { type: "string" }
        })
      }))

    it.effect("constrains structured tool output to an object", () =>
      Effect.gen(function*() {
        yield* decode(McpSchema.CallToolResult, { content: [], structuredContent: { status: "ok" } })
        yield* assertRejected(McpSchema.CallToolResult, { content: [], structuredContent: [] })
        yield* assertRejected(McpSchema.CallToolResult, { content: [], structuredContent: null })
      }))

    it.effect("defaults and preserves completion context", () =>
      Effect.gen(function*() {
        const omitted = yield* decode(McpSchema.Complete.payloadSchema, {
          ref: { type: "ref/prompt", name: "review" },
          argument: { name: "language", value: "t" }
        })
        const explicit = yield* decode(McpSchema.Complete.payloadSchema, {
          ref: { type: "ref/resource", uri: "file:///{path}" },
          argument: { name: "path", value: "src" },
          context: { arguments: { project: "effect" } }
        })
        assert.deepStrictEqual(omitted.context, { arguments: {} })
        assert.deepStrictEqual(explicit.context, { arguments: { project: "effect" } })
      }))

    it.effect("enforces completion result limits", () =>
      Effect.gen(function*() {
        yield* decode(McpSchema.CompleteResult, {
          _meta: { trace: true },
          completion: { values: Array.from({ length: 100 }, (_, index) => String(index)), total: 100 }
        })
        yield* assertRejected(McpSchema.CompleteResult, {
          completion: { values: Array.from({ length: 101 }, (_, index) => String(index)) }
        })
        yield* assertRejected(McpSchema.CompleteResult, { completion: { values: [], total: 0.5 } })
      }))

    it.effect("accepts legacy enumNames form elicitation", () =>
      Effect.gen(function*() {
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

    it.effect("rejects nested form elicitation schemas", () =>
      assertRejected(McpSchema.Elicit.payloadSchema, {
        message: "Nested",
        requestedSchema: {
          type: "object",
          properties: { nested: { type: "object", properties: {} } }
        }
      }))

    it.effect("requires progress values", () =>
      Effect.gen(function*() {
        yield* assertRejected(McpSchema.ProgressNotification.payloadSchema, { progressToken: 1 })
        yield* decode(McpSchema.ProgressNotification.payloadSchema, { progressToken: 1, progress: 0 })
      }))
  })

  describe("shared", () => {
    it.effect("preserves custom request metadata keys", () =>
      Effect.gen(function*() {
        const value = yield* decode(McpSchema.RequestMeta, {
          _meta: { progressToken: "request", "io.example/trace": { id: 1 } }
        })
        assert.deepStrictEqual(value._meta?.["io.example/trace"], { id: 1 })
      }))

    it.effect("requires integer MCP error codes", () =>
      Effect.gen(function*() {
        const error = yield* decode(McpSchema.McpError, { code: -32001, message: "Custom error" })
        assert.strictEqual(error.code, -32001)
        yield* assertRejected(McpSchema.McpError, { code: -32001.5, message: "Invalid code" })
      }))

    it.effect("enforces annotation priority bounds", () =>
      Effect.gen(function*() {
        yield* decode(McpSchema.Annotations, { priority: 0 })
        yield* decode(McpSchema.Annotations, { priority: 1 })
        yield* assertRejected(McpSchema.Annotations, { priority: -0.01 })
        yield* assertRejected(McpSchema.Annotations, { priority: 1.01 })
      }))

    it.effect("enforces model priority bounds", () =>
      Effect.gen(function*() {
        yield* decode(McpSchema.ModelPreferences, {
          costPriority: 0,
          speedPriority: 0.5,
          intelligencePriority: 1
        })
        yield* assertRejected(McpSchema.ModelPreferences, { costPriority: -0.01 })
        yield* assertRejected(McpSchema.ModelPreferences, { speedPriority: 1.01 })
        yield* assertRejected(McpSchema.ModelPreferences, { intelligencePriority: 2 })
      }))

    it.effect("applies tool annotation defaults", () =>
      Effect.gen(function*() {
        const annotations = yield* decode(McpSchema.ToolAnnotations, {})
        assert.deepStrictEqual(annotations, {
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: false,
          openWorldHint: true
        })
      }))

    it.effect("rejects malformed base64 content", () =>
      Effect.gen(function*() {
        yield* assertRejected(McpSchema.ImageContent, {
          type: "image",
          data: "Zm9vY",
          mimeType: "image/png"
        })
        yield* assertRejected(McpSchema.AudioContent, {
          type: "audio",
          data: "Zm9vYmF-",
          mimeType: "audio/mpeg"
        })
        yield* assertRejected(McpSchema.BlobResourceContents, {
          uri: "file:///blob",
          blob: "=Zm9vYmF"
        })
      }))

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
          const decoded = yield* decode(schema, encoded)
          assert.deepStrictEqual(decoded.data, bytes)
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
