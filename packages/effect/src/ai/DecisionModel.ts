/**
 * Defines the provider-neutral service for structured decisions.
 * `decide` encodes one input as JSON, sends its named decisions in one provider
 * call, and validates the answers. Failures are reported as `AiError` values.
 * `decideSettled` makes the same call but reports each decision separately, so
 * valid answers survive when others are missing, refused, or invalid.
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Predicate from "../Predicate.ts"
import * as Result from "../Result.ts"
import * as Schema from "../Schema.ts"
import * as AiError from "./AiError.ts"
import type * as Decision from "./Decision.ts"
import type * as Response from "./Response.ts"

/**
 * Service key for answering decisions about an input. Create implementations
 * with `make`.
 *
 * @see {@link decide} for answering a definition through the current service
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export const DecisionModel: Context.Service<DecisionModel, DecisionModel> = Context.Service(
  "effect/ai/DecisionModel"
)

/**
 * Brand type for `DecisionModel`.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.0.0
 */
export type TypeId = "~effect/ai/DecisionModel"

/**
 * Brand for `DecisionModel` implementations.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId: TypeId = "~effect/ai/DecisionModel"

/**
 * Provider-reported token usage. Unreported counts are `undefined`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export class DecisionUsage extends Schema.Class<DecisionUsage>(
  "effect/ai/DecisionModel/DecisionUsage"
)({
  inputTokens: Schema.optional(Schema.Finite),
  outputTokens: Schema.optional(Schema.Finite)
}) {}

/**
 * Options for answering a decision definition.
 *
 * @stability unstable
 * @category options
 * @since 4.0.0
 */
export interface DecideOptions<Input extends Schema.Constraint> {
  readonly input: Input["Type"]
  /**
   * Images to include with the input.
   */
  readonly images?: ReadonlyArray<Image> | undefined
}

/**
 * An image sent to the provider with the encoded input.
 * `data` is a base64 string, a byte array, or a URL.
 *
 * @stability unstable
 * @category models
 * @since 4.0.1
 */
export interface Image {
  readonly mediaType: string
  readonly data: string | Uint8Array | URL
}

/**
 * Provider-specific response metadata keyed by provider name. Provider
 * packages augment this interface.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface DecideResponseMetadata extends Response.ProviderMetadata {}

/**
 * Answers for every decision in a definition with usage and response metadata.
 *
 * @see {@link DecisionUsage} for token usage metadata
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface DecideResponse<Decisions extends Record<string, Decision.Any>> {
  readonly answers: Decision.Answers<Decisions>
  readonly usage: DecisionUsage
  /**
   * Response id reported by the provider.
   *
   * @since 4.0.6
   */
  readonly id?: string | undefined
  /**
   * Model that answered. Can differ from the requested model when the
   * provider resolves an alias.
   *
   * @since 4.0.6
   */
  readonly modelId?: string | undefined
  /**
   * Provider-specific metadata, such as reported cost.
   *
   * @since 4.0.6
   */
  readonly metadata: DecideResponseMetadata
}

/**
 * Per-decision outcomes, token usage, and response metadata for the whole
 * request.
 *
 * @see {@link decideSettled} for producing this response
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface DecideSettledResponse<Decisions extends Record<string, Decision.Any>> {
  readonly outcomes: Decision.Outcomes<Decisions>
  readonly usage: DecisionUsage
  readonly id?: string | undefined
  readonly modelId?: string | undefined
  readonly metadata: DecideResponseMetadata
}

/**
 * Provider input options for a decision request.
 * `state` is encoded with `Schema.toCodecJson`, not stringified.
 * All `decisions` must be answered in one call.
 * `images` is omitted when no images are supplied.
 *
 * @stability unstable
 * @category options
 * @since 4.0.0
 */
export interface ProviderOptions {
  readonly state: Schema.Json
  readonly decisions: Record<string, Decision.Any>
  readonly images?: ReadonlyArray<Image> | undefined
}

/**
 * Provider classify answer. Omit `probabilities` when no distribution is available.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface ProviderClassifyAnswer {
  readonly _tag: "Classify"
  readonly label: string
  readonly probabilities?: Readonly<Record<string, number>> | undefined
  readonly confidence?: number | undefined
}

/**
 * Provider rate answer. The highest probability determines the label, with
 * ties going to the first criterion. Omit `probabilities` when unavailable.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface ProviderRateAnswer {
  readonly _tag: "Rate"
  readonly rating: number
  readonly probabilities?: Readonly<Record<string, number>> | undefined
  readonly confidence?: number | undefined
}

/**
 * Provider answer for a probability decision.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface ProviderProbabilityAnswer {
  readonly _tag: "Probability"
  readonly probability: number
}

/**
 * Provider refusal to answer a decision.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface ProviderRefusalAnswer {
  readonly _tag: "Refusal"
}

/**
 * Provider answer for any decision kind.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type ProviderAnswer =
  | ProviderClassifyAnswer
  | ProviderRateAnswer
  | ProviderProbabilityAnswer
  | ProviderRefusalAnswer

/**
 * Provider response for a decision request.
 * `answers` is keyed like the requested decisions. Each answer is validated
 * against its decision before it is returned to the caller. Omit the key of a
 * decision the provider did not answer. `id`, `modelId` and `metadata` are
 * passed through; `metadata` defaults to `{}`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface ProviderResponse {
  readonly answers: Readonly<Record<string, ProviderAnswer>>
  readonly usage: {
    readonly inputTokens: number | undefined
    readonly outputTokens: number | undefined
  }
  readonly id?: string | undefined
  readonly modelId?: string | undefined
  readonly metadata?: DecideResponseMetadata | undefined
}

/**
 * Decision operations over a definition.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface DecisionModel {
  readonly [TypeId]: TypeId
  readonly decide: <Input extends Schema.Constraint, Decisions extends Record<string, Decision.Any>>(
    definition: Decision.Definition<Input, Decisions>,
    options: DecideOptions<Input>
  ) => Effect.Effect<DecideResponse<Decisions>, AiError.AiError, Input["EncodingServices"]>
  readonly decideSettled: <Input extends Schema.Constraint, Decisions extends Record<string, Decision.Any>>(
    definition: Decision.Definition<Input, Decisions>,
    options: DecideOptions<Input>
  ) => Effect.Effect<DecideSettledResponse<Decisions>, AiError.AiError, Input["EncodingServices"]>
}

const unanswered = (
  reason: Decision.Unanswered["reason"],
  description: string
): Result.Result<never, Decision.Unanswered> => Result.fail({ _tag: "Unanswered", reason, description })

const invalid = (description: string) => unanswered("Invalid", description)

const aiError = (method: "decide" | "decideSettled", reason: AiError.AiErrorReason): AiError.AiError =>
  AiError.make({ module: "DecisionModel", method, reason })

const isFiniteNumber = (value: unknown): value is number => Predicate.isNumber(value) && Number.isFinite(value)

const isUnitInterval = (value: unknown): value is number => isFiniteNumber(value) && value >= 0 && value <= 1

const sumTolerance = 1e-6

/**
 * `roundingError` is the largest error a provider's rounding adds to a single
 * probability (half a unit of its last decimal place). Distributions that sum
 * to 1 within `labels.length * roundingError` are rescaled to sum to 1.
 */
const validateDistribution = (
  key: string,
  labels: ReadonlyArray<string>,
  answer: Record<string, unknown>,
  roundingError: number
): Result.Result<Record<string, number>, Decision.Unanswered> => {
  const raw = answer.probabilities
  if (!Predicate.isObject(raw)) {
    return unanswered("NoDistribution", `Provider returned no probabilities for decision "${key}"`)
  }
  const probabilities: Record<string, number> = Object.create(null)
  let total = 0
  for (const label of labels) {
    const value = raw[label]
    if (!isUnitInterval(value)) {
      return invalid(`Provider returned no probability for label "${label}" of decision "${key}"`)
    }
    probabilities[label] = value
    total += value
  }
  const drift = Math.abs(total - 1)
  if (total === 0 || drift > labels.length * roundingError + sumTolerance) {
    return invalid(`Provider returned probabilities that do not sum to 1 for decision "${key}"`)
  }
  if (drift > sumTolerance) {
    for (const label of labels) probabilities[label] /= total
  }
  return Result.succeed(probabilities)
}

const validateConfidence = (
  key: string,
  answer: Record<string, unknown>
): Result.Result<number | undefined, Decision.Unanswered> => {
  if (answer.confidence === undefined) {
    return Result.succeed(undefined)
  }
  return isUnitInterval(answer.confidence)
    ? Result.succeed(answer.confidence)
    : invalid(`Provider returned confidence outside [0, 1] for decision "${key}"`)
}

const validateAnswer = (
  key: string,
  decision: Decision.Any,
  answer: unknown,
  roundingError: number
): Decision.Outcome<Decision.Any> => {
  if (!Predicate.isObject(answer)) {
    return unanswered("Missing", `Provider returned no answer for decision "${key}"`)
  }
  if (answer._tag === "Refusal") {
    return unanswered("Refused", `Provider refused to answer decision "${key}"`)
  }
  if (answer._tag !== decision._tag) {
    return invalid(
      `Provider returned a "${String(answer._tag)}" answer for decision "${key}", expected "${decision._tag}"`
    )
  }
  switch (decision._tag) {
    case "Classify": {
      const labels = Object.keys(decision.criteria)
      const label = answer.label
      if (!Predicate.isString(label) || !labels.includes(label)) {
        return invalid(`Provider returned an unknown label for decision "${key}"`)
      }
      return Result.gen(function*() {
        const confidence = yield* validateConfidence(key, answer)
        const probabilities = yield* validateDistribution(key, labels, answer, roundingError)
        return { label, probabilities, ...(confidence === undefined ? undefined : { confidence }) }
      })
    }
    case "Rate": {
      const levels = decision.criteria.map((level) => level.label)
      const rating = answer.rating
      if (!isFiniteNumber(rating) || rating < 0 || rating > levels.length - 1) {
        return invalid(`Provider returned a rating outside [0, ${levels.length - 1}] for decision "${key}"`)
      }
      return Result.gen(function*() {
        const confidence = yield* validateConfidence(key, answer)
        const probabilities = yield* validateDistribution(key, levels, answer, roundingError)
        let label = levels[0]
        for (let i = 1; i < levels.length; i++) {
          if (probabilities[levels[i]] > probabilities[label]) {
            label = levels[i]
          }
        }
        return { rating, label, probabilities, ...(confidence === undefined ? undefined : { confidence }) }
      })
    }
    case "Probability": {
      if (!isUnitInterval(answer.probability)) {
        return invalid(`Provider returned a probability outside [0, 1] for decision "${key}"`)
      }
      return Result.succeed({ probability: answer.probability })
    }
  }
}

const settleAnswers = <Decisions extends Record<string, Decision.Any>>(
  decisions: Decisions,
  answers: Readonly<Record<string, ProviderAnswer>>,
  roundingError: number
): Decision.Outcomes<Decisions> => {
  const outcomes: Record<string, Decision.Outcome<Decision.Any>> = Object.create(null)
  for (const key of Object.keys(decisions)) {
    outcomes[key] = validateAnswer(key, decisions[key], answers[key], roundingError)
  }
  return outcomes as Decision.Outcomes<Decisions>
}

const requireAnswers = <Decisions extends Record<string, Decision.Any>>(
  outcomes: Decision.Outcomes<Decisions>
): Effect.Effect<Decision.Answers<Decisions>, AiError.AiError> => {
  const answers: Record<string, Decision.Answer<Decision.Any>> = Object.create(null)
  const refused: Array<string> = []
  let firstUnanswered: Decision.Unanswered | undefined
  for (const [key, outcome] of Object.entries(outcomes) as Array<[string, Decision.Outcome<Decision.Any>]>) {
    if (Result.isSuccess(outcome)) {
      answers[key] = outcome.success
    } else if (outcome.failure.reason === "Refused") {
      refused.push(`"${key}"`)
    } else {
      firstUnanswered ??= outcome.failure
    }
  }
  if (refused.length > 0) {
    return Effect.fail(aiError(
      "decide",
      new AiError.ContentPolicyError({ description: `Provider refused to answer decisions ${refused.join(", ")}` })
    ))
  }
  if (firstUnanswered !== undefined) {
    return Effect.fail(aiError("decide", new AiError.InvalidOutputError({ description: firstUnanswered.description })))
  }
  return Effect.succeed(answers as Decision.Answers<Decisions>)
}

/**
 * Creates a `DecisionModel` that encodes inputs as JSON and validates provider answers.
 * Answers must cover every decision and use its labels. Distributions must
 * sum to 1 within `1e-6`, optional confidence must be in `[0, 1]`, and ratings must be
 * in `[0, criteria.length - 1]`. With `decide`, refused decisions fail with
 * `AiError.ContentPolicyError` and other unanswered decisions fail with
 * `AiError.InvalidOutputError`; `decideSettled` reports them per decision
 * instead. Encoding failures use `AiError.InvalidUserInputError`.
 *
 * **Details**
 *
 * Set `supportsImages: true` to accept images. Otherwise, nonempty image input
 * fails with `AiError.InvalidUserInputError`.
 *
 * Providers that round each probability to `probabilityPrecision` decimal
 * places may return distributions whose sum drifts from 1 by up to half a unit
 * of the last place per label. Setting `probabilityPrecision` accepts that
 * drift and rescales the distribution to sum to 1; larger drift still fails.
 *
 * @see {@link DecisionModel} for the service shape returned by this constructor
 * @see {@link ProviderOptions} for the input passed to the provider implementation
 * @see {@link ProviderResponse} for the provider response contract consumed by this constructor
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = (params: {
  readonly decide: (options: ProviderOptions) => Effect.Effect<ProviderResponse, AiError.AiError>
  readonly probabilityPrecision?: number | undefined
  readonly supportsImages?: boolean | undefined
}): Effect.Effect<DecisionModel> =>
  Effect.sync(() => {
    const roundingError = params.probabilityPrecision === undefined ? 0 : 0.5 * 10 ** -params.probabilityPrecision
    const settle = <Input extends Schema.Constraint, Decisions extends Record<string, Decision.Any>>(
      method: "decide" | "decideSettled",
      definition: Decision.Definition<Input, Decisions>,
      options: DecideOptions<Input>
    ): Effect.Effect<DecideSettledResponse<Decisions>, AiError.AiError, Input["EncodingServices"]> =>
      Schema.encodeEffect(Schema.toCodecJson(definition.input))(options.input).pipe(
        Effect.mapError((error) => aiError(method, new AiError.InvalidUserInputError({ description: error.message }))),
        Effect.flatMap((state) => {
          const images = options.images?.length ? options.images : undefined
          if (images !== undefined && params.supportsImages !== true) {
            return Effect.fail(
              aiError(
                method,
                new AiError.InvalidUserInputError({ description: "This decision model does not accept images" })
              )
            )
          }
          return params.decide({
            state,
            decisions: definition.decisions,
            ...(images === undefined ? undefined : { images })
          })
        }),
        Effect.map((response): DecideSettledResponse<Decisions> => ({
          outcomes: settleAnswers(definition.decisions, response.answers, roundingError),
          usage: new DecisionUsage({
            inputTokens: response.usage.inputTokens,
            outputTokens: response.usage.outputTokens
          }),
          ...(response.id === undefined ? undefined : { id: response.id }),
          ...(response.modelId === undefined ? undefined : { modelId: response.modelId }),
          metadata: response.metadata ?? {}
        }))
      )
    return DecisionModel.of({
      [TypeId]: TypeId,
      decide: (definition, options) =>
        settle("decide", definition, options).pipe(
          Effect.flatMap(({ outcomes, ...response }) =>
            Effect.map(requireAnswers(outcomes), (answers) => ({ answers, ...response }))
          ),
          (effect) => Effect.withSpan(effect, "DecisionModel.decide", { captureStackTrace: false })
        ),
      decideSettled: (definition, options) =>
        settle("decideSettled", definition, options).pipe(
          (effect) => Effect.withSpan(effect, "DecisionModel.decideSettled", { captureStackTrace: false })
        )
    })
  })

/**
 * Answers a decision definition using the current `DecisionModel` service.
 * Encodes the input with `Schema.toCodecJson`, requiring the schema's encoding services.
 * Explicit `undefined` fields become `null`; absent fields stay absent.
 * Custom declarations need a JSON codec annotation or encoding fails.
 * Returned answers and probability dictionaries have null prototypes.
 * Fails with `AiError.ContentPolicyError` if the provider refuses any decision,
 * and otherwise with `AiError.InvalidOutputError` for the first unanswered
 * decision in definition order.
 *
 * **Example** (Triaging a ticket)
 *
 * ```ts
 * import { Effect, Schema } from "effect"
 * import { Decision, DecisionModel } from "effect/ai"
 *
 * const TicketTriage = Decision.make({
 *   input: Schema.String,
 *   decisions: {
 *     urgent: Decision.probability({
 *       instructions: "The message is time-sensitive",
 *       criteria: { false: "No time pressure", true: "Needs action now" }
 *     })
 *   }
 * })
 *
 * const program = Effect.gen(function*() {
 *   const { answers, usage } = yield* DecisionModel.decide(TicketTriage, {
 *     input: "My card was charged twice, please fix this today"
 *   })
 *   return { probability: answers.urgent.probability, usage }
 * })
 * ```
 *
 * @see {@link DecisionModel} for the service this function requires
 * @see {@link decideSettled} for keeping valid answers when others fail
 *
 * @stability unstable
 * @category decisions
 * @since 4.0.0
 */
export const decide = <Input extends Schema.Constraint, Decisions extends Record<string, Decision.Any>>(
  definition: Decision.Definition<Input, Decisions>,
  options: DecideOptions<Input>
): Effect.Effect<DecideResponse<Decisions>, AiError.AiError, DecisionModel | Input["EncodingServices"]> =>
  DecisionModel.use((model) => model.decide(definition, options))

/**
 * Answers each decision with a `Result` containing a validated answer or a
 * `Decision.Unanswered` reason. Input encoding and provider failures still
 * fail the effect. Token usage covers the whole call.
 *
 * **Details**
 *
 * Provider response decoding errors fail the whole call. Per-decision reasons
 * reflect the first failed validation check; `"NoDistribution"` requires an
 * otherwise valid answer.
 *
 * **Example** (Falling back for unanswered decisions)
 *
 * ```ts
 * import { Effect, Result, Schema } from "effect"
 * import { Decision, DecisionModel } from "effect/ai"
 *
 * const TicketTriage = Decision.make({
 *   input: Schema.String,
 *   decisions: {
 *     department: Decision.classify({
 *       instructions: "Which team should handle this",
 *       criteria: { billing: "payments", technical: "bugs" }
 *     }),
 *     urgent: Decision.probability({ instructions: "The message is time-sensitive" })
 *   }
 * })
 *
 * const program = Effect.gen(function*() {
 *   const { outcomes } = yield* DecisionModel.decideSettled(TicketTriage, {
 *     input: "My card was charged twice, please fix this today"
 *   })
 *   const department = Result.isSuccess(outcomes.department) &&
 *       outcomes.department.success.probabilities.billing >= 0.8
 *     ? "billing"
 *     : "needs review"
 *   const urgent = Result.isSuccess(outcomes.urgent) ? outcomes.urgent.success.probability : undefined
 *   return { department, urgent }
 * })
 * ```
 *
 * @see {@link decide} for failing unless every decision is answered
 *
 * @stability unstable
 * @category decisions
 * @since 4.0.6
 */
export const decideSettled = <Input extends Schema.Constraint, Decisions extends Record<string, Decision.Any>>(
  definition: Decision.Definition<Input, Decisions>,
  options: DecideOptions<Input>
): Effect.Effect<DecideSettledResponse<Decisions>, AiError.AiError, DecisionModel | Input["EncodingServices"]> =>
  DecisionModel.use((model) => model.decideSettled(definition, options))
