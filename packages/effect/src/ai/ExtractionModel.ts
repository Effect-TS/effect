/**
 * Defines the provider-neutral service for typed extraction from text.
 * `extract` sends one text and its named fields in one provider call, and
 * decodes each answer with its field's schema. Failures are reported as
 * `AiError` values. `extractSettled` makes the same call but reports each
 * field separately, so valid answers survive when others are missing or
 * invalid.
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Predicate from "../Predicate.ts"
import * as Result from "../Result.ts"
import * as Schema from "../Schema.ts"
import * as AiError from "./AiError.ts"
import type * as DecisionModel from "./DecisionModel.ts"
import type * as Extraction from "./Extraction.ts"
import type * as Response from "./Response.ts"

/**
 * Service key for answering extraction fields about a text. Create
 * implementations with `make`.
 *
 * @see {@link extract} for answering a definition through the current service
 *
 * @stability unstable
 * @category services
 * @since 4.0.6
 */
export const ExtractionModel: Context.Service<ExtractionModel, ExtractionModel> = Context.Service(
  "effect/ai/ExtractionModel"
)

/**
 * Brand type for `ExtractionModel`.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.0.6
 */
export type TypeId = "~effect/ai/ExtractionModel"

/**
 * Brand for `ExtractionModel` implementations.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.0.6
 */
export const TypeId: TypeId = "~effect/ai/ExtractionModel"

/**
 * Provider-reported token usage. Unreported counts are `undefined`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export class ExtractionUsage extends Schema.Class<ExtractionUsage>(
  "effect/ai/ExtractionModel/ExtractionUsage"
)({
  inputTokens: Schema.optional(Schema.Finite),
  outputTokens: Schema.optional(Schema.Finite)
}) {}

/**
 * Options for answering an extraction definition.
 *
 * @stability unstable
 * @category options
 * @since 4.0.6
 */
export interface ExtractOptions {
  /**
   * Text to read. Answer spans are character offsets into this string.
   */
  readonly text: string
  /**
   * Images to read before the text.
   */
  readonly images?: ReadonlyArray<DecisionModel.Image> | undefined
  /**
   * ISO date that anchors dates written without a year, such as "March 3rd".
   */
  readonly referenceDate?: string | undefined
}

/**
 * Provider-specific response metadata keyed by provider name. Provider
 * packages augment this interface.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface ExtractResponseMetadata extends Response.ProviderMetadata {}

/**
 * Answers for every field in a definition with usage and response metadata.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface ExtractResponse<Fields extends Record<string, Extraction.Any>> {
  readonly answers: Extraction.Answers<Fields>
  /**
   * Whether the provider cut the text short. Answers then only reflect the
   * part it read.
   */
  readonly truncated: boolean
  readonly usage: ExtractionUsage
  readonly id?: string | undefined
  readonly modelId?: string | undefined
  readonly metadata: ExtractResponseMetadata
}

/**
 * Per-field outcomes with usage and response metadata for the whole request.
 *
 * @see {@link extractSettled} for producing this response
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface ExtractSettledResponse<Fields extends Record<string, Extraction.Any>> {
  readonly outcomes: Extraction.Outcomes<Fields>
  readonly truncated: boolean
  readonly usage: ExtractionUsage
  readonly id?: string | undefined
  readonly modelId?: string | undefined
  readonly metadata: ExtractResponseMetadata
}

/**
 * Provider input options for an extraction request. All `fields` must be
 * answered in one call. `images` and `referenceDate` are omitted when not
 * supplied.
 *
 * @stability unstable
 * @category options
 * @since 4.0.6
 */
export interface ProviderOptions {
  readonly text: string
  readonly fields: Readonly<Record<string, Extraction.Any>>
  readonly images?: ReadonlyArray<DecisionModel.Image> | undefined
  readonly referenceDate?: string | undefined
}

/**
 * Provider response for an extraction request.
 *
 * **Details**
 *
 * `answers` is keyed like the requested fields, and each answer is in the
 * encoded form of its field's `answer` schema. `Absent` answers omit `field`,
 * which is filled in from the key. Omit the key of a field the provider did
 * not answer. `truncated` defaults to `false` and `metadata` to `{}`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface ProviderResponse {
  readonly answers: Readonly<Record<string, unknown>>
  readonly truncated?: boolean | undefined
  readonly usage: {
    readonly inputTokens: number | undefined
    readonly outputTokens: number | undefined
  }
  readonly id?: string | undefined
  readonly modelId?: string | undefined
  readonly metadata?: ExtractResponseMetadata | undefined
}

/**
 * Extraction operations over a definition.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface ExtractionModel {
  readonly [TypeId]: TypeId
  readonly extract: <Fields extends Record<string, Extraction.Any>>(
    definition: Extraction.Definition<Fields>,
    options: ExtractOptions
  ) => Effect.Effect<ExtractResponse<Fields>, AiError.AiError>
  readonly extractSettled: <Fields extends Record<string, Extraction.Any>>(
    definition: Extraction.Definition<Fields>,
    options: ExtractOptions
  ) => Effect.Effect<ExtractSettledResponse<Fields>, AiError.AiError>
}

const aiError = (method: "extract" | "extractSettled", reason: AiError.AiErrorReason): AiError.AiError =>
  AiError.make({ module: "ExtractionModel", method, reason })

const settleAnswer = (key: string, field: Extraction.Any, answer: unknown): Extraction.Outcome<Extraction.Any> => {
  if (!Predicate.isObject(answer)) {
    return Result.fail({
      _tag: "Unanswered",
      reason: "Missing",
      description: `Provider returned no answer for field "${key}"`
    })
  }
  const input = answer._tag === "Absent" ? { ...answer, field: key } : answer
  return Result.mapError(
    Schema.decodeUnknownResult(field.answer as Schema.Codec<Extraction.Answer<Extraction.Any>, unknown>)(input),
    (error) => ({
      _tag: "Unanswered" as const,
      reason: "Invalid" as const,
      description: `Provider returned an invalid answer for field "${key}": ${error.message}`
    })
  )
}

const settleAnswers = <Fields extends Record<string, Extraction.Any>>(
  fields: Fields,
  answers: Readonly<Record<string, unknown>>
): Extraction.Outcomes<Fields> => {
  const outcomes: Record<string, Extraction.Outcome<Extraction.Any>> = Object.create(null)
  for (const key of Object.keys(fields)) {
    outcomes[key] = settleAnswer(key, fields[key], answers[key])
  }
  return outcomes as Extraction.Outcomes<Fields>
}

const requireAnswers = <Fields extends Record<string, Extraction.Any>>(
  outcomes: Extraction.Outcomes<Fields>
): Effect.Effect<Extraction.Answers<Fields>, AiError.AiError> => {
  const answers: Record<string, unknown> = Object.create(null)
  for (const [key, outcome] of Object.entries(outcomes) as Array<[string, Extraction.Outcome<Extraction.Any>]>) {
    if (Result.isFailure(outcome)) {
      return Effect.fail(
        aiError("extract", new AiError.InvalidOutputError({ description: outcome.failure.description }))
      )
    }
    answers[key] = outcome.success
  }
  return Effect.succeed(answers as Extraction.Answers<Fields>)
}

/**
 * Creates an `ExtractionModel` that decodes provider answers with each
 * field's `answer` schema. With `extract`, any missing or invalid answer
 * fails with `AiError.InvalidOutputError`; `extractSettled` reports them per
 * field instead. An `Absent` answer is valid and never fails the call.
 *
 * **Details**
 *
 * Set `supportsImages: true` to accept images. Otherwise, nonempty image input
 * fails with `AiError.InvalidUserInputError`.
 *
 * @see {@link ExtractionModel} for the service shape returned by this constructor
 * @see {@link ProviderOptions} for the input passed to the provider implementation
 * @see {@link ProviderResponse} for the provider response contract consumed by this constructor
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const make = (params: {
  readonly extract: (options: ProviderOptions) => Effect.Effect<ProviderResponse, AiError.AiError>
  readonly supportsImages?: boolean | undefined
}): Effect.Effect<ExtractionModel> =>
  Effect.sync(() => {
    const settle = <Fields extends Record<string, Extraction.Any>>(
      method: "extract" | "extractSettled",
      definition: Extraction.Definition<Fields>,
      options: ExtractOptions
    ): Effect.Effect<ExtractSettledResponse<Fields>, AiError.AiError> => {
      const images = options.images?.length ? options.images : undefined
      if (images !== undefined && params.supportsImages !== true) {
        return Effect.fail(aiError(
          method,
          new AiError.InvalidUserInputError({ description: "This extraction model does not accept images" })
        ))
      }
      return params.extract({
        text: options.text,
        fields: definition.fields,
        ...(images === undefined ? undefined : { images }),
        ...(options.referenceDate === undefined ? undefined : { referenceDate: options.referenceDate })
      }).pipe(
        Effect.map((response): ExtractSettledResponse<Fields> => ({
          outcomes: settleAnswers(definition.fields, response.answers),
          truncated: response.truncated ?? false,
          usage: new ExtractionUsage({
            inputTokens: response.usage.inputTokens,
            outputTokens: response.usage.outputTokens
          }),
          ...(response.id === undefined ? undefined : { id: response.id }),
          ...(response.modelId === undefined ? undefined : { modelId: response.modelId }),
          metadata: response.metadata ?? {}
        }))
      )
    }
    return ExtractionModel.of({
      [TypeId]: TypeId,
      extract: (definition, options) =>
        settle("extract", definition, options).pipe(
          Effect.flatMap(({ outcomes, ...response }) =>
            Effect.map(requireAnswers(outcomes), (answers) => ({ answers, ...response }))
          ),
          (effect) => Effect.withSpan(effect, "ExtractionModel.extract", { captureStackTrace: false })
        ),
      extractSettled: (definition, options) =>
        settle("extractSettled", definition, options).pipe(
          (effect) => Effect.withSpan(effect, "ExtractionModel.extractSettled", { captureStackTrace: false })
        )
    })
  })

/**
 * Answers an extraction definition using the current `ExtractionModel`
 * service. Fails with `AiError.InvalidOutputError` for the first field, in
 * definition order, whose answer is missing or invalid.
 *
 * **Example** (Reading an invoice)
 *
 * ```ts
 * import { Effect } from "effect"
 * import { Extraction, ExtractionModel } from "effect/ai"
 *
 * const Invoice = Extraction.make({
 *   fields: {
 *     invoiceNumber: Extraction.text(),
 *     poNumber: Extraction.text({ instructions: "Purchase order number" }),
 *     daysToPay: Extraction.estimate({ min: 0, max: 120, step: 1, instructions: "Days until paid" })
 *   }
 * })
 *
 * const program = Effect.gen(function*() {
 *   const { answers } = yield* ExtractionModel.extract(Invoice, {
 *     text: "Invoice INV-2291 from Northwind Supply, issued 2026-09-02, net 30."
 *   })
 *   const invoiceNumber = yield* Effect.fromResult(Extraction.toResult(answers.invoiceNumber))
 *   const poNumber = answers.poNumber._tag === "Found" ? answers.poNumber.value : undefined
 *   return { invoiceNumber, poNumber, remindInDays: answers.daysToPay.p90 }
 * })
 * ```
 *
 * @see {@link ExtractionModel} for the service this function requires
 * @see {@link extractSettled} for keeping valid answers when others fail
 *
 * @stability unstable
 * @category extraction
 * @since 4.0.6
 */
export const extract = <Fields extends Record<string, Extraction.Any>>(
  definition: Extraction.Definition<Fields>,
  options: ExtractOptions
): Effect.Effect<ExtractResponse<Fields>, AiError.AiError, ExtractionModel> =>
  ExtractionModel.use((model) => model.extract(definition, options))

/**
 * Answers each field with a `Result` containing its decoded answer or an
 * `Extraction.Unanswered` reason. Provider failures still fail the effect.
 * Token usage covers the whole call.
 *
 * @see {@link extract} for failing unless every field is answered
 *
 * @stability unstable
 * @category extraction
 * @since 4.0.6
 */
export const extractSettled = <Fields extends Record<string, Extraction.Any>>(
  definition: Extraction.Definition<Fields>,
  options: ExtractOptions
): Effect.Effect<ExtractSettledResponse<Fields>, AiError.AiError, ExtractionModel> =>
  ExtractionModel.use((model) => model.extractSettled(definition, options))
