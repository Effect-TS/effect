import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Fiber, Layer, Schema, Tracer } from "effect"
import { EmbeddingModel } from "effect/ai"
import * as AiError from "effect/ai/AiError"

const makeLayer = (
  embedMany: (
    options: EmbeddingModel.ProviderOptions
  ) => Effect.Effect<EmbeddingModel.ProviderResponse, AiError.AiError>
) =>
  Layer.effect(
    EmbeddingModel.EmbeddingModel,
    EmbeddingModel.make({
      embedMany
    })
  )

class InputType extends Context.Service<InputType, { readonly kind: "document" | "query" }>()(
  "EmbeddingModelTest/InputType"
) {}

class Tenant extends Context.Service<Tenant, string>()("EmbeddingModelTest/Tenant") {}

class Score extends Context.Service<Score, number>()("EmbeddingModelTest/Score") {}

interface Batch {
  readonly inputs: ReadonlyArray<string>
  readonly kind: string | undefined
}

const makeRecordingModel = (batches: Array<Batch>, settings?: ReadonlyArray<Context.Key<any, any>>) =>
  EmbeddingModel.make({
    settings,
    embedMany: ({ inputs }) =>
      Effect.serviceOption(InputType).pipe(
        Effect.map((inputType) => {
          batches.push({ inputs, kind: inputType._tag === "Some" ? inputType.value.kind : undefined })
          return { results: inputs.map((input) => [input.length]), usage: { inputTokens: undefined } }
        })
      )
  })

describe("EmbeddingModel", () => {
  it.effect("round trips usage with undefined input tokens through JSON", () =>
    Effect.gen(function*() {
      const usage = new EmbeddingModel.EmbeddingUsage({ inputTokens: undefined })

      const encoded = yield* Schema.encodeEffect(EmbeddingModel.EmbeddingUsage)(usage)
      const json = JSON.parse(JSON.stringify(encoded))
      const decoded = yield* Schema.decodeUnknownEffect(EmbeddingModel.EmbeddingUsage)(json)

      assert.deepStrictEqual(json, {}, "encoded JSON")
      assert.deepStrictEqual(decoded, new EmbeddingModel.EmbeddingUsage({}), "decoded usage")
    }))

  it.effect("embed returns a vector", () => {
    const calls: Array<ReadonlyArray<string>> = []

    return Effect.gen(function*() {
      const model = yield* EmbeddingModel.EmbeddingModel
      const response = yield* model.embed("hello")

      assert.deepStrictEqual(response.vector, [1, 2, 3])
      assert.deepStrictEqual(calls, [["hello"]])
    }).pipe(
      Effect.provide(
        makeLayer(({ inputs }) =>
          Effect.sync(() => {
            calls.push(inputs)
            return {
              results: [[1, 2, 3]],
              usage: { inputTokens: 5 }
            }
          })
        )
      )
    )
  })

  it.effect("embedMany returns ordered vectors with usage", () => {
    const calls: Array<ReadonlyArray<string>> = []

    return Effect.gen(function*() {
      const model = yield* EmbeddingModel.EmbeddingModel
      const response = yield* model.embedMany(["hello", "world"])

      assert.deepStrictEqual(
        response.embeddings.map((embedding) => embedding.vector),
        [[1, 2], [3, 4]]
      )
      assert.strictEqual(response.usage.inputTokens, 9)
      assert.deepStrictEqual(calls, [["hello", "world"]])
    }).pipe(
      Effect.provide(
        makeLayer(({ inputs }) => {
          calls.push(inputs)
          return Effect.succeed({
            results: [[1, 2], [3, 4]],
            usage: { inputTokens: 9 }
          })
        })
      )
    )
  })

  it.effect("concurrent embed calls are batched into one provider embedMany call", () => {
    let calls = 0
    const batches: Array<ReadonlyArray<string>> = []

    return Effect.gen(function*() {
      const model = yield* EmbeddingModel.EmbeddingModel
      const responses = yield* Effect.all([
        model.embed("a"),
        model.embed("b"),
        model.embed("c")
      ], { concurrency: "unbounded" })

      assert.strictEqual(calls, 1)
      assert.deepStrictEqual(batches, [["a", "b", "c"]])
      assert.deepStrictEqual(
        responses.map((response) => response.vector),
        [[97], [98], [99]]
      )
    }).pipe(
      Effect.provide(
        makeLayer(({ inputs }) => {
          calls++
          batches.push(inputs)
          return Effect.succeed({
            results: inputs.map((input) => [input.charCodeAt(0)]),
            usage: { inputTokens: undefined }
          })
        })
      )
    )
  })

  it.effect("settings services are compared by value and unlisted services by reference", () => {
    const batches: Array<Batch> = []

    return Effect.gen(function*() {
      const model = yield* makeRecordingModel(batches, [InputType])
      const responses = yield* Effect.all([
        model.embed("doc").pipe(Effect.provideService(InputType, { kind: "document" })),
        model.embed("query").pipe(Effect.provideService(InputType, { kind: "query" })),
        model.embed("doc 2").pipe(Effect.provideService(InputType, { kind: "document" })),
        model.embed("doc 3").pipe(
          Effect.provideService(InputType, { kind: "document" }),
          Effect.provideService(Tenant, "b")
        )
      ], { concurrency: "unbounded" })

      assert.deepStrictEqual(responses.map((response) => response.vector), [[3], [5], [5], [5]])
      assert.deepStrictEqual(batches, [
        { inputs: ["doc", "doc 2"], kind: "document" },
        { inputs: ["query"], kind: "query" },
        { inputs: ["doc 3"], kind: "document" }
      ])
    })
  })

  it.effect("concurrent embed calls with different services run in separate batches by default", () => {
    const batches: Array<Batch> = []

    return Effect.gen(function*() {
      const model = yield* makeRecordingModel(batches)
      const embedDoc = Effect.fn("embedDoc")(function*(input: string) {
        return yield* model.embed(input)
      })
      yield* Effect.all([
        embedDoc("doc").pipe(Effect.provideService(InputType, { kind: "document" })),
        model.embed("doc 2").pipe(Effect.provideService(InputType, { kind: "document" })),
        embedDoc("plain"),
        model.embed("plain 2").pipe(Effect.annotateLogs("item", 2))
      ], { concurrency: "unbounded" })

      assert.deepStrictEqual(batches, [
        { inputs: ["doc"], kind: "document" },
        { inputs: ["doc 2"], kind: "document" },
        { inputs: ["plain", "plain 2"], kind: undefined }
      ])
    })
  })

  it.effect("per-item log spans, span annotations, and span links share one batch", () => {
    const batches: Array<Batch> = []
    const link = Tracer.externalSpan({ spanId: "span", traceId: "trace" })

    return Effect.gen(function*() {
      const model = yield* makeRecordingModel(batches)
      yield* Effect.all([
        model.embed("a").pipe(Effect.withLogSpan("a")),
        model.embed("b").pipe(Effect.annotateSpans("item", "b")),
        model.embed("c").pipe(Effect.linkSpans(link)),
        model.embed("d")
      ], { concurrency: "unbounded" })

      assert.deepStrictEqual(batches, [{ inputs: ["a", "b", "c", "d"], kind: undefined }])
    })
  })

  it.effect("the same services provided in opposite orders share one batch", () => {
    const batches: Array<Batch> = []
    const inputType = InputType.of({ kind: "query" })

    return Effect.gen(function*() {
      const model = yield* makeRecordingModel(batches)
      yield* Effect.all([
        model.embed("a").pipe(Effect.provideService(InputType, inputType), Effect.provideService(Tenant, "t")),
        model.embed("b").pipe(Effect.provideService(Tenant, "t"), Effect.provideService(InputType, inputType))
      ], { concurrency: "unbounded" })

      assert.deepStrictEqual(batches, [{ inputs: ["a", "b"], kind: "query" }])
    })
  })

  it.effect("embed calls from two root fibers share one batch", () => {
    const batches: Array<Batch> = []

    return Effect.gen(function*() {
      const model = yield* makeRecordingModel(batches)
      const a = Effect.runFork(model.embed("a"))
      const b = Effect.runFork(model.embed("b"))
      const responses = yield* Fiber.joinAll([a, b])

      assert.deepStrictEqual(responses.map((response) => response.vector), [[1], [1]])
      assert.deepStrictEqual(batches, [{ inputs: ["a", "b"], kind: undefined }])
    })
  })

  it.effect("callers that retry a failed shared batch retry it as one provider call", () => {
    const calls: Array<ReadonlyArray<string>> = []
    const error = AiError.make({
      module: "EmbeddingModelTest",
      method: "embedMany",
      reason: new AiError.UnknownError({ description: "rate limited" })
    })

    return Effect.gen(function*() {
      const model = yield* EmbeddingModel.make({
        embedMany: ({ inputs }) =>
          Effect.suspend(() => {
            calls.push(inputs)
            return calls.length === 1
              ? Effect.fail(error)
              : Effect.succeed({ results: inputs.map((input) => [input.length]), usage: { inputTokens: undefined } })
          })
      })
      const responses = yield* Effect.forEach(
        ["a", "bb", "ccc"],
        (input) => model.embed(input).pipe(Effect.retry({ times: 1 })),
        { concurrency: "unbounded" }
      )

      assert.deepStrictEqual(responses.map((response) => response.vector), [[1], [2], [3]])
      assert.deepStrictEqual(calls, [["a", "bb", "ccc"], ["a", "bb", "ccc"]])
    })
  })

  it.effect("an interrupted caller's pending input is not sent, even under a NaN service", () => {
    const batches: Array<Batch> = []

    return Effect.gen(function*() {
      const model = yield* makeRecordingModel(batches)
      const a = yield* Effect.forkChild(model.embed("a"), { startImmediately: true })
      const b = yield* Effect.forkChild(model.embed("b"), { startImmediately: true })
      const c = yield* Effect.forkChild(model.embed("c"), { startImmediately: true })
      yield* Fiber.interrupt(b)
      const responses = yield* Fiber.joinAll([a, c])

      assert.deepStrictEqual(responses.map((response) => response.vector), [[1], [1]])
      assert.deepStrictEqual(batches, [{ inputs: ["a", "c"], kind: undefined }])
    }).pipe(Effect.provideService(Score, NaN))
  })

  it.effect("provider AiError propagates through embed", () => {
    const error = AiError.make({
      module: "EmbeddingModelTest",
      method: "embedMany",
      reason: new AiError.UnknownError({ description: "boom" })
    })

    return Effect.gen(function*() {
      const model = yield* EmbeddingModel.EmbeddingModel
      const result = yield* model.embed("hello").pipe(
        Effect.match({ onFailure: (error) => error, onSuccess: () => undefined })
      )

      assert.strictEqual(result, error)
    }).pipe(
      Effect.provide(
        makeLayer(() => Effect.fail(error))
      )
    )
  })

  it.effect("embed fails with InvalidOutputError when provider misses results", () =>
    Effect.gen(function*() {
      const model = yield* EmbeddingModel.EmbeddingModel
      const error = yield* model.embed("hello").pipe(
        Effect.match({ onFailure: (error) => error, onSuccess: () => undefined })
      )

      assert.notStrictEqual(error, undefined)
      if (error !== undefined) {
        assert.strictEqual(error.reason._tag, "InvalidOutputError")
      }
    }).pipe(
      Effect.provide(
        makeLayer(() =>
          Effect.succeed({
            results: [],
            usage: { inputTokens: 0 }
          })
        )
      )
    ))

  it.effect("embedMany fails with InvalidOutputError when provider misses results", () =>
    Effect.gen(function*() {
      const model = yield* EmbeddingModel.EmbeddingModel
      const error = yield* model.embedMany(["hello", "world"]).pipe(
        Effect.match({ onFailure: (error) => error, onSuccess: () => undefined })
      )

      assert.notStrictEqual(error, undefined)
      if (error !== undefined) {
        assert.strictEqual(error.reason._tag, "InvalidOutputError")
      }
    }).pipe(
      Effect.provide(
        makeLayer(() =>
          Effect.succeed({
            results: [[1, 2, 3]],
            usage: { inputTokens: 3 }
          })
        )
      )
    ))

  it.effect("embedMany([]) bypasses provider", () => {
    let calls = 0

    return Effect.gen(function*() {
      const model = yield* EmbeddingModel.EmbeddingModel
      const response = yield* model.embedMany([])

      assert.strictEqual(calls, 0)
      assert.deepStrictEqual(response.embeddings, [])
      assert.strictEqual(response.usage.inputTokens, undefined)
    }).pipe(
      Effect.provide(
        makeLayer(() => {
          calls++
          return Effect.die("provider should not be called")
        })
      )
    )
  })
})
