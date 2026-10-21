import * as LanguageModel from "@effect/ai/LanguageModel"
import * as Response from "@effect/ai/Response"
import * as Tool from "@effect/ai/Tool"
import * as Toolkit from "@effect/ai/Toolkit"
import { assert, describe, it } from "@effect/vitest"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
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

const TransformTool = Tool.make("TransformTool", {
  parameters: { count: Schema.NumberFromString },
  success: Schema.Number
})

const TransformToolkit = Toolkit.make(TransformTool)

const TransformToolkitLayer = TransformToolkit.toLayer({
  TransformTool: ({ count }) => Effect.succeed(count * 2)
})

const transformToolCall = {
  type: "tool-call",
  id: "tool-abc123",
  name: "TransformTool",
  params: { count: "42" }
} as const

describe("LanguageModel", () => {
  describe("generateText", () => {
    it.effect("disableToolCallResolution returns tool call params that toolkit.handle accepts", () =>
      Effect.gen(function*() {
        const toolkit = yield* TransformToolkit
        const response = yield* LanguageModel.generateText({
          prompt: [],
          toolkit,
          disableToolCallResolution: true
        }).pipe(TestUtils.withLanguageModel({ generateText: [transformToolCall] }))

        const toolCall = response.toolCalls[0]!
        assert.deepStrictEqual(toolCall.params, { count: "42" })
        const { result } = yield* toolkit.handle(toolCall.name, toolCall.params)
        assert.strictEqual(result, 84)
      }).pipe(Effect.provide(TransformToolkitLayer)))
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

    it.effect("disableToolCallResolution emits tool call params that toolkit.handle accepts", () =>
      Effect.gen(function*() {
        const toolkit = yield* TransformToolkit
        const parts = yield* LanguageModel.streamText({
          prompt: [],
          toolkit,
          disableToolCallResolution: true
        }).pipe(
          Stream.runCollect,
          TestUtils.withLanguageModel({ streamText: [transformToolCall] })
        )

        const toolCall = Chunk.findFirst(parts, (part) => part.type === "tool-call").pipe(Option.getOrThrow)
        assert.deepStrictEqual(toolCall.params, { count: "42" })
        const { result } = yield* toolkit.handle(toolCall.name, toolCall.params)
        assert.strictEqual(result, 84)
      }).pipe(Effect.provide(TransformToolkitLayer)))
  })
})
