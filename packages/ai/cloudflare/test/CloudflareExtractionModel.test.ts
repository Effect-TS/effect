import * as CloudflareClient from "@effect/ai-cloudflare/CloudflareClient"
import * as CloudflareExtractionModel from "@effect/ai-cloudflare/CloudflareExtractionModel"
import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect, Layer, Redacted } from "effect"
import { Extraction, ExtractionModel, Model } from "effect/ai"
import * as AiError from "effect/ai/AiError"
import * as HttpClient from "effect/http/HttpClient"
import type * as HttpClientError from "effect/http/HttpClientError"
import type * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"

const Invoice = Extraction.make({
  fields: {
    invoice_number: Extraction.text(),
    po_number: Extraction.text({ instructions: "Purchase order number", nullThreshold: 0.6 }),
    total: Extraction.number({ decimals: 2, unit: "USD", instructions: "Amount due including shipping" }),
    kickoff: Extraction.dateTime(),
    lunch: Extraction.time(),
    migration: Extraction.duration({ unit: "minutes" }),
    contacts: Extraction.list({ items: "text" }),
    prices: Extraction.list({ items: "number", decimals: 2 }),
    days_to_pay: Extraction.estimate({ min: 0, max: 120, step: 1, quantiles: true }),
    signups: Extraction.forecast({ min: 0, max: 1000, horizon: 2, interval: "month" })
  }
})

const text = "Invoice INV-2291 from Northwind Supply, issued 2026-09-02, net 30."

const quantiles = Array.from({ length: 99 }, (_, index) => 20 + index * 0.2)

// Answers in the shapes Clairic returned from live requests.
const answers = {
  invoice_number: { type: "text", p_null: 3.8e-10, span: [8, 16], guess: "INV-2291", confidence: 1, value: "INV-2291" },
  po_number: { type: "text", p_null: 1, span: [8, 16], guess: "INV-2291", confidence: 0.9995, value: null },
  total: { type: "number", p_null: 2.3e-8, guess: 1080, confidence: 0.9999, value: 1080 },
  kickoff: {
    type: "datetime",
    p_null: 4.6e-8,
    guess: "2026-10-28T15:30:00",
    confidence: 0.99999,
    value: "2026-10-28T15:30:00"
  },
  lunch: { type: "time", p_null: 8.3e-7, guess: "12:00:00", confidence: 0.99999, value: "12:00:00" },
  migration: { type: "duration", p_null: 3.8e-8, unit: "minutes", guess: 90, confidence: 0.99999, value: 90 },
  contacts: { type: "list", value: ["Dana Ruiz", "Priya Shah"], spans: [[120, 129], [131, 141]], confidence: 0.9999 },
  prices: { type: "list", value: [12.5, 14], confidences: [0.9999, 0.9968], confidence: 0.9954 },
  days_to_pay: {
    type: "estimate",
    value: 30,
    mean: 29.535,
    median: 30,
    p10: 21,
    p90: 38,
    p_below: 5.9e-6,
    p_above: 1.2e-5,
    quantiles
  },
  signups: {
    type: "forecast",
    value: [230, 250],
    steps: [
      { value: 230, mean: 230, median: 229, p10: 214, p90: 246, p_below: 3.8e-7, p_above: 6.1e-7 },
      { value: 250, mean: 250, median: 251, p10: 226, p90: 273, p_below: 9.5e-7, p_above: 9.2e-7 }
    ]
  }
}

const result = {
  model: "clairic",
  answers,
  truncated: false,
  usage: { state_tokens: 61, image_tokens: 0, schema_tokens: 472, input_tokens: 655, output_tokens: 0, passes: 3 }
}

const clientLayer = (onRequest: (request: HttpClientRequest.HttpClientRequest) => void = () => {}) =>
  CloudflareClient.layer({ accountId: "test-account", apiKey: Redacted.make("test-token") }).pipe(
    Layer.provide(Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.makeWith(
        Effect.map((request) => {
          onRequest(request)
          return HttpClientResponse.fromWeb(request, Response.json({ success: true, result, errors: [], messages: [] }))
        }),
        Effect.succeed as HttpClient.HttpClient.Preprocess<HttpClientError.HttpClientError, never>
      )
    ))
  )

const requestBody = (request: HttpClientRequest.HttpClientRequest) => {
  assert.strictEqual(request.body._tag, "Uint8Array")
  return request.body._tag === "Uint8Array" ? JSON.parse(new TextDecoder().decode(request.body.body)) : undefined
}

describe("CloudflareExtractionModel", () => {
  it.effect("sends every field to Clairic and maps the answers back", () =>
    Effect.gen(function*() {
      const response = yield* ExtractionModel.extract(Invoice, { text, referenceDate: "2026-10-20" })
      const { answers } = response
      assert.strictEqual(yield* Model.ProviderName, "cloudflare")
      assert.strictEqual(yield* Model.ModelName, "clairic")
      assert.deepStrictEqual(answers.invoice_number, {
        _tag: "Found",
        value: "INV-2291",
        confidence: 1,
        pNull: 3.8e-10,
        span: [8, 16]
      })
      assert.deepStrictEqual(answers.po_number, {
        _tag: "Absent",
        field: "po_number",
        guess: "INV-2291",
        confidence: 0.9995,
        pNull: 1,
        span: [8, 16]
      })
      assert.isTrue(answers.kickoff._tag === "Found" && answers.kickoff.value === "2026-10-28T15:30:00")
      assert.isTrue(answers.lunch._tag === "Found" && answers.lunch.value === "12:00:00")
      assert.isTrue(
        answers.migration._tag === "Found" && Duration.equals(answers.migration.value, Duration.minutes(90))
      )
      assert.deepStrictEqual(answers.contacts.items, [
        { value: "Dana Ruiz", span: [120, 129] },
        { value: "Priya Shah", span: [131, 141] }
      ])
      assert.deepStrictEqual(answers.prices.items, [
        { value: 12.5, confidence: 0.9999 },
        { value: 14, confidence: 0.9968 }
      ])
      assert.deepStrictEqual(answers.days_to_pay, {
        value: 30,
        mean: 29.535,
        median: 30,
        p10: 21,
        p90: 38,
        pBelow: 5.9e-6,
        pAbove: 1.2e-5,
        quantiles
      })
      assert.deepStrictEqual(answers.signups.steps.map((step) => step.median), [229, 251])
      assert.isFalse("quantiles" in answers.signups.steps[0]!)
      assert.strictEqual(response.modelId, "clairic")
      assert.strictEqual(response.usage.inputTokens, 655)
      assert.deepStrictEqual(response.metadata.cloudflare, {
        stateTokens: 61,
        imageTokens: 0,
        schemaTokens: 472,
        passes: 3
      })
    }).pipe(
      Effect.provide(CloudflareExtractionModel.model("clairic")),
      Effect.provide(clientLayer((request) => {
        assert.strictEqual(
          request.url,
          "https://api.cloudflare.com/client/v4/accounts/test-account/ai/run/@cf/cloudflare/clairic"
        )
        assert.deepStrictEqual(requestBody(request), {
          model: "clairic",
          state: text,
          reference_date: "2026-10-20",
          options: { include_quantiles: true },
          fields: {
            invoice_number: { type: "text" },
            po_number: { type: "text", instructions: "Purchase order number", null_threshold: 0.6 },
            total: { type: "number", instructions: "Amount due including shipping", unit: "USD", decimals: 2 },
            kickoff: { type: "datetime" },
            lunch: { type: "time" },
            migration: { type: "duration", unit: "minutes" },
            contacts: { type: "list", items: "text" },
            prices: { type: "list", items: "number", decimals: 2 },
            days_to_pay: { type: "estimate", min: 0, max: 120, step: 1 },
            signups: { type: "forecast", min: 0, max: 1000, horizon: 2, interval: "month" }
          }
        })
      }))
    ))

  it.effect("sends base64 images and rejects remote image URLs", () =>
    Effect.gen(function*() {
      yield* ExtractionModel.extract(Invoice, {
        text,
        images: [{ mediaType: "image/png", data: new Uint8Array([1, 2, 3]) }]
      })
      const error = yield* Effect.flip(ExtractionModel.extract(Invoice, {
        text,
        images: [{ mediaType: "image/png", data: new URL("https://example.com/invoice.png") }]
      }))
      assert.instanceOf(error.reason, AiError.InvalidUserInputError)
    }).pipe(
      Effect.provide(CloudflareExtractionModel.layer({ model: "clairic" })),
      Effect.provide(clientLayer((request) => {
        assert.deepStrictEqual(requestBody(request).images, [{ content_type: "image/png", base64: "AQID" }])
      }))
    ))

  it.effect("rejects field names Clairic does not accept before sending", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(ExtractionModel.extract(
        Extraction.make({ fields: { "invoice number": Extraction.text() } }),
        { text }
      ))
      assert.instanceOf(error.reason, AiError.InvalidUserInputError)
    }).pipe(
      Effect.provide(CloudflareExtractionModel.layer({ model: "clairic" })),
      Effect.provide(clientLayer(() => assert.fail("request sent")))
    ))
})
