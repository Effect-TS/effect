/**
 * Codecs for text and JSON decisions from Cloudflare Clef models.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Schema from "effect/Schema"

/**
 * A classification question.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export const ChoiceQuestion = Schema.Struct({
  type: Schema.Literal("choice"),
  instructions: Schema.String,
  criteria: Schema.Record(Schema.String, Schema.String)
})

/**
 * An ordered rating question.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export const ScoreQuestion = Schema.Struct({
  type: Schema.Literal("score"),
  instructions: Schema.String,
  criteria: Schema.Array(Schema.String)
})

/**
 * A probability question.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export const NoulQuestion = Schema.Struct({
  type: Schema.Literal("noul"),
  instructions: Schema.String,
  criteria: Schema.optional(Schema.Struct({ false: Schema.String, true: Schema.String }))
})

/**
 * A Clef classification, rating, or probability question.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export const Question = Schema.Union([ChoiceQuestion, ScoreQuestion, NoulQuestion])

/**
 * An image as base64 data with its media type.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.5
 */
export const Base64Image = Schema.Struct({
  content_type: Schema.Union([
    Schema.Literals(["image/png", "image/jpeg", "image/webp"]),
    Schema.StringForLiteralAutocomplete
  ]),
  base64: Schema.String
})

/**
 * An image as a base64 data URL or base64 data with its media type.
 * Clef accepts PNG, JPEG, and WebP images and rejects remote URLs.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.5
 */
export const Image = Schema.Union([Schema.String, Base64Image])

/**
 * A batch of questions about text or JSON state, with optional images shown
 * to the model before the state.
 *
 * **Details**
 *
 * Clef accepts up to 4 images of at most 4 MiB and 16 megapixels each, 8 MiB
 * of decoded images in total, and 13 MiB per request body.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export const DecisionsRequest = Schema.Struct({
  model: Schema.Union([Schema.Literals(["clef", "clef-flash"]), Schema.StringForLiteralAutocomplete]),
  state: Schema.Json,
  questions: Schema.Record(Schema.String, Question),
  images: Schema.optional(Schema.Array(Image))
})

/**
 * A classification distribution.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export const ChoiceAnswer = Schema.Struct({
  type: Schema.Literal("choice"),
  choice: Schema.String,
  probabilities: Schema.Record(Schema.String, Schema.Number),
  confidence: Schema.Number
})

/**
 * A zero-based rating and index-keyed distribution.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export const ScoreAnswer = Schema.Struct({
  type: Schema.Literal("score"),
  score: Schema.Number,
  probabilities: Schema.Record(Schema.String, Schema.Number),
  confidence: Schema.Number,
  legend: Schema.Record(Schema.String, Schema.String)
})

/**
 * A Bernoulli probability.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export const NoulAnswer = Schema.Struct({ type: Schema.Literal("noul"), noul: Schema.Number })

/**
 * A Clef classification, rating, or probability answer.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export const Answer = Schema.Union([ChoiceAnswer, ScoreAnswer, NoulAnswer])

/**
 * Answers and token usage for a batch.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export const DecisionsResponse = Schema.Struct({
  model: Schema.String,
  answers: Schema.Record(Schema.String, Answer),
  usage: Schema.Struct({
    input_tokens: Schema.Int,
    output_tokens: Schema.Int
  })
})
