import { AmazonBedrockClient, AmazonBedrockLanguageModel, AmazonBedrockSchema } from "@effect/ai-amazon-bedrock"
import * as LanguageModel from "@effect/ai/LanguageModel"
import type * as Response from "@effect/ai/Response"
import * as Tool from "@effect/ai/Tool"
import * as Toolkit from "@effect/ai/Toolkit"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"

// ---------------------------------------------------------------------------
// Schema decoders
// ---------------------------------------------------------------------------

const decodeStreamEvent = Schema.decodeUnknownSync(AmazonBedrockSchema.ConverseResponseStreamEvent)
const decodeConverseResponse = Schema.decodeUnknownSync(AmazonBedrockSchema.ConverseResponse)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TestModel = "us.anthropic.claude-3-5-sonnet-20241022-v2:0" as const

const makeMockClient = (options: {
  readonly converse?: Effect.Effect<AmazonBedrockSchema.ConverseResponse>
  readonly converseStream?: Stream.Stream<AmazonBedrockSchema.ConverseResponseStreamEvent>
}): AmazonBedrockClient.Service => ({
  client: {
    converse: () => options.converse ?? Effect.die("not implemented")
  },
  streamRequest: () => Stream.die("not implemented"),
  converse: () => options.converse ?? Effect.die("not implemented"),
  converseStream: () => options.converseStream ?? Stream.empty
})

const makeStreamTestLayer = (converseStream: Stream.Stream<AmazonBedrockSchema.ConverseResponseStreamEvent>) =>
  AmazonBedrockLanguageModel.layer({ model: TestModel }).pipe(
    Layer.provide(
      Layer.succeed(AmazonBedrockClient.AmazonBedrockClient, makeMockClient({ converseStream }))
    )
  )

const makeConverseTestLayer = (converse: Effect.Effect<AmazonBedrockSchema.ConverseResponse>) =>
  AmazonBedrockLanguageModel.layer({ model: TestModel }).pipe(
    Layer.provide(
      Layer.succeed(AmazonBedrockClient.AmazonBedrockClient, makeMockClient({ converse }))
    )
  )

// ---------------------------------------------------------------------------
// Event builders — decode from encoded (wire) format into decoded types
// ---------------------------------------------------------------------------

const messageStart = (role: "user" | "assistant" = "assistant") =>
  decodeStreamEvent({ messageStart: { role } })

const textBlockStart = (index: number) =>
  decodeStreamEvent({ contentBlockStart: { contentBlockIndex: index, start: {} } })

const textDelta = (index: number, text: string) =>
  decodeStreamEvent({ contentBlockDelta: { contentBlockIndex: index, delta: { text } } })

const contentBlockStop = (index: number) =>
  decodeStreamEvent({ contentBlockStop: { contentBlockIndex: index } })

const messageStop = (stopReason: string = "end_turn") =>
  decodeStreamEvent({ messageStop: { stopReason } })

const metadataEvent = (usage: {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly totalTokens: number
  readonly cacheReadInputTokens?: number
  readonly cacheWriteInputTokens?: number
}) =>
  decodeStreamEvent({
    metadata: {
      metrics: { latencyMs: 100 },
      usage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        ...(usage.cacheReadInputTokens !== undefined
          ? { cacheReadInputTokens: usage.cacheReadInputTokens }
          : {}),
        ...(usage.cacheWriteInputTokens !== undefined
          ? { cacheWriteInputTokens: usage.cacheWriteInputTokens }
          : {})
      }
    }
  })

const metadataEventWithTrace = (usage: {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly totalTokens: number
}) =>
  decodeStreamEvent({
    metadata: {
      metrics: { latencyMs: 100 },
      usage,
      trace: {}
    }
  })

const toolBlockStart = (index: number, toolUseId: string, name: string) =>
  decodeStreamEvent({
    contentBlockStart: {
      contentBlockIndex: index,
      start: { toolUse: { toolUseId, name } }
    }
  })

const toolDelta = (index: number, input: string) =>
  decodeStreamEvent({
    contentBlockDelta: {
      contentBlockIndex: index,
      delta: { toolUse: { input } }
    }
  })

const errorEvent = (kind: "internalServerException" | "modelStreamErrorException" | "serviceUnavailableException") =>
  decodeStreamEvent({ [kind]: { message: "something went wrong" } })

// ---------------------------------------------------------------------------
// ConverseResponse builder for non-streaming tests
// ---------------------------------------------------------------------------

const converseResponse = (options: {
  readonly text?: string
  readonly stopReason?: string
  readonly inputTokens: number
  readonly outputTokens: number
  readonly totalTokens: number
  readonly cacheReadInputTokens?: number
  readonly cacheWriteInputTokens?: number
}) =>
  decodeConverseResponse({
    output: {
      message: {
        role: "assistant",
        content: [{ text: options.text ?? "Hello" }]
      }
    },
    metrics: { latencyMs: 100 },
    usage: {
      inputTokens: options.inputTokens,
      outputTokens: options.outputTokens,
      totalTokens: options.totalTokens,
      ...(options.cacheReadInputTokens !== undefined
        ? { cacheReadInputTokens: options.cacheReadInputTokens }
        : {}),
      ...(options.cacheWriteInputTokens !== undefined
        ? { cacheWriteInputTokens: options.cacheWriteInputTokens }
        : {})
    },
    stopReason: options.stopReason ?? "end_turn"
  })

// ---------------------------------------------------------------------------
// Collect all stream parts into an array
// ---------------------------------------------------------------------------

const collectStreamParts = (stream: Stream.Stream<AmazonBedrockSchema.ConverseResponseStreamEvent>) =>
  LanguageModel.streamText({ prompt: "hello" }).pipe(
    Stream.runCollect,
    Effect.map((chunk) => [...chunk]),
    Effect.provide(makeStreamTestLayer(stream))
  )

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AmazonBedrockLanguageModel", () => {
  describe("streaming", () => {
    it.effect("should include token usage in finish part (happy path: messageStop then metadata)", () =>
      Effect.gen(function*() {
        const events = Stream.fromIterable([
          messageStart(),
          textBlockStart(0),
          textDelta(0, "Hello"),
          contentBlockStop(0),
          messageStop("end_turn"),
          metadataEvent({
            inputTokens: 100,
            outputTokens: 50,
            totalTokens: 150
          })
        ])

        const parts = yield* collectStreamParts(events)
        const finishPart = parts.find((p): p is Response.FinishPart => p.type === "finish")

        assert.isDefined(finishPart)
        assert.strictEqual(finishPart!.usage.inputTokens, 100)
        assert.strictEqual(finishPart!.usage.outputTokens, 50)
        assert.strictEqual(finishPart!.usage.totalTokens, 150)
        assert.strictEqual(finishPart!.reason, "stop")
      }))

    it.effect("should include cached token counts in finish part", () =>
      Effect.gen(function*() {
        const events = Stream.fromIterable([
          messageStart(),
          textBlockStart(0),
          textDelta(0, "Cached response"),
          contentBlockStop(0),
          messageStop("end_turn"),
          metadataEvent({
            inputTokens: 200,
            outputTokens: 75,
            totalTokens: 275,
            cacheReadInputTokens: 150,
            cacheWriteInputTokens: 50
          })
        ])

        const parts = yield* collectStreamParts(events)
        const finishPart = parts.find((p): p is Response.FinishPart => p.type === "finish")

        assert.isDefined(finishPart)
        assert.strictEqual(finishPart!.usage.cachedInputTokens, 150)
        assert.strictEqual(finishPart!.usage.inputTokens, 200)
        assert.strictEqual(finishPart!.usage.outputTokens, 75)
        assert.strictEqual(finishPart!.usage.totalTokens, 275)

        // cacheWriteInputTokens is in provider metadata
        const bedrockMeta = finishPart!.metadata.bedrock
        assert.isDefined(bedrockMeta)
        assert.strictEqual(bedrockMeta!.usage.cacheWriteInputTokens, 50)
      }))

    it.effect("should have undefined cachedInputTokens when not present in metadata", () =>
      Effect.gen(function*() {
        const events = Stream.fromIterable([
          messageStart(),
          textBlockStart(0),
          textDelta(0, "No cache"),
          contentBlockStop(0),
          messageStop("end_turn"),
          metadataEvent({
            inputTokens: 50,
            outputTokens: 25,
            totalTokens: 75
          })
        ])

        const parts = yield* collectStreamParts(events)
        const finishPart = parts.find((p): p is Response.FinishPart => p.type === "finish")

        assert.isDefined(finishPart)
        assert.isUndefined(finishPart!.usage.cachedInputTokens)
      }))

    it.effect("should pass through cacheReadInputTokens: 0 as 0, not undefined", () =>
      Effect.gen(function*() {
        const events = Stream.fromIterable([
          messageStart(),
          textBlockStart(0),
          textDelta(0, "First request"),
          contentBlockStop(0),
          messageStop("end_turn"),
          metadataEvent({
            inputTokens: 100,
            outputTokens: 50,
            totalTokens: 150,
            cacheReadInputTokens: 0,
            cacheWriteInputTokens: 200
          })
        ])

        const parts = yield* collectStreamParts(events)
        const finishPart = parts.find((p): p is Response.FinishPart => p.type === "finish")

        assert.isDefined(finishPart)
        assert.strictEqual(finishPart!.usage.cachedInputTokens, 0)
      }))

    it.effect("should include trace metadata in finish part", () =>
      Effect.gen(function*() {
        const events = Stream.fromIterable([
          messageStart(),
          textBlockStart(0),
          textDelta(0, "Traced"),
          contentBlockStop(0),
          messageStop("end_turn"),
          metadataEventWithTrace({
            inputTokens: 10,
            outputTokens: 5,
            totalTokens: 15
          })
        ])

        const parts = yield* collectStreamParts(events)
        const finishPart = parts.find((p): p is Response.FinishPart => p.type === "finish")

        assert.isDefined(finishPart)
        assert.isDefined(finishPart!.metadata.bedrock?.trace)
      }))

    it.effect("should not emit finish part if metadata never arrives (error after messageStop)", () =>
      Effect.gen(function*() {
        const events = Stream.fromIterable([
          messageStart(),
          textBlockStart(0),
          textDelta(0, "Partial"),
          contentBlockStop(0),
          messageStop("end_turn"),
          errorEvent("internalServerException")
        ])

        const parts = yield* collectStreamParts(events)
        const finishPart = parts.find((p) => p.type === "finish")
        const errorPart = parts.find((p) => p.type === "error")

        assert.isUndefined(finishPart)
        assert.isDefined(errorPart)
      }))

    it.effect("should not emit finish part if only metadata arrives without messageStop", () =>
      Effect.gen(function*() {
        const events = Stream.fromIterable([
          messageStart(),
          textBlockStart(0),
          textDelta(0, "Odd"),
          contentBlockStop(0),
          metadataEvent({
            inputTokens: 10,
            outputTokens: 5,
            totalTokens: 15
          })
        ])

        const parts = yield* collectStreamParts(events)
        const finishPart = parts.find((p) => p.type === "finish")

        assert.isUndefined(finishPart)
      }))

    it.effect("should correctly map stop reasons", () =>
      Effect.gen(function*() {
        const events = Stream.fromIterable([
          messageStart(),
          textBlockStart(0),
          textDelta(0, "Done"),
          contentBlockStop(0),
          messageStop("max_tokens"),
          metadataEvent({
            inputTokens: 10,
            outputTokens: 5,
            totalTokens: 15
          })
        ])

        const parts = yield* collectStreamParts(events)
        const finishPart = parts.find((p): p is Response.FinishPart => p.type === "finish")

        assert.isDefined(finishPart)
        assert.strictEqual(finishPart!.reason, "length")
      }))

    it.effect("should emit text parts correctly alongside finish", () =>
      Effect.gen(function*() {
        const events = Stream.fromIterable([
          messageStart(),
          textBlockStart(0),
          textDelta(0, "Hello "),
          textDelta(0, "World"),
          contentBlockStop(0),
          messageStop("end_turn"),
          metadataEvent({
            inputTokens: 10,
            outputTokens: 5,
            totalTokens: 15,
            cacheReadInputTokens: 8
          })
        ])

        const parts = yield* collectStreamParts(events)

        const textDeltas = parts.filter((p) => p.type === "text-delta")
        assert.strictEqual(textDeltas.length, 2)

        const finishPart = parts.find((p): p is Response.FinishPart => p.type === "finish")
        assert.isDefined(finishPart)
        assert.strictEqual(finishPart!.usage.cachedInputTokens, 8)

        // Finish should be the last meaningful part
        const lastNonMetaPart = parts.filter((p) => p.type !== "response-metadata").pop()
        assert.strictEqual(lastNonMetaPart?.type, "finish")
      }))

    it.effect("should include cached tokens with tool call content blocks", () =>
      Effect.gen(function*() {
        const GetWeather = Tool.make("get_weather", {
          parameters: { city: Schema.String },
          success: Schema.String
        })
        const WeatherToolkit = Toolkit.make(GetWeather)
        const WeatherToolkitLayer = WeatherToolkit.toLayer({
          get_weather: () => Effect.succeed("sunny")
        })

        const events = Stream.fromIterable([
          messageStart(),
          textBlockStart(0),
          textDelta(0, "Let me use a tool"),
          contentBlockStop(0),
          toolBlockStart(1, "tool-123", "get_weather"),
          toolDelta(1, "{\"city\":"),
          toolDelta(1, "\"London\"}"),
          contentBlockStop(1),
          messageStop("tool_use"),
          metadataEvent({
            inputTokens: 300,
            outputTokens: 100,
            totalTokens: 400,
            cacheReadInputTokens: 250
          })
        ])

        const parts = yield* LanguageModel.streamText({
          prompt: "hello",
          toolkit: WeatherToolkit,
          disableToolCallResolution: true
        }).pipe(
          Stream.runCollect,
          Effect.map((chunk) => [...chunk]),
          Effect.provide(makeStreamTestLayer(events)),
          Effect.provide(WeatherToolkitLayer)
        )

        const finishPart = parts.find((p): p is Response.FinishPart => p.type === "finish")

        assert.isDefined(finishPart)
        assert.strictEqual(finishPart!.usage.cachedInputTokens, 250)
        assert.strictEqual(finishPart!.usage.inputTokens, 300)
        assert.strictEqual(finishPart!.reason, "tool-calls")

        const toolCallPart = parts.find((p) => p.type === "tool-call")
        assert.isDefined(toolCallPart)
      }))
  })

  describe("non-streaming", () => {
    it.effect("should include cached token counts in generateText response", () =>
      Effect.gen(function*() {
        const response = converseResponse({
          text: "Cached non-streaming response",
          inputTokens: 200,
          outputTokens: 75,
          totalTokens: 275,
          cacheReadInputTokens: 150,
          cacheWriteInputTokens: 50
        })

        const result = yield* LanguageModel.generateText({ prompt: "hello" }).pipe(
          Effect.provide(makeConverseTestLayer(Effect.succeed(response)))
        )

        assert.strictEqual(result.usage.cachedInputTokens, 150)
        assert.strictEqual(result.usage.inputTokens, 200)
        assert.strictEqual(result.usage.outputTokens, 75)
        assert.strictEqual(result.usage.totalTokens, 275)
      }))

    it.effect("should have undefined cachedInputTokens when not present in non-streaming response", () =>
      Effect.gen(function*() {
        const response = converseResponse({
          text: "No cache",
          inputTokens: 50,
          outputTokens: 25,
          totalTokens: 75
        })

        const result = yield* LanguageModel.generateText({ prompt: "hello" }).pipe(
          Effect.provide(makeConverseTestLayer(Effect.succeed(response)))
        )

        assert.isUndefined(result.usage.cachedInputTokens)
      }))

    it.effect("should pass through cacheReadInputTokens: 0 as 0 in non-streaming response", () =>
      Effect.gen(function*() {
        const response = converseResponse({
          text: "Zero cache",
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          cacheReadInputTokens: 0,
          cacheWriteInputTokens: 200
        })

        const result = yield* LanguageModel.generateText({ prompt: "hello" }).pipe(
          Effect.provide(makeConverseTestLayer(Effect.succeed(response)))
        )

        assert.strictEqual(result.usage.cachedInputTokens, 0)
      }))
  })
})
