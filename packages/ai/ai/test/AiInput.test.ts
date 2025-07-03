import * as AiInput from "@effect/ai/AiInput"
import * as AiResponse from "@effect/ai/AiResponse"
import { assert, describe, it } from "@effect/vitest"

describe("AiInput", () => {
  describe("make", () => {
    it("should create valid input from a string", () => {
      const input = AiInput.make("Hello")
      const message = AiInput.UserMessage.make({
        parts: [AiInput.TextPart.make({ text: "Hello" })]
      })
      assert.deepStrictEqual(input, AiInput.make([message]))
    })

    it("should create valid input from a single message", () => {
      const message = AiInput.UserMessage.make({
        parts: [AiInput.TextPart.make({ text: "Hello" })]
      })
      assert.deepStrictEqual(AiInput.make(message), AiInput.make([message]))
    })

    it("should create valid input from an iterable of messages", () => {
      const messages = [
        AiInput.UserMessage.make({
          parts: [AiInput.TextPart.make({ text: "Hello" })]
        }),
        AiInput.UserMessage.make({
          parts: [AiInput.TextPart.make({ text: "World" })]
        })
      ]
      assert.deepStrictEqual(AiInput.make(messages), new AiInput.AiInput({ messages }))
    })
    it("should create valid input from an empty response", () => {
      assert.deepStrictEqual(AiInput.make(AiResponse.empty), AiInput.empty)
    })

    it("should create valid input from a response", () => {
      const input = new AiInput.AiInput({
        messages: [
          AiInput.AssistantMessage.make({
            parts: [
              AiInput.TextPart.make({
                text: "Hello"
              }),
              AiInput.ToolCallPart.make({
                id: AiInput.ToolCallId.make("1"),
                name: "tool",
                params: {}
              })
            ]
          })
        ]
      })
      assert.deepStrictEqual(AiInput.make(mockResponse), input)
    })

    it("should create a valid input from a response containing a structured output", () => {
      const input = new AiInput.AiInput({
        messages: [
          AiInput.AssistantMessage.make({
            parts: [
              AiInput.TextPart.make({
                text: "Hello"
              }),
              AiInput.ToolCallPart.make({
                id: AiInput.ToolCallId.make("1"),
                name: "tool",
                params: {}
              })
            ]
          }),
          AiInput.ToolMessage.make({
            parts: [
              AiInput.ToolCallResultPart.make({
                id: AiInput.ToolCallId.make("1"),
                name: "tool",
                result: {}
              })
            ]
          })
        ]
      })
      assert.deepStrictEqual(AiInput.make(mockStructuredResponse), input)
    })

    it("should create a valid input from a response containing tool call results", () => {
      const input = new AiInput.AiInput({
        messages: [
          AiInput.AssistantMessage.make({
            parts: [
              AiInput.TextPart.make({
                text: "Hello"
              }),
              AiInput.ToolCallPart.make({
                id: AiInput.ToolCallId.make("1"),
                name: "tool",
                params: {}
              })
            ]
          }),
          AiInput.ToolMessage.make({
            parts: [
              AiInput.ToolCallResultPart.make({
                id: AiInput.ToolCallId.make("1"),
                name: "tool",
                result: {}
              })
            ]
          })
        ]
      })
      assert.deepStrictEqual(AiInput.make(mockToolCallsResponse), input)
    })
  })
})

const mockResponse = AiResponse.AiResponse.make({
  parts: [
    AiResponse.TextPart.make({
      text: "Hello"
    }),
    AiResponse.ReasoningPart.make({
      reasoningText: "Reasoning"
    }),
    AiResponse.RedactedReasoningPart.make({
      redactedText: "Redacted"
    }),
    AiResponse.MetadataPart.make({
      model: "model",
      timestamp: new Date()
    }),
    AiResponse.ToolCallPart.make({
      id: AiInput.ToolCallId.make("1"),
      name: "tool",
      params: {}
    }),
    AiResponse.FinishPart.make({
      reason: "stop",
      usage: AiResponse.Usage.make({
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        reasoningTokens: 0,
        cacheReadInputTokens: 0,
        cacheWriteInputTokens: 0
      })
    })
  ]
})

const mockToolCallsResponse = new AiResponse.WithToolCallResults({
  parts: mockResponse.parts,
  results: new Map([[AiInput.ToolCallId.make("1"), { name: "tool", result: {} } as never]]),
  encodedResults: new Map([[AiInput.ToolCallId.make("1"), { name: "tool", result: {} }]])
})

const mockStructuredResponse = new AiResponse.WithStructuredOutput({
  parts: mockResponse.parts,
  id: AiInput.ToolCallId.make("1"),
  name: "tool",
  value: {}
})
