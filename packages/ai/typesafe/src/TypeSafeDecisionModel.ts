/**
 * TypeSafe's System One implementation of DecisionModel.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as AiError from "effect/ai/AiError"
import * as DecisionModel from "effect/ai/DecisionModel"
import * as AiModel from "effect/ai/Model"
import * as Effect from "effect/Effect"
import * as Base64 from "effect/encoding/Base64"
import * as Layer from "effect/Layer"
import type * as Schema from "effect/Schema"
import { TypeSafeClient } from "./TypeSafeClient.ts"
import type * as TypeSafeSchema from "./TypeSafeSchema.ts"

/**
 * Known TypeSafe model identifiers. Constructors also accept custom identifiers.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Model = "jev-latest" | "jev-preview" | "jev-1.13.0" | "jev-1.14.0"

/**
 * Creates a decision model with TypeSafe provider metadata.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const model = (
  model: Model | (string & {})
): AiModel.Model<"typesafe", DecisionModel.DecisionModel, TypeSafeClient> =>
  AiModel.make("typesafe", model, layer({ model }))

/**
 * Builds a decision service. Probabilities arrive rounded to two decimals, so
 * DecisionModel rescales small sum drift when it validates distributions and
 * derives rating labels.
 *
 * **Details**
 *
 * With images, `state` becomes `{ input, images }`: the encoded input, and one
 * placeholder per image in order. Instructions can name an image by path,
 * such as `` `images[0]` ``, and input fields as `` `input.subject` ``. Each
 * image is sent once as a base64 asset, and the request opts in to
 * TypeSafe's preview image support. Locate decisions become Box questions,
 * which need Jev 1.14 (`"jev-preview"` or `"jev-1.14.0"`).
 *
 * **Gotchas**
 *
 * - Images must be PNG or JPEG, 256 to 1568 pixels on each side. The API
 *   rejects other sizes rather than resizing, and ignores EXIF orientation.
 * - Remote URLs fail with `AiError.InvalidUserInputError` because TypeSafe
 *   does not fetch them.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(
  function*(
    options: { readonly model: Model | (string & {}) }
  ): Effect.fn.Return<DecisionModel.DecisionModel, never, TypeSafeClient> {
    const client = yield* TypeSafeClient
    return yield* DecisionModel.make({
      probabilityPrecision: 2,
      supportsImages: true,
      supportsLocate: true,
      decide: Effect.fnUntraced(function*({ state, decisions, images }) {
        const questions: Record<string, typeof TypeSafeSchema.Question.Encoded> = Object.create(null)
        for (const [key, decision] of Object.entries(decisions)) {
          switch (decision._tag) {
            case "Classify":
              questions[key] = { type: "choice", instructions: decision.instructions, criteria: decision.criteria }
              break
            case "Rate":
              questions[key] = {
                type: "score",
                instructions: decision.instructions,
                criteria: decision.criteria.map((level) => level.description)
              }
              break
            case "Probability":
              questions[key] = { type: "noul", instructions: decision.instructions, criteria: decision.criteria }
              break
            case "Locate":
              questions[key] = { type: "box", instructions: decision.instructions }
              break
          }
        }
        const response = yield* client.systemOne(
          images === undefined
            ? { model: options.model, state, questions }
            : { model: options.model, ...yield* withImages(state, questions, images) }
        )
        const answers: Record<string, DecisionModel.ProviderAnswer> = Object.create(null)
        for (const [key, decision] of Object.entries(decisions)) {
          const answer = response.answers[key]
          switch (answer?.type) {
            case "choice":
              answers[key] = {
                _tag: "Classify",
                label: answer.choice,
                probabilities: answer.probabilities,
                confidence: answer.confidence
              }
              break
            case "score": {
              const levels = decision._tag === "Rate" ? decision.criteria : []
              const probabilities: Record<string, number> = Object.create(null)
              for (let index = 0; index < levels.length; index++) {
                const probability = answer.probabilities[String(index)]
                if (probability !== undefined) probabilities[levels[index].label] = probability
              }
              answers[key] = { _tag: "Rate", rating: answer.score, probabilities, confidence: answer.confidence }
              break
            }
            case "noul":
              answers[key] = { _tag: "Probability", probability: answer.noul }
              break
            case "box":
              answers[key] = { _tag: "Locate", box: answer.box, confidence: answer.confidence }
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

const withImages = (
  state: Schema.Json,
  questions: Record<string, typeof TypeSafeSchema.Question.Encoded>,
  images: ReadonlyArray<DecisionModel.Image>
) =>
  Effect.map(Effect.forEach(images, encodeImage), (assets) => {
    const placeholders = makePlaceholders(assets.length, JSON.stringify({ state, questions }))
    return {
      state: { input: state, images: placeholders },
      questions,
      assets: Object.fromEntries(placeholders.map((placeholder, index) => [placeholder, assets[index]]))
    }
  })

// TypeSafe swaps every occurrence of a placeholder in the request's strings for its image, so each placeholder
// must be absent from the rest of the request. The closing `>` keeps `<image:1>` from matching inside `<image:10>`.
const makePlaceholders = (count: number, request: string): Array<string> => {
  for (let attempt = 0;; attempt++) {
    const prefix = attempt === 0 ? "<image:" : `<image~${attempt}:`
    const placeholders = Array.from({ length: count }, (_, index) => `${prefix}${index}>`)
    if (placeholders.every((placeholder) => !request.includes(placeholder))) {
      return placeholders
    }
  }
}

const encodeImage = (
  image: DecisionModel.Image
): Effect.Effect<typeof TypeSafeSchema.ImageAsset.Encoded, AiError.AiError> => {
  let mediaType = image.mediaType
  let data: string
  if (image.data instanceof URL) {
    const match = image.data.protocol === "data:"
      ? /^data:([^,;]*)[^,]*;base64,(.*)$/si.exec(image.data.href.split("#", 1)[0])
      : null
    if (match === null) {
      return invalidUserInput("TypeSafe accepts byte arrays, base64 strings, or base64 data URLs, not remote URLs")
    }
    mediaType = match[1] || mediaType
    try {
      data = decodeURIComponent(match[2])
    } catch {
      return invalidUserInput("TypeSafe image data URLs must contain valid percent-encoding")
    }
  } else {
    data = typeof image.data === "string" ? image.data : Base64.encode(image.data)
  }
  switch (mediaType.toLowerCase()) {
    case "image/png":
      return Effect.succeed({ type: "image", format: "png", data_base64: data })
    case "image/jpeg":
    case "image/jpg":
      return Effect.succeed({ type: "image", format: "jpg", data_base64: data })
    default:
      return invalidUserInput(`TypeSafe accepts PNG or JPEG images, not ${mediaType}`)
  }
}

const invalidUserInput = (description: string) =>
  Effect.fail(AiError.make({
    module: "TypeSafeDecisionModel",
    method: "decide",
    reason: new AiError.InvalidUserInputError({ description })
  }))

/**
 * Provides DecisionModel using an existing TypeSafeClient.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer = (
  options: { readonly model: Model | (string & {}) }
): Layer.Layer<DecisionModel.DecisionModel, never, TypeSafeClient> =>
  Layer.effect(DecisionModel.DecisionModel, make(options))
