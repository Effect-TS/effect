/**
 * Codecs for Cloudflare Clef decisions and Clairic extractions.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Schema from "effect/Schema"

const Entry = Schema.Union([Schema.String, Schema.JsonObject, Schema.Array(Schema.Json)])

/**
 * A classification question.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export const ChoiceQuestion = Schema.Struct({
  type: Schema.Literal("choice"),
  instructions: Entry,
  criteria: Schema.Record(Schema.String, Schema.NullOr(Entry))
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
  instructions: Entry,
  criteria: Schema.Array(Schema.Json)
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
  instructions: Entry,
  criteria: Schema.optional(Schema.Struct({ false: Schema.Json, true: Schema.Json }))
})

/**
 * A Clef question with string, JSON object, or JSON array instructions.
 * Choice descriptions also accept `null`; Score and Noul descriptions accept any JSON value.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export const Question = Schema.Union([ChoiceQuestion, ScoreQuestion, NoulQuestion])

/**
 * An image as a `data:` URL or as base64 data with its media type. Clef
 * rejects remote URLs.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.5
 */
export const Image = Schema.Union([
  Schema.String,
  Schema.Struct({
    content_type: Schema.Union([
      Schema.Literals(["image/png", "image/jpeg", "image/webp"]),
      Schema.StringForLiteralAutocomplete
    ]),
    base64: Schema.String
  })
])

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
 * A zero-based rating and index-keyed distribution. `legend` maps indices to descriptions.
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
  legend: Schema.Record(Schema.String, Schema.Json)
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

/**
 * A Clairic field spec. `min` and `max` are required for estimates and
 * forecasts, `items` for lists, and `horizon` for forecasts.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const ExtractionField = Schema.Struct({
  type: Schema.Literals(["text", "number", "date", "time", "datetime", "duration", "list", "estimate", "forecast"]),
  instructions: Schema.optional(Schema.String),
  unit: Schema.optional(Schema.String),
  integer: Schema.optional(Schema.Boolean),
  decimals: Schema.optional(Schema.Int),
  items: Schema.optional(Schema.Literals(["text", "number", "date"])),
  min: Schema.optional(Schema.Union([Schema.Number, Schema.String])),
  max: Schema.optional(Schema.Union([Schema.Number, Schema.String])),
  step: Schema.optional(Schema.Union([Schema.Number, Schema.String])),
  scale: Schema.optional(Schema.Literals(["linear", "log"])),
  null_threshold: Schema.optional(Schema.Number),
  horizon: Schema.optional(Schema.Int),
  interval: Schema.optional(Schema.String)
})

/**
 * A batch of typed fields to answer from text, with optional images shown to
 * the model before the text.
 *
 * **Details**
 *
 * Clairic accepts up to 4 images of at most 4 MiB each, 8 MiB of decoded
 * images in total, and 16 MiB per request body. Field names must match
 * `^[A-Za-z_][A-Za-z0-9_.-]{0,63}$`.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const ExtractionsRequest = Schema.Struct({
  model: Schema.Union([Schema.Literal("clairic"), Schema.StringForLiteralAutocomplete]),
  state: Schema.String,
  fields: Schema.Record(Schema.String, ExtractionField),
  images: Schema.optional(Schema.Array(Image)),
  reference_date: Schema.optional(Schema.String),
  options: Schema.optional(Schema.Struct({
    include_quantiles: Schema.optional(Schema.Boolean),
    return_state_text: Schema.optional(Schema.Boolean)
  }))
})

const CharSpan = Schema.Tuple([Schema.Int, Schema.Int])

/**
 * One step of a Clairic forecast.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const ForecastStep = Schema.Struct({
  value: Schema.Unknown,
  mean: Schema.Unknown,
  median: Schema.Unknown,
  p10: Schema.Unknown,
  p90: Schema.Unknown,
  p_below: Schema.optional(Schema.Number),
  p_above: Schema.optional(Schema.Number),
  quantiles: Schema.optional(Schema.Array(Schema.Unknown))
})

/**
 * A Clairic answer. `value` is `null` when the input does not determine it,
 * and `guess` is what the model would have answered. Lists report per-item
 * `spans` for text items and `confidences` otherwise.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const ExtractionAnswer = Schema.Struct({
  type: Schema.String,
  value: Schema.Unknown,
  guess: Schema.optional(Schema.Unknown),
  p_null: Schema.optional(Schema.Number),
  confidence: Schema.optional(Schema.Number),
  confidences: Schema.optional(Schema.Array(Schema.Number)),
  span: Schema.optional(CharSpan),
  spans: Schema.optional(Schema.Array(CharSpan)),
  mean: Schema.optional(Schema.Unknown),
  median: Schema.optional(Schema.Unknown),
  p10: Schema.optional(Schema.Unknown),
  p90: Schema.optional(Schema.Unknown),
  p_below: Schema.optional(Schema.Number),
  p_above: Schema.optional(Schema.Number),
  quantiles: Schema.optional(Schema.Array(Schema.Unknown)),
  steps: Schema.optional(Schema.Array(ForecastStep))
})

/**
 * Answers, truncation, and token usage for a batch. `passes` counts the
 * parallel passes the fields were split across.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const ExtractionsResponse = Schema.Struct({
  model: Schema.String,
  answers: Schema.Record(Schema.String, ExtractionAnswer),
  truncated: Schema.Boolean,
  state_text: Schema.optional(Schema.String),
  usage: Schema.Struct({
    input_tokens: Schema.Int,
    output_tokens: Schema.Int,
    state_tokens: Schema.optional(Schema.Int),
    image_tokens: Schema.optional(Schema.Int),
    schema_tokens: Schema.optional(Schema.Int),
    passes: Schema.optional(Schema.Int)
  })
})
