/**
 * OpenAI implementation of DecisionModel over the Decisions API.
 *
 * @stability unstable
 * @since 4.0.5
 */
import * as AiError from "effect/ai/AiError"
import * as DecisionModel from "effect/ai/DecisionModel"
import * as AiModel from "effect/ai/Model"
import * as Effect from "effect/Effect"
import * as Base64 from "effect/encoding/Base64"
import * as Layer from "effect/Layer"
import { OpenAiClient } from "./OpenAiClient.ts"
import type * as OpenAiSchema from "./OpenAiSchema.ts"

/**
 * OpenAI decision model identifiers.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export type Model = "gpt-6-luna" | (string & {})

/**
 * Creates a decision model with OpenAI provider metadata.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.5
 */
export const model = (
  model: Model
): AiModel.Model<"openai", DecisionModel.DecisionModel, OpenAiClient> => AiModel.make("openai", model, layer({ model }))

/**
 * Builds a decision service with tolerance for two-decimal probability rounding.
 *
 * **Details**
 *
 * String state is sent as `input` unchanged, and other state is sent as JSON.
 * With images, `input` becomes one user message with the state as text
 * followed by the images. Byte arrays and base64 strings are sent as `data:`
 * URLs, and `data:` URLs are sent unchanged.
 *
 * Probability criteria are appended to the question instructions, and each
 * rating criterion is sent as both the label and the description of a score
 * level.
 *
 * **Gotchas**
 *
 * - Remote URLs fail with `AiError.InvalidUserInputError` because OpenAI only
 *   accepts inline images.
 * - If OpenAI refuses any decision, the whole call fails with
 *   `AiError.ContentPolicyError`. The refused names are in
 *   `metadata.openai.refusedDecisions`.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.5
 */
export const make = Effect.fnUntraced(
  function*(
    options: { readonly model: Model }
  ): Effect.fn.Return<DecisionModel.DecisionModel, never, OpenAiClient> {
    const client = yield* OpenAiClient
    return yield* DecisionModel.make({
      probabilityPrecision: 2,
      supportsImages: true,
      decide: Effect.fnUntraced(function*({ state, decisions, images }) {
        const questions: Array<typeof OpenAiSchema.DecisionQuestion.Encoded> = []
        for (const [name, decision] of Object.entries(decisions)) {
          switch (decision._tag) {
            case "Classify":
              questions.push({
                type: "choice",
                name,
                instructions: decision.instructions,
                choices: Object.entries(decision.criteria).map(([value, description]) => ({ value, description }))
              })
              break
            case "Rate":
              questions.push({
                type: "score",
                name,
                instructions: decision.instructions,
                levels: decision.criteria.map((label) => ({ label, description: label }))
              })
              break
            case "Probability":
              questions.push({
                type: "predicate",
                name,
                instructions: decision.criteria === undefined
                  ? decision.instructions
                  : `${decision.instructions}\n\nfalse: ${decision.criteria.false}\ntrue: ${decision.criteria.true}`
              })
              break
          }
        }
        if (images?.some((image) => image.data instanceof URL && image.data.protocol !== "data:")) {
          return yield* Effect.fail(AiError.make({
            module: "OpenAiDecisionModel",
            method: "decide",
            reason: new AiError.InvalidUserInputError({
              description: "OpenAI decisions accept base64 or data URL images, not remote URLs"
            })
          }))
        }
        const text = typeof state === "string" ? state : JSON.stringify(state)
        const response = yield* client.createDecisions({
          model: options.model,
          input: images === undefined ? text : [{
            role: "user",
            content: [
              { type: "input_text", text },
              ...images.map((image) => ({ type: "input_image" as const, image_url: encodeImage(image) }))
            ]
          }],
          questions
        })
        const refused = response.answers.filter((answer) => answer.type === "refusal").map((answer) => answer.name)
        if (refused.length > 0) {
          return yield* Effect.fail(AiError.make({
            module: "OpenAiDecisionModel",
            method: "decide",
            reason: new AiError.ContentPolicyError({
              description: `OpenAI refused to answer: ${refused.join(", ")}`,
              metadata: { openai: { errorCode: null, errorType: null, requestId: null, refusedDecisions: refused } }
            })
          }))
        }
        const answers: Record<string, DecisionModel.ProviderAnswer> = Object.create(null)
        for (const [name, decision] of Object.entries(decisions)) {
          const answer = response.answers.find((answer) => answer.name === name)
          switch (answer?.type) {
            case "choice": {
              const probabilities: Record<string, number> = Object.create(null)
              for (const { value, probability } of answer.probabilities) probabilities[value] = probability
              answers[name] = { _tag: "Classify", label: answer.choice, probabilities, confidence: answer.confidence }
              break
            }
            case "score": {
              const levels = decision._tag === "Rate" ? decision.criteria : []
              const probabilities: Record<string, number> = Object.create(null)
              for (const { value, probability } of answer.probabilities) {
                const level = levels[value]
                if (level !== undefined) probabilities[level] = probability
              }
              answers[name] = { _tag: "Rate", rating: answer.score, probabilities, confidence: answer.confidence }
              break
            }
            case "predicate":
              answers[name] = { _tag: "Probability", probability: answer.probability }
              break
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

const encodeImage = (image: DecisionModel.Image): string =>
  image.data instanceof URL
    ? image.data.href
    : `data:${image.mediaType};base64,${typeof image.data === "string" ? image.data : Base64.encode(image.data)}`

/**
 * Provides DecisionModel using an existing OpenAiClient.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.5
 */
export const layer = (
  options: { readonly model: Model }
): Layer.Layer<DecisionModel.DecisionModel, never, OpenAiClient> =>
  Layer.effect(DecisionModel.DecisionModel, make(options))
