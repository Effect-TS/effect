/**
 * Decision models backed by OpenRouter's alpha Decisions API.
 *
 * @since 4.0.0
 */
import * as AiError from "effect/ai/AiError"
import * as DecisionModel from "effect/ai/DecisionModel"
import * as Model from "effect/ai/Model"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { OpenRouterClient } from "./OpenRouterClient.ts"
import type * as OpenRouterSchema from "./OpenRouterSchema.ts"

/**
 * Request options that override model defaults at call time.
 *
 * @category services
 * @since 4.0.0
 */
export class Config extends Context.Service<
  Config,
  Pick<
    typeof OpenRouterSchema.DecisionsRequest.Encoded,
    "provider" | "session_id" | "user" | "trace"
  >
>()("@effect/ai-openrouter/OpenRouterDecisionModel/Config") {}

/**
 * Creates an OpenRouter model descriptor with decision support.
 *
 * @category constructors
 * @since 4.0.0
 */
export const model = (
  model: string,
  config?: typeof Config.Service
): Model.Model<"openrouter", DecisionModel.DecisionModel, OpenRouterClient> =>
  Model.make("openrouter", model, layer({ model, config }))

// The Decisions API can round each probability independently (e.g. three
// two-decimal values totaling 0.99). Only correct discrepancies small enough
// to be explained by rounding; leave invalid distributions for DecisionModel
// to reject rather than turning arbitrary weights into probabilities.
const normalizeRoundedProbabilities = (probabilities: Record<string, number>): Record<string, number> => {
  const values = Object.values(probabilities)
  if (values.length === 0 || values.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) {
    return probabilities
  }
  const total = values.reduce((sum, value) => sum + value, 0)
  const drift = Math.abs(total - 1)
  if (total === 0 || drift <= 1e-6 || drift > Math.min(values.length * 0.005, 0.02) + 1e-12) {
    return probabilities
  }
  const normalized: Record<string, number> = Object.create(null)
  for (const [label, value] of Object.entries(probabilities)) {
    normalized[label] = value / total
  }
  return normalized
}

/**
 * Creates a decision service that requires full choice and score distributions.
 * Score indices map to criteria labels; cost, id, and provider metadata are omitted.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*(options: {
  readonly model: string
  readonly config?: typeof Config.Service | undefined
}): Effect.fn.Return<DecisionModel.DecisionModel, never, OpenRouterClient> {
  const client = yield* OpenRouterClient
  const config = Effect.contextWith((services: Context.Context<never>) =>
    Effect.succeed({ ...options.config, ...Context.getOrUndefined(services, Config) })
  )
  return yield* DecisionModel.make({
    decide: Effect.fnUntraced(function*({ state, decisions }) {
      if (state === null || typeof state === "number" || typeof state === "boolean") {
        return yield* AiError.make({
          module: "OpenRouterDecisionModel",
          method: "decide",
          reason: new AiError.InvalidUserInputError({
            description: "OpenRouter decision state must be a string, object, or array"
          })
        })
      }
      const questions: Record<string, typeof OpenRouterSchema.DecisionsQuestion.Encoded> = Object.create(null)
      for (const [key, decision] of Object.entries(decisions)) {
        switch (decision._tag) {
          case "Classify":
            questions[key] = { type: "choice", instructions: decision.instructions, criteria: decision.criteria }
            break
          case "Rate":
            questions[key] = { type: "score", instructions: decision.instructions, criteria: decision.criteria }
            break
          case "Probability":
            questions[key] = { type: "noul", instructions: decision.instructions, criteria: decision.criteria }
            break
        }
      }
      const [response] = yield* client.createDecisions({ ...yield* config, model: options.model, state, questions })
      const answers: Record<string, DecisionModel.ProviderAnswer> = Object.create(null)
      for (const [key, answer] of Object.entries(response.answers)) {
        if (answer.type === "noul") {
          answers[key] = { _tag: "Probability", probability: answer.noul }
          continue
        }
        if (answer.probabilities === undefined) {
          return yield* AiError.make({
            module: "OpenRouterDecisionModel",
            method: "decide",
            reason: new AiError.InvalidOutputError({
              description: `Provider returned no probabilities for decision "${key}"`
            })
          })
        }
        if (answer.type === "choice") {
          answers[key] = {
            _tag: "Classify",
            label: answer.choice,
            probabilities: normalizeRoundedProbabilities(answer.probabilities),
            confidence: answer.confidence
          }
        } else {
          const decision = decisions[key]
          const probabilities: Record<string, number> = Object.create(null)
          if (decision?._tag === "Rate") {
            for (const [index, label] of decision.criteria.entries()) {
              const probability = answer.probabilities[String(index)]
              if (probability !== undefined) {
                probabilities[label] = probability
              }
            }
          }
          answers[key] = {
            _tag: "Rate",
            rating: answer.score,
            probabilities: normalizeRoundedProbabilities(probabilities),
            confidence: answer.confidence
          }
        }
      }
      return {
        answers,
        usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }
      }
    })
  })
})

/**
 * Provides a decision model using the OpenRouter client service.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (options: {
  readonly model: string
  readonly config?: typeof Config.Service | undefined
}): Layer.Layer<DecisionModel.DecisionModel, never, OpenRouterClient> =>
  Layer.effect(DecisionModel.DecisionModel, make(options))
