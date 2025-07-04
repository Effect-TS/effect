import * as AiError from "@effect/ai/AiError"
import * as AiResponse from "@effect/ai/AiResponse"
import * as AiTool from "@effect/ai/AiTool"
import { assert, describe, it } from "@effect/vitest"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"

describe("AiResponse", () => {
  describe("constructor", () => {
    it("should create AiResponse with empty parts", () => {
      const response = AiResponse.empty
      assert.deepStrictEqual(response.parts, [])
    })

    it("should create AiResponse with parts", () => {
      const textPart = AiResponse.TextPart.make({ text: "Hello" })
      const response = new AiResponse.AiResponse({ parts: [textPart] })
      assert.deepStrictEqual(response.parts, [textPart])
    })
  })

  describe("text getter", () => {
    it("should return empty string when no text parts", () => {
      const response = new AiResponse.AiResponse({ parts: [] })
      assert.strictEqual(response.text, "")
    })

    it("should return text from single text part", () => {
      const textPart = AiResponse.TextPart.make({ text: "Hello" })
      const response = new AiResponse.AiResponse({ parts: [textPart] })
      assert.strictEqual(response.text, "Hello")
    })

    it("should concatenate multiple text parts with double newlines", () => {
      const textPart1 = AiResponse.TextPart.make({ text: "Hello" })
      const textPart2 = AiResponse.TextPart.make({ text: "World" })
      const response = new AiResponse.AiResponse({ parts: [textPart1, textPart2] })
      assert.strictEqual(response.text, "Hello\n\nWorld")
    })

    it("should ignore non-text parts", () => {
      const textPart = AiResponse.TextPart.make({ text: "Hello" })
      const reasoningPart = AiResponse.ReasoningPart.make({ reasoningText: "Thinking..." })
      const response = new AiResponse.AiResponse({ parts: [textPart, reasoningPart] })
      assert.strictEqual(response.text, "Hello")
    })
  })

  describe("finishReason getter", () => {
    it("should return 'unknown' when no finish part", () => {
      const response = new AiResponse.AiResponse({ parts: [] })
      assert.strictEqual(response.finishReason, "unknown")
    })

    it("should return finish reason from finish part", () => {
      const finishPart = AiResponse.FinishPart.make({
        reason: "stop",
        usage: AiResponse.Usage.make({
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
          reasoningTokens: 5,
          cacheReadInputTokens: 0,
          cacheWriteInputTokens: 0
        })
      })
      const response = new AiResponse.AiResponse({ parts: [finishPart] })
      assert.strictEqual(response.finishReason, "stop")
    })
  })

  describe("toolCalls getter", () => {
    it("should return empty array when no tool calls", () => {
      const response = new AiResponse.AiResponse({ parts: [] })
      assert.deepStrictEqual(response.toolCalls, [])
    })

    it("should return tool calls from response", () => {
      const toolCall = AiResponse.ToolCallPart.make({
        id: AiResponse.ToolCallId.make("1"),
        name: "test-tool",
        params: { key: "value" }
      })
      const response = new AiResponse.AiResponse({ parts: [toolCall] })
      assert.deepStrictEqual(response.toolCalls, [toolCall])
    })

    it("should return all tool calls from response", () => {
      const toolCall1 = AiResponse.ToolCallPart.make({
        id: AiResponse.ToolCallId.make("1"),
        name: "test-tool-1",
        params: { key: "value1" }
      })
      const toolCall2 = AiResponse.ToolCallPart.make({
        id: AiResponse.ToolCallId.make("2"),
        name: "test-tool-2",
        params: { key: "value2" }
      })
      const textPart = AiResponse.TextPart.make({ text: "Hello" })
      const response = new AiResponse.AiResponse({ parts: [textPart, toolCall1, toolCall2] })
      assert.deepStrictEqual(response.toolCalls, [toolCall1, toolCall2])
    })
  })

  describe("getProviderMetadata", () => {
    it("should return None when no finish part", () => {
      const response = new AiResponse.AiResponse({ parts: [] })
      const tag = Context.GenericTag<string>("test-tag")
      const result = response.getProviderMetadata(tag)
      assert.deepStrictEqual(result, Option.none())
    })

    it("should return None when metadata not found", () => {
      const finishPart = AiResponse.FinishPart.make({
        reason: "stop",
        usage: AiResponse.Usage.make({
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
          reasoningTokens: 5,
          cacheReadInputTokens: 0,
          cacheWriteInputTokens: 0
        })
      })
      const response = new AiResponse.AiResponse({ parts: [finishPart] })
      const tag = Context.GenericTag<string>("test-tag")
      const result = response.getProviderMetadata(tag)
      assert.deepStrictEqual(result, Option.none())
    })

    it("should return metadata when found", () => {
      const finishPart = AiResponse.FinishPart.make({
        reason: "stop",
        usage: AiResponse.Usage.make({
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
          reasoningTokens: 5,
          cacheReadInputTokens: 0,
          cacheWriteInputTokens: 0
        }),
        providerMetadata: {
          "test-tag": { value: "test-value" }
        }
      })
      const response = new AiResponse.AiResponse({ parts: [finishPart] })
      const tag = Context.GenericTag<{ value: string }>("test-tag")
      const result = response.getProviderMetadata(tag)
      assert.deepStrictEqual(result, Option.some({ value: "test-value" }))
    })
  })
})

describe("WithStructuredOutput", () => {
  it("should create structured output response", () => {
    const textPart = AiResponse.TextPart.make({ text: "Hello" })
    const response = new AiResponse.WithStructuredOutput({
      id: AiResponse.ToolCallId.make("1"),
      name: "test-tool",
      value: { result: "success" },
      parts: [textPart]
    })

    assert.strictEqual(response.id, AiResponse.ToolCallId.make("1"))
    assert.strictEqual(response.name, "test-tool")
    assert.deepStrictEqual(response.value, { result: "success" })
    assert.deepStrictEqual(response.parts, [textPart])
  })

  it("should inherit base AiResponse functionality", () => {
    const textPart = AiResponse.TextPart.make({ text: "Hello" })
    const response = new AiResponse.WithStructuredOutput({
      id: AiResponse.ToolCallId.make("1"),
      name: "test-tool",
      value: { result: "success" },
      parts: [textPart]
    })

    assert.strictEqual(response.text, "Hello")
    assert.strictEqual(response.finishReason, "unknown")
  })
})

describe("WithToolCallResults", () => {
  it("should create tool call results response", () => {
    const textPart = AiResponse.TextPart.make({ text: "Hello" })
    const results = new Map([[AiResponse.ToolCallId.make("1"), { name: "test-tool", result: "success" }]])
    const encodedResults = new Map([[AiResponse.ToolCallId.make("1"), {
      name: "test-tool",
      result: "encoded-success"
    }]])

    const response = new AiResponse.WithToolCallResults<typeof TestTool>({
      results,
      encodedResults,
      parts: [textPart]
    })

    assert.deepStrictEqual(response.results, results)
    assert.deepStrictEqual(response.encodedResults, encodedResults)
    assert.deepStrictEqual(response.parts, [textPart])
  })

  it("should get tool call result by name", () => {
    const results = new Map([
      [AiResponse.ToolCallId.make("1"), { name: "test-tool", result: "success" }],
      [AiResponse.ToolCallId.make("2"), { name: "other-tool", result: "other-success" }]
    ])
    const encodedResults = new Map([
      [AiResponse.ToolCallId.make("1"), { name: "test-tool", result: "encoded-success" }],
      [AiResponse.ToolCallId.make("2"), { name: "other-tool", result: "other-encoded-success" }]
    ])

    const response = new AiResponse.WithToolCallResults<typeof TestTool>({
      results,
      encodedResults,
      parts: []
    })

    const result = response.getToolCallResult("test-tool")
    assert.deepStrictEqual(result, Option.some("success"))

    // @ts-expect-error
    const notFound = response.getToolCallResult("non-existent")
    assert.deepStrictEqual(notFound, Option.none())
  })
})

describe("Parts", () => {
  describe("TextPart", () => {
    it("should create text part", () => {
      const textPart = AiResponse.TextPart.make({ text: "Hello world" })
      assert.strictEqual(textPart.text, "Hello world")
      assert.deepStrictEqual(textPart.annotations, [])
    })

    it("should create text part with annotations", () => {
      const annotation = AiResponse.ContentSourceAnnotation.make({
        id: "source-1",
        index: 0,
        type: "content_block",
        referencedContent: "Hello",
        startIndex: 0,
        endIndex: 5
      })
      const textPart = AiResponse.TextPart.make({
        text: "Hello world",
        annotations: [annotation]
      })
      assert.strictEqual(textPart.text, "Hello world")
      assert.deepStrictEqual(textPart.annotations, [annotation])
    })
  })

  describe("ReasoningPart", () => {
    it("should create reasoning part", () => {
      const reasoningPart = AiResponse.ReasoningPart.make({ reasoningText: "Let me think..." })
      assert.strictEqual(reasoningPart.reasoningText, "Let me think...")
      assert.strictEqual(reasoningPart.signature, undefined)
    })

    it("should create reasoning part with signature", () => {
      const reasoningPart = AiResponse.ReasoningPart.make({
        reasoningText: "Let me think...",
        signature: "verified"
      })
      assert.strictEqual(reasoningPart.reasoningText, "Let me think...")
      assert.strictEqual(reasoningPart.signature, "verified")
    })
  })

  describe("RedactedReasoningPart", () => {
    it("should create redacted reasoning part", () => {
      const redactedPart = AiResponse.RedactedReasoningPart.make({ redactedText: "[REDACTED]" })
      assert.strictEqual(redactedPart.redactedText, "[REDACTED]")
    })
  })

  describe("ToolCallPart", () => {
    it("should create tool call part", () => {
      const toolCall = AiResponse.ToolCallPart.make({
        id: AiResponse.ToolCallId.make("1"),
        name: "test-tool",
        params: { key: "value" }
      })
      assert.strictEqual(toolCall.id, AiResponse.ToolCallId.make("1"))
      assert.strictEqual(toolCall.name, "test-tool")
      assert.deepStrictEqual(toolCall.params, { key: "value" })
    })

    describe("fromJson", () => {
      it.effect("should create tool call from valid JSON", () =>
        Effect.gen(function*() {
          const result = yield* AiResponse.ToolCallPart.fromJson({
            id: "1",
            name: "test-tool",
            params: "{\"key\": \"value\"}"
          })

          assert.strictEqual(result.id, AiResponse.ToolCallId.make("1"))
          assert.strictEqual(result.name, "test-tool")
          assert.deepStrictEqual(result.params, { key: "value" })
        }))

      it.effect("should fail with invalid JSON", () =>
        Effect.gen(function*() {
          const result = yield* Effect.flip(
            AiResponse.ToolCallPart.fromJson({
              id: "1",
              name: "test-tool",
              params: "invalid json"
            })
          )

          assert.instanceOf(result, AiError.AiError)
          assert.strictEqual(result.module, "AiResponse")
          assert.strictEqual(result.method, "ToolCall.fromJson")
          assert.isTrue(result.description.includes("Failed to parse parameters from JSON"))
        }))
    })

    describe("fromUnknown", () => {
      it("should create tool call from unknown params", () => {
        const toolCall = AiResponse.ToolCallPart.fromUnknown({
          id: "1",
          name: "test-tool",
          params: { key: "value" }
        })

        assert.strictEqual(toolCall.id, AiResponse.ToolCallId.make("1"))
        assert.strictEqual(toolCall.name, "test-tool")
        assert.deepStrictEqual(toolCall.params, { key: "value" })
      })
    })
  })

  describe("MetadataPart", () => {
    it("should create metadata part", () => {
      const timestamp = new Date()
      const metadata = AiResponse.MetadataPart.make({
        id: "response-1",
        model: "gpt-4",
        timestamp
      })
      assert.strictEqual(metadata.id, "response-1")
      assert.strictEqual(metadata.model, "gpt-4")
      assert.strictEqual(metadata.timestamp, timestamp)
    })

    it("should create metadata part with minimal fields", () => {
      const metadata = AiResponse.MetadataPart.make({
        model: "gpt-4"
      })
      assert.strictEqual(metadata.id, undefined)
      assert.strictEqual(metadata.model, "gpt-4")
      assert.strictEqual(metadata.timestamp, undefined)
    })
  })

  describe("FinishPart", () => {
    it("should create finish part", () => {
      const usage = AiResponse.Usage.make({
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        reasoningTokens: 5,
        cacheReadInputTokens: 2,
        cacheWriteInputTokens: 3
      })
      const finishPart = AiResponse.FinishPart.make({
        reason: "stop",
        usage
      })
      assert.strictEqual(finishPart.reason, "stop")
      assert.deepStrictEqual(finishPart.usage, usage)
      assert.deepStrictEqual(finishPart.providerMetadata, {})
    })

    it("should create finish part with provider metadata", () => {
      const usage = AiResponse.Usage.make({
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        reasoningTokens: 5,
        cacheReadInputTokens: 2,
        cacheWriteInputTokens: 3
      })
      const metadata = { "provider-key": { "setting": "value" } }
      const finishPart = AiResponse.FinishPart.make({
        reason: "stop",
        usage,
        providerMetadata: metadata
      })
      assert.strictEqual(finishPart.reason, "stop")
      assert.deepStrictEqual(finishPart.usage, usage)
      assert.deepStrictEqual(finishPart.providerMetadata, metadata)
    })
  })

  describe("Usage", () => {
    it("should create usage information", () => {
      const usage = AiResponse.Usage.make({
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        reasoningTokens: 5,
        cacheReadInputTokens: 2,
        cacheWriteInputTokens: 3
      })
      assert.strictEqual(usage.inputTokens, 10)
      assert.strictEqual(usage.outputTokens, 20)
      assert.strictEqual(usage.totalTokens, 30)
      assert.strictEqual(usage.reasoningTokens, 5)
      assert.strictEqual(usage.cacheReadInputTokens, 2)
      assert.strictEqual(usage.cacheWriteInputTokens, 3)
    })
  })
})

describe("Annotations", () => {
  describe("ContentSourceAnnotation", () => {
    it("should create content source annotation", () => {
      const annotation = AiResponse.ContentSourceAnnotation.make({
        id: "source-1",
        index: 0,
        type: "content_block",
        referencedContent: "Hello world",
        startIndex: 0,
        endIndex: 11
      })
      assert.strictEqual(annotation.id, "source-1")
      assert.strictEqual(annotation.index, 0)
      assert.strictEqual(annotation.type, "content_block")
      assert.strictEqual(annotation.referencedContent, "Hello world")
      assert.strictEqual(annotation.startIndex, 0)
      assert.strictEqual(annotation.endIndex, 11)
    })
  })

  describe("FileAnnotation", () => {
    it("should create file annotation", () => {
      const annotation = AiResponse.FileAnnotation.make({
        id: "file-1",
        type: "file_citation",
        index: 0
      })
      assert.strictEqual(annotation.id, "file-1")
      assert.strictEqual(annotation.type, "file_citation")
      assert.strictEqual(annotation.index, 0)
    })
  })

  describe("UrlAnnotation", () => {
    it("should create URL annotation", () => {
      const annotation = AiResponse.UrlAnnotation.make({
        url: "https://example.com",
        title: "Example Site",
        startIndex: 0,
        endIndex: 10
      })
      assert.strictEqual(annotation.url, "https://example.com")
      assert.strictEqual(annotation.title, "Example Site")
      assert.strictEqual(annotation.startIndex, 0)
      assert.strictEqual(annotation.endIndex, 10)
    })
  })
})

describe("Guards", () => {
  describe("is", () => {
    it("should return true for AiResponse instances", () => {
      const response = new AiResponse.AiResponse({ parts: [] })
      assert.isTrue(AiResponse.is(response))
    })

    it("should return false for non-AiResponse objects", () => {
      assert.isFalse(AiResponse.is({}))
      assert.isFalse(AiResponse.is(null))
      assert.isFalse(AiResponse.is(undefined))
      assert.isFalse(AiResponse.is("string"))
    })
  })

  describe("isPart", () => {
    it("should return true for Part instances", () => {
      const textPart = AiResponse.TextPart.make({ text: "Hello" })
      assert.isTrue(AiResponse.isPart(textPart))
    })

    it("should return false for non-Part objects", () => {
      assert.isFalse(AiResponse.isPart({}))
      assert.isFalse(AiResponse.isPart(null))
      assert.isFalse(AiResponse.isPart(undefined))
    })
  })

  describe("isStructured", () => {
    it("should return true for WithStructuredOutput instances", () => {
      const response = new AiResponse.WithStructuredOutput({
        id: AiResponse.ToolCallId.make("1"),
        name: "test-tool",
        value: {},
        parts: []
      })
      assert.isTrue(AiResponse.isStructured(response))
    })

    it("should return false for regular AiResponse instances", () => {
      const response = new AiResponse.AiResponse({ parts: [] })
      assert.isFalse(AiResponse.isStructured(response))
    })
  })

  describe("hasToolCallResults", () => {
    it("should return true for WithToolCallResults instances", () => {
      const response = new AiResponse.WithToolCallResults<typeof TestTool>({
        results: new Map(),
        encodedResults: new Map(),
        parts: []
      })
      assert.isTrue(AiResponse.hasToolCallResults(response))
    })

    it("should return false for regular AiResponse instances", () => {
      const response = new AiResponse.AiResponse({ parts: [] })
      assert.isFalse(AiResponse.hasToolCallResults(response))
    })
  })
})

describe("Constructors", () => {
  describe("empty", () => {
    it("should create empty response", () => {
      assert.deepStrictEqual(AiResponse.empty.parts, [])
      assert.strictEqual(AiResponse.empty.text, "")
      assert.strictEqual(AiResponse.empty.finishReason, "unknown")
      assert.deepStrictEqual(AiResponse.empty.toolCalls, [])
    })
  })
})

describe("Combination", () => {
  describe("merge", () => {
    it("should merge two empty responses", () => {
      const merged = AiResponse.merge(AiResponse.empty, AiResponse.empty)
      assert.deepStrictEqual(merged.parts, [])
    })

    it("should merge responses with different parts", () => {
      const response1 = new AiResponse.AiResponse({
        parts: [AiResponse.TextPart.make({ text: "Hello" })]
      })
      const response2 = new AiResponse.AiResponse({
        parts: [AiResponse.TextPart.make({ text: "World" })]
      })
      const merged = AiResponse.merge(response1, response2)
      assert.strictEqual(merged.text, "HelloWorld")
    })

    it("should merge text parts correctly", () => {
      const response1 = new AiResponse.AiResponse({
        parts: [AiResponse.TextPart.make({ text: "Hello " })]
      })
      const response2 = new AiResponse.AiResponse({
        parts: [AiResponse.TextPart.make({ text: "World" })]
      })
      const merged = AiResponse.merge(response1, response2)
      assert.strictEqual(merged.parts.length, 1)
      assert.strictEqual((merged.parts[0] as AiResponse.TextPart).text, "Hello World")
    })

    it("should merge WithToolCallResults responses", () => {
      const results1 = new Map([[AiResponse.ToolCallId.make("1"), { name: "tool1", result: "result1" }]])
      const results2 = new Map([[AiResponse.ToolCallId.make("2"), { name: "tool2", result: "result2" }]])
      const encoded1 = new Map([[AiResponse.ToolCallId.make("1"), { name: "tool1", result: "encoded1" }]])
      const encoded2 = new Map([[AiResponse.ToolCallId.make("2"), { name: "tool2", result: "encoded2" }]])

      const response1 = new AiResponse.WithToolCallResults<typeof TestTool1 | typeof TestTool2>({
        results: results1,
        encodedResults: encoded1,
        parts: []
      })
      const response2 = new AiResponse.WithToolCallResults<typeof TestTool1 | typeof TestTool2>({
        results: results2,
        encodedResults: encoded2,
        parts: []
      })

      const merged = AiResponse.merge(response1, response2)
      assert.isTrue(AiResponse.hasToolCallResults(merged))

      const mergedWithResults = merged as AiResponse.WithToolCallResults<typeof TestTool1 | typeof TestTool2>
      assert.strictEqual(mergedWithResults.results.size, 2)
      assert.strictEqual(mergedWithResults.encodedResults.size, 2)
    })

    it("should merge WithStructuredOutput responses", () => {
      const response1 = new AiResponse.WithStructuredOutput({
        id: AiResponse.ToolCallId.make("1"),
        name: "tool1",
        value: { key: "value1" },
        parts: []
      })
      const response2 = new AiResponse.WithStructuredOutput({
        id: AiResponse.ToolCallId.make("2"),
        name: "tool2",
        value: { key: "value2" },
        parts: []
      })

      const merged = AiResponse.merge(response1, response2)
      assert.isTrue(AiResponse.isStructured(merged))

      const mergedStructured = merged as AiResponse.WithStructuredOutput<any>
      assert.strictEqual(mergedStructured.id, AiResponse.ToolCallId.make("1"))
      assert.strictEqual(mergedStructured.name, "tool1")
      assert.deepStrictEqual(mergedStructured.value, { key: "value2" })
    })
  })

  describe("withToolCallsJson", () => {
    it.effect("should add tool calls from JSON", () =>
      Effect.gen(function*() {
        const response = new AiResponse.AiResponse({
          parts: [AiResponse.TextPart.make({ text: "Hello" })]
        })

        const result = yield* AiResponse.withToolCallsJson(response, [
          { id: "1", name: "tool1", params: "{\"key\": \"value\"}" },
          { id: "2", name: "tool2", params: "{\"other\": \"data\"}" }
        ])

        assert.strictEqual(result.parts.length, 3)
        assert.strictEqual(result.toolCalls.length, 2)
        assert.strictEqual(result.toolCalls[0].name, "tool1")
        assert.strictEqual(result.toolCalls[1].name, "tool2")
      }))

    it.effect("should fail with invalid JSON", () =>
      Effect.gen(function*() {
        const response = new AiResponse.AiResponse({ parts: [] })
        const result = yield* Effect.flip(
          AiResponse.withToolCallsJson(response, [
            { id: "1", name: "tool1", params: "invalid json" }
          ])
        )

        assert.instanceOf(result, AiError.AiError)
        assert.strictEqual(result.module, "AiResponse")
        assert.strictEqual(result.method, "ToolCall.fromJson")
        assert.isTrue(result.description.includes("Failed to parse parameters from JSON"))
      }))
  })

  describe("Schema", () => {
    describe("FromJson", () => {
      it.effect("should parse AiResponse from JSON", () =>
        Effect.gen(function*() {
          const json = JSON.stringify({
            parts: [{
              _tag: "TextPart",
              text: "Hello",
              annotations: []
            }]
          })

          const result = yield* Schema.decodeUnknown(AiResponse.FromJson)(json)
          assert.instanceOf(result, AiResponse.AiResponse)
          assert.strictEqual(result.text, "Hello")
        }))
    })
  })

  describe("FinishReason", () => {
    it("should validate all finish reasons", () => {
      const reasons: Array<AiResponse.FinishReason> = [
        "stop",
        "length",
        "content-filter",
        "tool-calls",
        "error",
        "other",
        "unknown"
      ]

      reasons.forEach((reason) => {
        assert.doesNotThrow(() => Schema.decodeSync(AiResponse.FinishReason)(reason))
      })
    })
  })

  describe("ToolCallId", () => {
    it("should create and validate tool call IDs", () => {
      const id = AiResponse.ToolCallId.make("test-id")
      assert.strictEqual(id, "test-id")

      const decoded = Schema.decodeSync(AiResponse.ToolCallId)("another-id")
      assert.strictEqual(decoded, "another-id")
    })
  })
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TestTool = AiTool.make("test-tool", {
  success: Schema.String
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TestTool1 = AiTool.make("tool1", {
  success: Schema.String
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TestTool2 = AiTool.make("tool2", {
  success: Schema.String
})
