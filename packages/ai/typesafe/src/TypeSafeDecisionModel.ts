/**
 * TypeSafe's System One implementation of DecisionModel.
 *
 * @since 4.0.0
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as AiError from "effect/unstable/ai/AiError"
import * as DecisionModel from "effect/unstable/ai/DecisionModel"
import * as AiModel from "effect/unstable/ai/Model"
import { TypeSafeClient } from "./TypeSafeClient.ts"
import type * as TypeSafeSchema from "./TypeSafeSchema.ts"

/**
 * Known TypeSafe model identifiers. Constructors also accept custom identifiers.
 *
 * @category models
 * @since 4.0.0
 */
export type Model = "jev-latest" | "jev-preview" | "jev-1.13.0"

/**
 * Creates a decision model with TypeSafe provider metadata.
 *
 * @category constructors
 * @since 4.0.0
 */
export const model = (
  model: Model | (string & {})
): AiModel.Model<"typesafe", DecisionModel.DecisionModel, TypeSafeClient> =>
  AiModel.make("typesafe", model, layer({ model }))

/**
 * Builds a decision service. Provider values are preserved without normalization;
 * DecisionModel validates distributions and derives rating labels.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(
  function*(
    options: { readonly model: Model | (string & {}) }
  ): Effect.fn.Return<DecisionModel.DecisionModel, never, TypeSafeClient> {
    const client = yield* TypeSafeClient
    return yield* DecisionModel.make({
      decide: Effect.fnUntraced(function*({ state, decisions }) {
        const questions: Record<string, typeof TypeSafeSchema.Question.Encoded> = Object.create(null)
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
        const response = yield* client.systemOne({ model: options.model, state, questions })
        const answers: Record<string, DecisionModel.ProviderAnswer> = Object.create(null)
        for (const [key, decision] of Object.entries(decisions)) {
          const answer = Object.hasOwn(response.answers, key) ? response.answers[key] : undefined
          if (decision._tag === "Classify" && answer?.type === "choice") {
            answers[key] = { label: answer.choice, probabilities: answer.probabilities, confidence: answer.confidence }
          } else if (decision._tag === "Rate" && answer?.type === "score") {
            const probabilities: Record<string, number> = Object.create(null)
            for (let index = 0; index < decision.criteria.length; index++) {
              const probability = answer.probabilities[String(index)]
              if (probability === undefined) return yield* invalidOutput(key)
              probabilities[decision.criteria[index]] = probability
            }
            answers[key] = { rating: answer.score, probabilities, confidence: answer.confidence }
          } else if (decision._tag === "Probability" && answer?.type === "noul") {
            answers[key] = { probability: answer.noul }
          } else {
            return yield* invalidOutput(key)
          }
        }
        return {
          answers,
          usage: { inputTokens: response.usage?.input_tokens, outputTokens: response.usage?.output_tokens }
        }
      })
    })
  }
)

/**
 * Provides DecisionModel using an existing TypeSafeClient.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (
  options: { readonly model: Model | (string & {}) }
): Layer.Layer<DecisionModel.DecisionModel, never, TypeSafeClient> =>
  Layer.effect(DecisionModel.DecisionModel, make(options))

const invalidOutput = (key: string) =>
  AiError.make({
    module: "TypeSafeDecisionModel",
    method: "decide",
    reason: new AiError.InvalidOutputError({
      description: "Missing or mismatched answer for decision " + JSON.stringify(key)
    })
  })
