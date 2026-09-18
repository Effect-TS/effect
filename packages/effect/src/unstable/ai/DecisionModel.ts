/**
 * Defines the provider-neutral service for structured decisions.
 *
 * A `DecisionModel` answers a fixed set of decisions about one input in a
 * single provider call. Decisions are declared ahead of time with `Decision`
 * and answered with `decide`, which encodes the input through its schema,
 * hands the encoded value and the decisions to the provider, validates the
 * provider's answers against the definition, and represents failures as
 * `AiError` values. This module includes the service, usage metadata, the
 * provider contract, and a constructor that adapts a provider implementation
 * into the service.
 *
 * @see {@link make} for constructing a decision model service from a provider
 *
 * @since 4.0.0
 */
import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"
import * as Schema from "../../Schema.ts"
import * as AiError from "./AiError.ts"
import type * as Decision from "./Decision.ts"

/**
 * Service key for answering decisions about an input.
 *
 * @see {@link make} for constructing a decision model service from a provider
 * @see {@link decide} for answering a definition through the current service
 *
 * @category services
 * @since 4.0.0
 */
export const DecisionModel: Context.Service<DecisionModel, DecisionModel> = Context.Service(
  "effect/unstable/ai/DecisionModel"
)

/**
 * Brand type for `DecisionModel`.
 *
 * @category type IDs
 * @since 4.0.0
 */
export type TypeId = "~effect/ai/DecisionModel"

/**
 * Brand for `DecisionModel` implementations.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId: TypeId = "~effect/ai/DecisionModel"

/**
 * Represents token usage metadata for decision operations.
 *
 * **Details**
 *
 * Contains optional provider-reported `inputTokens` and `outputTokens`. Either
 * value may be `undefined` when the provider does not report it.
 *
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
 * @category options
 * @since 4.0.0
 */
export interface DecideOptions<Input extends Schema.Constraint> {
  readonly input: Input["Type"]
}

/**
 * Answers for every decision in a definition together with usage metadata.
 *
 * @see {@link DecisionUsage} for token usage metadata
 *
 * @category models
 * @since 4.0.0
 */
export interface DecideResponse<Decisions extends Record<string, Decision.Any>> {
  readonly answers: Decision.Answers<Decisions>
  readonly usage: DecisionUsage
}

/**
 * Provider input options for a decision request.
 *
 * **Details**
 *
 * `state` is the input encoded through the definition's schema, passed as is.
 * `decisions` is the definition's decision map, so every decision is answered
 * in one call.
 *
 * @category options
 * @since 4.0.0
 */
export interface ProviderOptions {
  readonly state: unknown
  readonly decisions: Record<string, Decision.Any>
}

/**
 * Provider answer for a classify decision.
 *
 * @category models
 * @since 4.0.0
 */
export interface ProviderClassifyAnswer {
  readonly label: string
  readonly probabilities: Readonly<Record<string, number>>
  readonly confidence: number
}

/**
 * Provider answer for a rate decision.
 *
 * @category models
 * @since 4.0.0
 */
export interface ProviderRateAnswer {
  readonly rating: number
  readonly label: string
  readonly probabilities: Readonly<Record<string, number>>
  readonly confidence: number
}

/**
 * Provider answer for a probability decision.
 *
 * @category models
 * @since 4.0.0
 */
export interface ProviderProbabilityAnswer {
  readonly probability: number
}

/**
 * Provider answer for any decision kind.
 *
 * @category models
 * @since 4.0.0
 */
export type ProviderAnswer = ProviderClassifyAnswer | ProviderRateAnswer | ProviderProbabilityAnswer

/**
 * Provider response for a decision request.
 *
 * **Details**
 *
 * `answers` is keyed like the requested decisions. Each answer is validated
 * against its decision before it is returned to the caller.
 *
 * @category models
 * @since 4.0.0
 */
export interface ProviderResponse {
  readonly answers: Readonly<Record<string, ProviderAnswer>>
  readonly usage: {
    readonly inputTokens: number | undefined
    readonly outputTokens: number | undefined
  }
}

/**
 * Decision operations over a definition.
 *
 * @category models
 * @since 4.0.0
 */
export interface DecisionModel {
  readonly [TypeId]: TypeId
  readonly decide: <Input extends Schema.Constraint, Decisions extends Record<string, Decision.Any>>(
    definition: Decision.Definition<Input, Decisions>,
    options: DecideOptions<Input>
  ) => Effect.Effect<DecideResponse<Decisions>, AiError.AiError, Input["EncodingServices"]>
}

const invalidOutput = (description: string): AiError.AiError =>
  AiError.make({
    module: "DecisionModel",
    method: "decide",
    reason: new AiError.InvalidOutputError({ description })
  })

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)

const isUnitInterval = (value: unknown): value is number => isFiniteNumber(value) && value >= 0 && value <= 1

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null

const validateDistribution = (
  key: string,
  labels: ReadonlyArray<string>,
  answer: Record<string, unknown>
): Record<string, number> | AiError.AiError => {
  const raw = answer.probabilities
  if (!isObject(raw)) {
    return invalidOutput(`Provider returned no probabilities for decision "${key}"`)
  }
  const probabilities: Record<string, number> = {}
  for (const label of labels) {
    const value = raw[label]
    if (!isUnitInterval(value)) {
      return invalidOutput(`Provider returned no probability for label "${label}" of decision "${key}"`)
    }
    probabilities[label] = value
  }
  return probabilities
}

const validateAnswer = (
  key: string,
  decision: Decision.Any,
  answer: unknown
): Decision.Answer<Decision.Any> | AiError.AiError => {
  if (!isObject(answer)) {
    return invalidOutput(`Provider returned no answer for decision "${key}"`)
  }
  switch (decision._tag) {
    case "Classify": {
      const labels = Object.keys(decision.criteria)
      if (typeof answer.label !== "string" || !labels.includes(answer.label)) {
        return invalidOutput(`Provider returned an unknown label for decision "${key}"`)
      }
      if (!isFiniteNumber(answer.confidence)) {
        return invalidOutput(`Provider returned no confidence for decision "${key}"`)
      }
      const probabilities = validateDistribution(key, labels, answer)
      if (AiError.isAiError(probabilities)) {
        return probabilities
      }
      return { label: answer.label, probabilities, confidence: answer.confidence }
    }
    case "Rate": {
      const levels = decision.criteria
      if (!isFiniteNumber(answer.rating)) {
        return invalidOutput(`Provider returned no rating for decision "${key}"`)
      }
      if (typeof answer.label !== "string" || !levels.includes(answer.label)) {
        return invalidOutput(`Provider returned an unknown label for decision "${key}"`)
      }
      if (!isFiniteNumber(answer.confidence)) {
        return invalidOutput(`Provider returned no confidence for decision "${key}"`)
      }
      const probabilities = validateDistribution(key, levels, answer)
      if (AiError.isAiError(probabilities)) {
        return probabilities
      }
      return { rating: answer.rating, label: answer.label, probabilities, confidence: answer.confidence }
    }
    case "Probability": {
      if (!isUnitInterval(answer.probability)) {
        return invalidOutput(`Provider returned a probability outside [0, 1] for decision "${key}"`)
      }
      return { probability: answer.probability }
    }
  }
}

const validateAnswers = <Decisions extends Record<string, Decision.Any>>(
  decisions: Decisions,
  answers: Readonly<Record<string, ProviderAnswer>>
): Effect.Effect<Decision.Answers<Decisions>, AiError.AiError> => {
  const validated: Record<string, Decision.Answer<Decision.Any>> = {}
  for (const key of Object.keys(decisions)) {
    const answer = validateAnswer(key, decisions[key], answers[key])
    if (AiError.isAiError(answer)) {
      return Effect.fail(answer)
    }
    validated[key] = answer
  }
  return Effect.succeed(validated as Decision.Answers<Decisions>)
}

/**
 * Creates a DecisionModel service from a provider decide implementation.
 *
 * **When to use**
 *
 * Use to adapt a provider that answers a batch of decisions about an encoded
 * input into a `DecisionModel`.
 *
 * **Details**
 *
 * The returned service encodes the input through the definition's schema,
 * passes the encoded value and the decision map to the provider in one call,
 * and validates every answer against its decision before returning it.
 *
 * **Gotchas**
 *
 * Provider answers must cover every decision and use the definition's labels.
 * A missing answer, an unknown label, an incomplete distribution, or a
 * probability outside `[0, 1]` fails with `AiError.InvalidOutputError`. Input
 * encoding failures fail with `AiError.InvalidUserInputError`.
 *
 * @see {@link DecisionModel} for the service shape returned by this constructor
 * @see {@link ProviderOptions} for the input passed to the provider implementation
 * @see {@link ProviderResponse} for the provider response contract consumed by this constructor
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = (params: {
  readonly decide: (options: ProviderOptions) => Effect.Effect<ProviderResponse, AiError.AiError>
}): Effect.Effect<DecisionModel> =>
  Effect.sync(() =>
    DecisionModel.of({
      [TypeId]: TypeId,
      decide: <Input extends Schema.Constraint, Decisions extends Record<string, Decision.Any>>(
        definition: Decision.Definition<Input, Decisions>,
        options: DecideOptions<Input>
      ): Effect.Effect<DecideResponse<Decisions>, AiError.AiError, Input["EncodingServices"]> =>
        Schema.encodeEffect(definition.input)(options.input).pipe(
          Effect.mapError((error) =>
            AiError.make({
              module: "DecisionModel",
              method: "decide",
              reason: new AiError.InvalidUserInputError({ description: error.message })
            })
          ),
          Effect.flatMap((state) => params.decide({ state, decisions: definition.decisions })),
          Effect.flatMap((response) =>
            Effect.map(
              validateAnswers(definition.decisions, response.answers),
              (answers): DecideResponse<Decisions> => ({
                answers,
                usage: new DecisionUsage({
                  inputTokens: response.usage.inputTokens,
                  outputTokens: response.usage.outputTokens
                })
              })
            )
          ),
          Effect.withSpan("DecisionModel.decide")
        )
    })
  )

/**
 * Answers a decision definition using the current `DecisionModel` service.
 *
 * **Details**
 *
 * The input is encoded through the definition's schema, so any encoding
 * services the schema needs are part of the requirements.
 *
 * **Example** (Triaging a ticket)
 *
 * ```ts
 * import { Effect, Schema } from "effect"
 * import { Decision, DecisionModel } from "effect/unstable/ai"
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
 *
 * @category decisions
 * @since 4.0.0
 */
export const decide = <Input extends Schema.Constraint, Decisions extends Record<string, Decision.Any>>(
  definition: Decision.Definition<Input, Decisions>,
  options: DecideOptions<Input>
): Effect.Effect<DecideResponse<Decisions>, AiError.AiError, DecisionModel | Input["EncodingServices"]> =>
  Effect.flatMap(Effect.service(DecisionModel), (model) => model.decide(definition, options))
