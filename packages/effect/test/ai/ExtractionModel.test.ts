import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect, Layer, Option, Result } from "effect"
import { Extraction, ExtractionModel } from "effect/ai"
import * as AiError from "effect/ai/AiError"

const Invoice = Extraction.make({
  fields: {
    invoiceNumber: Extraction.text(),
    poNumber: Extraction.text({ instructions: "Purchase order number" }),
    total: Extraction.number({ decimals: 2, unit: "USD" }),
    pallets: Extraction.number({ integer: true }),
    dueDate: Extraction.date(),
    terms: Extraction.duration({ unit: "days" }),
    contacts: Extraction.list({ items: "text" }),
    daysToPay: Extraction.estimate({ min: 0, max: 120, step: 1 }),
    paidBy: Extraction.estimate({ min: "2026-09-02", max: "2027-01-01" }),
    nextOrders: Extraction.forecast({ min: 0, max: 100, horizon: 2 })
  }
})

const estimate = { value: 30, mean: 29.5, median: 30, p10: 21, p90: 38 }

const answers = {
  invoiceNumber: { _tag: "Found", value: "INV-2291", confidence: 1, pNull: 0, span: [8, 16] },
  poNumber: { _tag: "Absent", guess: "INV-2291", confidence: 0.9995, pNull: 1, span: [8, 16] },
  total: { _tag: "Found", value: 1080, confidence: 0.9999, pNull: 0 },
  pallets: { _tag: "Found", value: 4, confidence: 0.99, pNull: 0 },
  dueDate: { _tag: "Found", value: "2026-10-02", confidence: 0.9999, pNull: 0 },
  terms: { _tag: "Found", value: 30, confidence: 0.99, pNull: 0 },
  contacts: { items: [{ value: "Dana Ruiz", span: [120, 129] }], confidence: 0.9999 },
  daysToPay: { ...estimate, pBelow: 0, pAbove: 0 },
  paidBy: { value: "2026-10-04", mean: "2026-10-04", median: "2026-10-04", p10: "2026-09-25", p90: "2026-10-12" },
  nextOrders: { steps: [estimate, estimate] }
}

const layer = (
  response: Partial<ExtractionModel.ProviderResponse>,
  onRequest: (options: ExtractionModel.ProviderOptions) => void = () => {},
  supportsImages?: boolean
) =>
  Layer.effect(
    ExtractionModel.ExtractionModel,
    ExtractionModel.make({
      supportsImages,
      extract: (options) => {
        onRequest(options)
        return Effect.succeed({
          answers,
          usage: { inputTokens: 655, outputTokens: 0 },
          ...response
        })
      }
    })
  )

const text = "Invoice INV-2291 from Northwind Supply"

describe("ExtractionModel", () => {
  it.effect("decodes every answer with its field's schema", () =>
    Effect.gen(function*() {
      const response = yield* ExtractionModel.extract(Invoice, { text, referenceDate: "2026-10-20" })
      const { answers } = response
      assert.deepStrictEqual(answers.invoiceNumber, {
        _tag: "Found",
        value: "INV-2291",
        confidence: 1,
        pNull: 0,
        span: [8, 16]
      })
      assert.deepStrictEqual(answers.poNumber, {
        _tag: "Absent",
        field: "poNumber",
        guess: "INV-2291",
        confidence: 0.9995,
        pNull: 1,
        span: [8, 16]
      })
      assert.isTrue(answers.terms._tag === "Found" && Duration.equals(answers.terms.value, Duration.days(30)))
      assert.deepStrictEqual(answers.contacts.items, [{ value: "Dana Ruiz", span: [120, 129] }])
      assert.strictEqual(answers.daysToPay.p90, 38)
      assert.strictEqual(answers.paidBy.median, "2026-10-04")
      assert.strictEqual(answers.nextOrders.steps.length, 2)
      assert.isFalse(response.truncated)
      assert.strictEqual(response.usage.inputTokens, 655)
      assert.deepStrictEqual(response.metadata, {})
    }).pipe(Effect.provide(layer({}, (options) => {
      assert.strictEqual(options.text, text)
      assert.strictEqual(options.referenceDate, "2026-10-20")
      assert.strictEqual(options.fields, Invoice.fields)
      assert.isFalse("images" in options)
    }))))

  it.effect("passes truncation, id, model, and metadata through", () =>
    Effect.gen(function*() {
      const response = yield* ExtractionModel.extract(Invoice, { text })
      assert.isTrue(response.truncated)
      assert.strictEqual(response.id, "req-1")
      assert.strictEqual(response.modelId, "clairic")
    }).pipe(Effect.provide(layer({ truncated: true, id: "req-1", modelId: "clairic" }))))

  it.effect("reports missing and invalid answers per field with extractSettled", () =>
    Effect.gen(function*() {
      const { outcomes } = yield* ExtractionModel.extractSettled(Invoice, { text })
      assert.isTrue(Result.isSuccess(outcomes.invoiceNumber))
      const missing = outcomes.total
      assert.isTrue(Result.isFailure(missing) && missing.failure.reason === "Missing")
      const fractional = outcomes.pallets
      assert.isTrue(Result.isFailure(fractional) && fractional.failure.reason === "Invalid")
      const date = outcomes.dueDate
      assert.isTrue(Result.isFailure(date) && date.failure.reason === "Invalid")
      const outOfBounds = outcomes.daysToPay
      assert.isTrue(Result.isFailure(outOfBounds) && outOfBounds.failure.reason === "Invalid")
      const unordered = outcomes.paidBy
      assert.isTrue(Result.isFailure(unordered) && unordered.failure.reason === "Invalid")
      const shortForecast = outcomes.nextOrders
      assert.isTrue(Result.isFailure(shortForecast) && shortForecast.failure.reason === "Invalid")
    }).pipe(Effect.provide(layer({
      answers: {
        ...answers,
        total: undefined,
        pallets: { _tag: "Found", value: 4.5, confidence: 0.9, pNull: 0 },
        dueDate: { _tag: "Found", value: "Oct 2", confidence: 0.9, pNull: 0 },
        daysToPay: { ...estimate, p90: 121 },
        paidBy: { ...answers.paidBy, p10: "2026-10-05" },
        nextOrders: { steps: [estimate] }
      }
    }))))

  it.effect("fails extract with InvalidOutputError for the first unanswered field", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(ExtractionModel.extract(Invoice, { text }))
      assert.instanceOf(error.reason, AiError.InvalidOutputError)
      assert.include(error.message, `"total"`)
    }).pipe(Effect.provide(layer({ answers: { ...answers, total: undefined } }))))

  it.effect("rejects images unless the provider supports them", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(ExtractionModel.extract(Invoice, {
        text,
        images: [{ mediaType: "image/png", data: "iVBORw==" }]
      }))
      assert.instanceOf(error.reason, AiError.InvalidUserInputError)
    }).pipe(Effect.provide(layer({}))))

  it.effect("sends images when the provider supports them", () =>
    Effect.gen(function*() {
      yield* ExtractionModel.extract(Invoice, { text: "", images: [{ mediaType: "image/png", data: "iVBORw==" }] })
    }).pipe(Effect.provide(layer({}, (options) => {
      assert.deepStrictEqual(options.images, [{ mediaType: "image/png", data: "iVBORw==" }])
    }, true))))

  it.effect("toResult fails with the Absent answer, which catchTag recovers", () =>
    Effect.gen(function*() {
      const { answers } = yield* ExtractionModel.extract(Invoice, { text })
      assert.deepStrictEqual(Extraction.toResult(answers.invoiceNumber), Result.succeed("INV-2291"))
      assert.deepStrictEqual(Extraction.toOption(answers.poNumber), Option.none())
      const field = yield* Effect.fromResult(Extraction.toResult(answers.poNumber)).pipe(
        Effect.catchTag("Absent", (absent) => Effect.succeed(absent.field))
      )
      assert.strictEqual(field, "poNumber")
    }).pipe(Effect.provide(layer({}))))

  it("validates definitions when they are created", () => {
    assert.throws(() => Extraction.make({ fields: {} }))
    assert.throws(() => Extraction.estimate({ min: 10, max: 10 }))
    assert.throws(() => Extraction.forecast({ min: 0, max: 10, horizon: 65 }))
  })
})
