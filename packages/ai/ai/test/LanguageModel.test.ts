import * as LanguageModel from "@effect/ai/LanguageModel"
import * as Response from "@effect/ai/Response"
import * as Tool from "@effect/ai/Tool"
import * as Toolkit from "@effect/ai/Toolkit"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as TestClock from "effect/TestClock"
import * as TestUtils from "./utilities.js"

const MyTool = Tool.make("MyTool", {
  parameters: { testParam: Schema.String },
  success: Schema.Struct({ testSuccess: Schema.String })
})

const MyToolkit = Toolkit.make(MyTool)

const MyToolkitLayer = MyToolkit.toLayer({
  MyTool: () =>
    Effect.succeed({ testSuccess: "test-success" }).pipe(
      Effect.delay("10 seconds")
    )
})

// Tool with a transforming schema (NumberFromString: string -> number)
// to verify that disableToolCallResolution keeps params as raw JSON
const TransformTool = Tool.make("TransformTool", {
  description: "A tool with a transforming parameter schema",
  parameters: { count: Schema.NumberFromString },
  success: Schema.Struct({ doubled: Schema.Number })
})

const TransformToolkit = Toolkit.make(TransformTool)

const TransformToolkitLayer = TransformToolkit.toLayer({
  TransformTool: ({ count }) =>
    Effect.succeed({ doubled: count * 2 })
})

describe("LanguageModel", () => {
  describe("generateText", () => {
    it.effect(
      "disableToolCallResolution should not double-decode transforming params",
      () =>
        Effect.gen(function*() {
          const toolCallId = "tool-transform-1"
          const toolName = "TransformTool"
          // The LLM returns params as raw JSON (encoded form: string "42")
          const toolParams = { count: "42" }

          const response = yield* LanguageModel.generateText({
            prompt: "test",
            toolkit: TransformToolkit,
            disableToolCallResolution: true
          }).pipe(
            TestUtils.withLanguageModel({
              generateText: [
                {
                  type: "tool-call",
                  id: toolCallId,
                  name: toolName,
                  params: toolParams
                }
              ]
            }),
            Effect.provide(TransformToolkitLayer)
          )

          // Params should remain as raw JSON (string "42"), not decoded to number 42
          assert.strictEqual(response.toolCalls.length, 1)
          const toolCall = response.toolCalls[0]!
          assert.strictEqual(toolCall.name, toolName)

          // Now manually call toolkit.handle with the raw params — should succeed
          const toolkit = yield* TransformToolkit.pipe(
            Effect.provide(TransformToolkitLayer)
          )
          const result = yield* toolkit.handle(toolCall.name, toolCall.params as any)
          assert.deepStrictEqual(result.result, { doubled: 84 })
        })
    )
  })

  describe("streamText", () => {
    it.effect("should emit tool calls before executing tool handlers", () =>
      Effect.gen(function*() {
        const parts: Array<Response.StreamPart<Toolkit.Tools<typeof MyToolkit>>> = []
        const latch = yield* Effect.makeLatch()

        const toolCallId = "tool-abc123"
        const toolName = "MyTool"
        const toolParams = { testParam: "test-param" }
        const toolResult = { testSuccess: "test-success" }

        yield* LanguageModel.streamText({
          prompt: [],
          toolkit: MyToolkit
        }).pipe(
          Stream.runForEach((part) =>
            Effect.andThen(latch.open, () => {
              parts.push(part)
            })
          ),
          TestUtils.withLanguageModel({
            streamText: [
              {
                type: "tool-call",
                id: toolCallId,
                name: toolName,
                params: toolParams
              }
            ]
          }),
          Effect.provide(MyToolkitLayer),
          Effect.fork
        )

        yield* latch.await

        const toolCallPart = Response.makePart("tool-call", {
          id: toolCallId,
          name: toolName,
          params: toolParams,
          providerExecuted: false
        })

        const toolResultPart = Response.toolResultPart({
          id: toolCallId,
          name: toolName,
          result: toolResult,
          encodedResult: toolResult,
          isFailure: false,
          providerExecuted: false
        })

        assert.deepStrictEqual(parts, [toolCallPart])

        yield* TestClock.adjust("10 seconds")

        assert.deepStrictEqual(parts, [toolCallPart, toolResultPart])
      }))

    it.effect(
      "disableToolCallResolution should not double-decode transforming params in stream",
      () =>
        Effect.gen(function*() {
          const parts: Array<Response.StreamPart<Toolkit.Tools<typeof TransformToolkit>>> = []
          const latch = yield* Effect.makeLatch()

          const toolCallId = "tool-transform-stream-1"
          const toolName = "TransformTool"
          const toolParams = { count: "42" }

          yield* LanguageModel.streamText({
            prompt: "test",
            toolkit: TransformToolkit,
            disableToolCallResolution: true
          }).pipe(
            Stream.runForEach((part) =>
              Effect.andThen(latch.open, () => {
                parts.push(part)
              })
            ),
            TestUtils.withLanguageModel({
              streamText: [
                {
                  type: "tool-call",
                  id: toolCallId,
                  name: toolName,
                  params: toolParams
                }
              ]
            }),
            Effect.provide(TransformToolkitLayer),
            Effect.fork
          )

          yield* latch.await

          // Verify tool call params remain as raw JSON
          const toolCallParts = parts.filter((p) => p.type === "tool-call")
          assert.strictEqual(toolCallParts.length, 1)

          // Manually call toolkit.handle — should succeed without double-decode
          const toolkit = yield* TransformToolkit.pipe(
            Effect.provide(TransformToolkitLayer)
          )
          const result = yield* toolkit.handle(
            toolCallParts[0]!.name as any,
            toolCallParts[0]!.params as any
          )
          assert.deepStrictEqual(result.result, { doubled: 84 })
        })
    )
  })
})
