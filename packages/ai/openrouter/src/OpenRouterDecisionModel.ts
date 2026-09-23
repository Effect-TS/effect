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

/**
 * Creates a decision service that requires full choice and score distributions.
 * Distributions within the rounding error of two decimal places per outcome are
 * normalized to sum to 1.
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
        const decision = decisions[key]
        if (answer.type === "choice") {
          answers[key] = {
            _tag: "Classify",
            label: answer.choice,
            probabilities: decision?._tag === "Classify"
              ? normalizeProbabilities(answer.probabilities, Object.keys(decision.criteria))
              : answer.probabilities,
            confidence: answer.confidence
          }
        } else {
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
            probabilities: normalizeProbabilities(probabilities, decision?._tag === "Rate" ? decision.criteria : []),
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

const normalizeProbabilities = (
  probabilities: Readonly<Record<string, number>>,
  labels: ReadonlyArray<string>
): Readonly<Record<string, number>> => {
  let total = 0
  for (const label of labels) {
    const value = probabilities[label]
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      return probabilities
    }
    total += value
  }
  const difference = Math.abs(total - 1)
  // Allow half a hundredth per outcome for provider rounding, plus floating-point tolerance.
  if (total === 0 || difference <= 1e-6 || difference > 0.005 * labels.length + 1e-6) {
    return probabilities
  }
  const normalized: Record<string, number> = Object.create(null)
  for (const label of labels) {
    normalized[label] = probabilities[label] / total
  }
  return normalized
}

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
