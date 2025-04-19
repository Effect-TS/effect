import * as AiInput from "@effect/ai/AiInput"
import * as AiResponse from "@effect/ai/AiResponse"
import { assert, describe, it } from "@effect/vitest"

describe("AiInput", () => {
  describe("make", () => {
    it("should create valid input from a string", () => {
      const input = AiInput.make("Hello")
      const message = AiInput.UserMessage.make({
        parts: [AiInput.TextPart.make({ content: "Hello" })]
      })
      assert.deepStrictEqual(input, [message])
    })

    it("should create valid input from a single message", () => {
      const message = AiInput.UserMessage.make({
        parts: [AiInput.TextPart.make({ content: "Hello" })]
      })
      assert.deepStrictEqual(AiInput.make(message), [message])
    })

    it("should create valid input from an iterable of messages", () => {
      const messages = [
        AiInput.UserMessage.make({
          parts: [AiInput.TextPart.make({ content: "Hello" })]
        }),
        AiInput.UserMessage.make({
          parts: [AiInput.TextPart.make({ content: "World" })]
        })
      ]
      assert.deepStrictEqual(AiInput.make(messages), messages)
    })
    it("should create valid input from an empty response", () => {
      assert.deepStrictEqual(AiInput.make(AiResponse.AiResponse.empty), [])
    })

    it("should create valid input from a response", () => {
      const input = [
        AiInput.AssistantMessage.make({
          parts: [
            AiInput.TextPart.make({
              content: "Hello"
            }),
            AiInput.ToolCallPart.make({
              id: AiInput.ToolCallId.make("1"),
              name: "tool",
              params: {}
            })
          ]
        })
      ]
      assert.deepStrictEqual(AiInput.make(mockResponse), input)
    })

    it("should create a valid input from a response containing a structured output", () => {
      const input = [
        AiInput.AssistantMessage.make({
          parts: [
            AiInput.TextPart.make({
              content: "Hello"
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
              result: {}
            })
          ]
        })
      ]
      assert.deepStrictEqual(AiInput.make(mockStructuredResponse), input)
    })

    it("should create a valid input from a response containing tool call results", () => {
      const input = [
        AiInput.AssistantMessage.make({
          parts: [
            AiInput.TextPart.make({
              content: "Hello"
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
              result: {}
            })
          ]
        })
      ]
      assert.deepStrictEqual(AiInput.make(mockToolCallsResponse), input)
    })
  })
})

const mockResponse = AiResponse.AiResponse.make({
  parts: [
    AiResponse.TextPart.make({
      content: "Hello"
    }),
    AiResponse.ReasoningPart.make({
      reasoning: "Reasoning"
    }),
    AiResponse.RedactedReasoningPart.make({
      redactedContent: "Redacted"
    }),
    AiResponse.ResponseMetadataPart.make({
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
        reasoningTokens: 0,
        cacheReadInputTokens: 0,
        cacheWriteInputTokens: 0
      })
    })
  ]
})

const mockToolCallsResponse = new AiResponse.WithToolCallResults({
  response: mockResponse,
  results: new Map([[AiInput.ToolCallId.make("1"), {}]]),
  encodedResults: new Map([[AiInput.ToolCallId.make("1"), {}]])
})

const mockStructuredResponse = new AiResponse.WithStructuredOutput({
  toolCallId: AiInput.ToolCallId.make("1"),
  toolName: "tool",
  response: mockResponse,
  value: {}
})
