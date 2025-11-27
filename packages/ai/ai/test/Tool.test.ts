import * as LanguageModel from "@effect/ai/LanguageModel"
import * as Response from "@effect/ai/Response"
import * as Tool from "@effect/ai/Tool"
import * as Toolkit from "@effect/ai/Toolkit"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as TestUtils from "./utilities.js"

const FailureModeError = Tool.make("FailureModeError", {
  description: "A test tool",
  parameters: {
    testParam: Schema.String
  },
  success: Schema.Struct({
    testSuccess: Schema.String
  }),
  failure: Schema.Struct({
    testFailure: Schema.String
  })
})

const FailureModeReturn = Tool.make("FailureModeReturn", {
  description: "A test tool",
  failureMode: "return",
  parameters: {
    testParam: Schema.String
  },
  success: Schema.Struct({
    testSuccess: Schema.String
  }),
  failure: Schema.Struct({
    testFailure: Schema.String
  })
})

const NoHandlerRequired = Tool.providerDefined({
  id: "provider.no-handler-required",
  toolkitName: "NoHandlerRequired",
  providerName: "no_handler_required",
  args: {
    testArg: Schema.String
  },
  parameters: {
    testParam: Schema.String
  },
  success: Schema.Struct({
    testSuccess: Schema.String
  }),
  failure: Schema.Struct({
    testFailure: Schema.String
  })
})

const HandlerRequired = Tool.providerDefined({
  id: "provider.handler-required",
  toolkitName: "HandlerRequired",
  providerName: "handler_required",
  requiresHandler: true,
  args: {
    testArg: Schema.String
  },
  parameters: {
    testParam: Schema.String
  },
  success: Schema.Struct({
    testSuccess: Schema.String
  }),
  failure: Schema.Struct({
    testFailure: Schema.String
  })
})

describe("Tool", () => {
  describe("User Defined", () => {
    it.effect("should return tool call handler success as a Right", () =>
      Effect.gen(function*() {
        const toolkit = Toolkit.make(FailureModeReturn)

        const toolResult = { testSuccess: "failure-mode-return-tool" }
        const handlers = toolkit.toLayer({
          FailureModeReturn: () => Effect.succeed(toolResult)
        })

        const toolCallId = "tool-123"
        const toolName = "FailureModeReturn"

        const response = yield* LanguageModel.generateText({
          prompt: "Test",
          toolkit
        }).pipe(
          TestUtils.withLanguageModel({
            generateText: [{
              type: "tool-call",
              id: toolCallId,
              name: toolName,
              params: { testParam: "test-param" }
            }]
          }),
          Effect.provide(handlers)
        )

        const expected = Response.makePart("tool-result", {
          id: toolCallId,
          isFailure: false,
          name: toolName,
          result: toolResult,
          encodedResult: toolResult,
          providerExecuted: false
        })

        assert.deepInclude(response.toolResults, expected)
      }))

    it.effect("should return tool call handler failure as a Left", () =>
      Effect.gen(function*() {
        const toolkit = Toolkit.make(FailureModeReturn)

        const toolResult = { testFailure: "failure-mode-return-tool" }
        const handlers = toolkit.toLayer({
          FailureModeReturn: () => Effect.fail(toolResult)
        })

        const toolCallId = "tool-123"
        const toolName = "FailureModeReturn"

        const response = yield* LanguageModel.generateText({
          prompt: "Test",
          toolkit
        }).pipe(
          TestUtils.withLanguageModel({
            generateText: [{
              type: "tool-call",
              id: toolCallId,
              name: toolName,
              params: { testParam: "test-param" }
            }]
          }),
          Effect.provide(handlers)
        )

        const expected = Response.makePart("tool-result", {
          id: toolCallId,
          name: toolName,
          isFailure: true,
          result: toolResult,
          encodedResult: toolResult,
          providerExecuted: false
        })

        assert.deepInclude(response.toolResults, expected)
      }))

    it.effect("should raise an error on tool call handler failure", () =>
      Effect.gen(function*() {
        const toolkit = Toolkit.make(FailureModeError)

        const toolResult = { testFailure: "failure-mode-error-tool" }
        const handlers = toolkit.toLayer({
          FailureModeError: () => Effect.fail(toolResult)
        })

        const toolCallId = "tool-123"
        const toolName = "FailureModeError"

        const response = yield* LanguageModel.generateText({
          prompt: "Test",
          toolkit
        }).pipe(
          TestUtils.withLanguageModel({
            generateText: [{
              type: "tool-call",
              id: toolCallId,
              name: toolName,
              params: { testParam: "test-param" }
            }]
          }),
          Effect.provide(handlers),
          Effect.flip
        )

        assert.deepStrictEqual(response, toolResult)
      }))

    it.effect("should raise an error on invalid tool call parameters", () =>
      Effect.gen(function*() {
        const toolkit = Toolkit.make(FailureModeReturn)

        const toolResult = { testSuccess: "failure-mode-return-tool" }
        const handlers = toolkit.toLayer({
          FailureModeReturn: () => Effect.succeed(toolResult)
        })

        const toolCallId = "tool-123"
        const toolName = "FailureModeReturn"

        const response = yield* LanguageModel.generateText({
          prompt: "Test",
          toolkit
        }).pipe(
          TestUtils.withLanguageModel({
            generateText: [{
              type: "tool-call",
              id: toolCallId,
              name: toolName,
              params: {}
            }]
          }),
          Effect.provide(handlers),
          Effect.flip
        )

        assert.strictEqual(response._tag, "MalformedOutput")
        assert.strictEqual(
          response.description,
          "Failed to decode tool call parameters for tool 'FailureModeReturn' from:\n'{}'"
        )
      }))
  })

  describe("Provider Defined", () => {
    it.effect("should return tool call successes from the model as a Right", () =>
      Effect.gen(function*() {
        const tool = NoHandlerRequired({
          testArg: "test-arg"
        })
        const toolkit = Toolkit.make(tool)

        const toolCallId = "tool-123"
        const toolResult = { testSuccess: "provider-defined-tool" }

        const response = yield* LanguageModel.generateText({
          prompt: "Test",
          toolkit
        }).pipe(
          TestUtils.withLanguageModel({
            generateText: [
              {
                type: "tool-call",
                id: toolCallId,
                name: tool.name,
                providerName: tool.providerName,
                providerExecuted: true,
                params: { testParam: "test-param" }
              },
              {
                type: "tool-result",
                id: toolCallId,
                name: tool.name,
                isFailure: false,
                result: toolResult,
                providerName: tool.providerName,
                providerExecuted: true
              }
            ]
          })
        )

        const expected = Response.makePart("tool-result", {
          id: toolCallId,
          name: tool.name,
          isFailure: false,
          result: toolResult,
          encodedResult: toolResult,
          providerName: tool.providerName,
          providerExecuted: true
        })

        assert.deepInclude(response.toolResults, expected)
      }))

    it.effect("should return tool call errors from the model as a Left", () =>
      Effect.gen(function*() {
        const tool = NoHandlerRequired({
          testArg: "test-arg"
        })
        const toolkit = Toolkit.make(tool)

        const toolCallId = "tool-123"
        const toolResult = { testFailure: "provider-defined-tool" }

        const response = yield* LanguageModel.generateText({
          prompt: "Test",
          toolkit
        }).pipe(
          TestUtils.withLanguageModel({
            generateText: [
              {
                type: "tool-call",
                id: toolCallId,
                name: tool.name,
                providerName: tool.providerName,
                providerExecuted: true,
                params: { testParam: "test-param" }
              },
              {
                type: "tool-result",
                id: toolCallId,
                isFailure: true,
                name: tool.name,
                result: toolResult,
                providerName: tool.providerName,
                providerExecuted: true
              }
            ]
          })
        )

        const expected = Response.makePart("tool-result", {
          id: toolCallId,
          name: tool.name,
          isFailure: true,
          result: toolResult,
          encodedResult: toolResult,
          providerName: tool.providerName,
          providerExecuted: true
        })

        assert.deepInclude(response.toolResults, expected)
      }))

    it.effect("should return tool call handler success as a Right", () =>
      Effect.gen(function*() {
        const tool = HandlerRequired({
          testArg: "test-arg"
        })

        const toolCallId = "tool-123"
        const toolResult = { testSuccess: "provider-defined-tool" }

        const toolkit = Toolkit.make(tool)
        const handlers = toolkit.toLayer({
          HandlerRequired: () => Effect.succeed(toolResult)
        })

        const response = yield* LanguageModel.generateText({
          prompt: "Test",
          toolkit
        }).pipe(
          TestUtils.withLanguageModel({
            generateText: [
              {
                type: "tool-call",
                id: toolCallId,
                name: tool.name,
                providerName: tool.providerName,
                // Given this provider-defined tool requires a user-space
                // handler, it is not considered `providerExecuted`
                providerExecuted: false,
                params: { testParam: "test-param" }
              }
            ]
          }),
          Effect.provide(handlers)
        )

        const expected = Response.makePart("tool-result", {
          id: toolCallId,
          name: tool.name,
          isFailure: false,
          result: toolResult,
          encodedResult: toolResult,
          providerName: tool.providerName,
          providerExecuted: false
        })

        assert.deepInclude(response.toolResults, expected)
      }))

    it.effect("should return tool call handler failure as a Left", () =>
      Effect.gen(function*() {
        const tool = HandlerRequired({
          failureMode: "return",
          testArg: "test-arg"
        })

        const toolCallId = "tool-123"
        const toolResult = { testFailure: "provider-defined-tool" }

        const toolkit = Toolkit.make(tool)
        const handlers = toolkit.toLayer({
          HandlerRequired: () => Effect.fail(toolResult)
        })

        const response = yield* LanguageModel.generateText({
          prompt: "Test",
          toolkit
        }).pipe(
          TestUtils.withLanguageModel({
            generateText: [
              {
                type: "tool-call",
                id: toolCallId,
                name: tool.name,
                providerName: tool.providerName,
                // Given this provider-defined tool requires a user-space
                // handler, it is not considered `providerExecuted`
                providerExecuted: false,
                params: { testParam: "test-param" }
              }
            ]
          }),
          Effect.provide(handlers)
        )

        const expected = Response.makePart("tool-result", {
          id: toolCallId,
          name: tool.name,
          isFailure: true,
          result: toolResult,
          encodedResult: toolResult,
          providerName: tool.providerName,
          providerExecuted: false
        })

        assert.deepInclude(response.toolResults, expected)
      }))

    it.effect("should raise an error on tool call handler failure", () =>
      Effect.gen(function*() {
        const tool = HandlerRequired({
          testArg: "test-arg"
        })

        const toolCallId = "tool-123"
        const toolResult = { testFailure: "provider-defined-tool" }

        const toolkit = Toolkit.make(tool)
        const handlers = toolkit.toLayer({
          HandlerRequired: () => Effect.fail(toolResult)
        })

        const response = yield* LanguageModel.generateText({
          prompt: "Test",
          toolkit
        }).pipe(
          TestUtils.withLanguageModel({
            generateText: [
              {
                type: "tool-call",
                id: toolCallId,
                name: tool.name,
                providerName: tool.providerName,
                // Given this provider-defined tool requires a user-space
                // handler, it is not considered `providerExecuted`
                providerExecuted: false,
                params: { testParam: "test-param" }
              }
            ]
          }),
          Effect.provide(handlers),
          Effect.flip
        )

        assert.deepStrictEqual(response, toolResult)
      }))

    it.effect("should raise an error on invalid tool call parameters", () =>
      Effect.gen(function*() {
        const tool = HandlerRequired({
          failureMode: "return",
          testArg: "test-arg"
        })

        const toolCallId = "tool-123"
        const toolResult = { testSuccess: "provider-defined-tool" }

        const toolkit = Toolkit.make(tool)
        const handlers = toolkit.toLayer({
          HandlerRequired: () => Effect.succeed(toolResult)
        })

        const response = yield* LanguageModel.generateText({
          prompt: "Test",
          toolkit
        }).pipe(
          TestUtils.withLanguageModel({
            generateText: [
              {
                type: "tool-call",
                id: toolCallId,
                name: tool.name,
                providerName: tool.providerName,
                // Given this provider-defined tool requires a user-space
                // handler, it is not considered `providerExecuted`
                providerExecuted: false,
                params: {}
              }
            ]
          }),
          Effect.provide(handlers),
          Effect.flip
        )

        assert.strictEqual(response._tag, "MalformedOutput")
        assert.strictEqual(
          response.description,
          "Failed to decode tool call parameters for tool 'HandlerRequired' from:\n'{}'"
        )
      }))
  })
})
