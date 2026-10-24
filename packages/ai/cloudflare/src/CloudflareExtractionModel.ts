/**
 * Cloudflare Clairic implementation of ExtractionModel over Workers AI REST.
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as AiError from "effect/ai/AiError"
import type * as Extraction from "effect/ai/Extraction"
import * as ExtractionModel from "effect/ai/ExtractionModel"
import * as AiModel from "effect/ai/Model"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { CloudflareClient } from "./CloudflareClient.ts"
import type * as CloudflareSchema from "./CloudflareSchema.ts"
import { encodeImage, hasRemoteUrl } from "./internal/images.ts"

declare module "effect/ai/ExtractionModel" {
  /**
   * Cloudflare metadata returned with an extraction response.
   *
   * @stability unstable
   * @category models
   * @since 4.0.6
   */
  export interface ExtractResponseMetadata {
    readonly cloudflare?: {
      readonly stateTokens?: number
      readonly imageTokens?: number
      readonly schemaTokens?: number
      /**
       * Parallel passes the fields were split across.
       */
      readonly passes?: number
    }
  }
}

/**
 * Cloudflare Clairic model identifiers.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type Model = typeof CloudflareSchema.ExtractionsRequest.Encoded["model"]

/**
 * Creates an extraction model with Cloudflare provider metadata.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const model = (
  model: Model
): AiModel.Model<"cloudflare", ExtractionModel.ExtractionModel, CloudflareClient> =>
  AiModel.make("cloudflare", model, layer({ model }))

const fieldName = /^[A-Za-z_][A-Za-z0-9_.-]{0,63}$/

type Field = typeof CloudflareSchema.ExtractionField.Encoded
type Answer = typeof CloudflareSchema.ExtractionsResponse.Type["answers"][string]
type Step = typeof CloudflareSchema.ForecastStep.Type

const encodeField = (field: Extraction.Any): Field => {
  const { instructions } = field
  switch (field._tag) {
    case "Text":
      return { type: "text", instructions, null_threshold: field.nullThreshold }
    case "Number":
      return {
        type: "number",
        instructions,
        null_threshold: field.nullThreshold,
        unit: field.unit,
        integer: field.integer,
        decimals: field.decimals
      }
    case "Date":
      return { type: "date", instructions, null_threshold: field.nullThreshold }
    case "Time":
      return { type: "time", instructions, null_threshold: field.nullThreshold }
    case "DateTime":
      return { type: "datetime", instructions, null_threshold: field.nullThreshold }
    case "Duration":
      return {
        type: "duration",
        instructions,
        null_threshold: field.nullThreshold,
        unit: field.unit ?? "seconds",
        integer: field.integer,
        decimals: field.decimals
      }
    case "List":
      return { type: "list", instructions, items: field.items, decimals: field.decimals }
    case "Estimate":
      return { type: "estimate", instructions, min: field.min, max: field.max, step: field.step, scale: field.scale }
    case "Forecast":
      return {
        type: "forecast",
        instructions,
        min: field.min,
        max: field.max,
        horizon: field.horizon,
        interval: field.interval
      }
  }
}

const decodeEstimate = (answer: Answer | Step, quantiles: boolean | undefined) => ({
  value: answer.value,
  mean: answer.mean,
  median: answer.median,
  p10: answer.p10,
  p90: answer.p90,
  ...(answer.p_below === undefined ? undefined : { pBelow: answer.p_below }),
  ...(answer.p_above === undefined ? undefined : { pAbove: answer.p_above }),
  ...(quantiles && answer.quantiles !== undefined ? { quantiles: answer.quantiles } : undefined)
})

const decodeAnswer = (field: Extraction.Any, answer: Answer): unknown => {
  switch (field._tag) {
    case "List":
      return {
        items: Array.isArray(answer.value)
          ? answer.value.map((value, index) => ({
            value,
            ...(answer.spans?.[index] === undefined ? undefined : { span: answer.spans[index] }),
            ...(answer.confidences?.[index] === undefined ? undefined : { confidence: answer.confidences[index] })
          }))
          : answer.value,
        confidence: answer.confidence
      }
    case "Estimate":
      return decodeEstimate(answer, field.quantiles)
    case "Forecast":
      return { steps: answer.steps?.map((step) => decodeEstimate(step, field.quantiles)) }
    default: {
      const scores = {
        confidence: answer.confidence,
        pNull: answer.p_null,
        ...(answer.span === undefined ? undefined : { span: answer.span })
      }
      return answer.value === null
        ? { _tag: "Absent", ...(answer.guess == null ? undefined : { guess: answer.guess }), ...scores }
        : { _tag: "Found", value: answer.value, ...scores }
    }
  }
}

const invalidInput = (description: string) =>
  Effect.fail(AiError.make({
    module: "CloudflareExtractionModel",
    method: "extract",
    reason: new AiError.InvalidUserInputError({ description })
  }))

/**
 * Builds an extraction service from a Clairic model.
 *
 * **Details**
 *
 * Text answers carry `span` offsets into `text`. Number and date list items
 * carry a per-item `confidence` instead. Byte arrays and base64 strings are
 * sent as base64 with their media type, and `data:` URLs are sent unchanged.
 * The API enforces image limits.
 *
 * **Gotchas**
 *
 * - Remote image URLs fail with `AiError.InvalidUserInputError` because
 *   Clairic does not fetch them.
 * - Field names must match `^[A-Za-z_][A-Za-z0-9_.-]{0,63}$`; other names
 *   fail with `AiError.InvalidUserInputError`.
 * - Clairic drops time zones from `dateTime` answers, even when the text
 *   states one.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const make = Effect.fnUntraced(
  function*(
    options: { readonly model: Model }
  ): Effect.fn.Return<ExtractionModel.ExtractionModel, never, CloudflareClient> {
    const client = yield* CloudflareClient
    return yield* ExtractionModel.make({
      supportsImages: true,
      extract: Effect.fnUntraced(function*({ text, fields, images, referenceDate }) {
        const invalidName = Object.keys(fields).find((key) => !fieldName.test(key))
        if (invalidName !== undefined) {
          return yield* invalidInput(
            `Cloudflare Clairic field names must match ${fieldName.source}, got "${invalidName}"`
          )
        }
        if (hasRemoteUrl(images)) {
          return yield* invalidInput("Cloudflare Clairic accepts base64 or data URL images, not remote URLs")
        }
        const encoded: Record<string, Field> = Object.create(null)
        let quantiles = false
        for (const [key, field] of Object.entries(fields)) {
          encoded[key] = encodeField(field)
          quantiles ||= (field._tag === "Estimate" || field._tag === "Forecast") && field.quantiles === true
        }
        const response = yield* client.createExtractions({
          model: options.model,
          state: text,
          fields: encoded,
          ...(images === undefined ? undefined : { images: images.map(encodeImage) }),
          ...(referenceDate === undefined ? undefined : { reference_date: referenceDate }),
          ...(quantiles ? { options: { include_quantiles: true } } : undefined)
        })
        const answers: Record<string, unknown> = Object.create(null)
        for (const [key, field] of Object.entries(fields)) {
          const answer = response.answers[key]
          if (answer !== undefined) answers[key] = decodeAnswer(field, answer)
        }
        const { usage } = response
        return {
          answers,
          truncated: response.truncated,
          usage: { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens },
          modelId: response.model,
          metadata: {
            cloudflare: {
              ...(usage.state_tokens === undefined ? undefined : { stateTokens: usage.state_tokens }),
              ...(usage.image_tokens === undefined ? undefined : { imageTokens: usage.image_tokens }),
              ...(usage.schema_tokens === undefined ? undefined : { schemaTokens: usage.schema_tokens }),
              ...(usage.passes === undefined ? undefined : { passes: usage.passes })
            }
          }
        }
      })
    })
  }
)

/**
 * Provides ExtractionModel using an existing CloudflareClient.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.6
 */
export const layer = (
  options: { readonly model: Model }
): Layer.Layer<ExtractionModel.ExtractionModel, never, CloudflareClient> =>
  Layer.effect(ExtractionModel.ExtractionModel, make(options))
