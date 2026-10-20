/**
 * Defines typed fields to extract, compute, estimate, or forecast from text.
 * Each field carries the schema of its answer, so answers are validated by
 * decoding and their types follow from the field definitions.
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as Duration from "../Duration.ts"
import * as Option from "../Option.ts"
import * as Result from "../Result.ts"
import * as Schema from "../Schema.ts"
import * as SchemaTransformation from "../SchemaTransformation.ts"

/**
 * Brand type for extraction definitions.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.0.6
 */
export type TypeId = "~effect/ai/Extraction"

/**
 * Brand for extraction definitions.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.0.6
 */
export const TypeId: TypeId = "~effect/ai/Extraction"

/**
 * Schema for a number in `[0, 1]`.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const Probability: Schema.Finite = Schema.Finite.check(Schema.isBetween({ minimum: 0, maximum: 1 }))

/**
 * Schema for the `[start, end)` character offsets of an answer in the input
 * text.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const Span: Schema.Tuple<readonly [Schema.Int, Schema.Int]> = Schema.Tuple([Schema.Int, Schema.Int])

/**
 * Character offsets of an answer in the input text.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type Span = typeof Span.Type

/**
 * A value the input determines.
 *
 * **Details**
 *
 * `confidence` is the model's certainty in `value`. `pNull` is the probability
 * that the input does not contain the value; it is below the field's null
 * threshold. `span` locates text values in the input.
 *
 * **Gotchas**
 *
 * - Answers are well formed, not necessarily correct. Use `confidence` to
 *   decide which answers need review.
 *
 * @see {@link Absent} for the other case
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface Found<A> {
  readonly _tag: "Found"
  readonly value: A
  readonly confidence: number
  readonly pNull: number
  readonly span?: Span | undefined
}

/**
 * A value the input does not determine.
 *
 * **Details**
 *
 * `field` names the field, so the answer stays identifiable when used as an
 * error. `pNull` is at or above the field's null threshold. `guess` is what
 * the model would have answered and `span` locates it in the input.
 *
 * **Gotchas**
 *
 * - `guess` is not a value. When asked for a missing renewal date, a model can
 *   guess another date from the same text.
 *
 * @see {@link Found} for the other case
 * @see {@link toResult} for failing with this answer
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface Absent<A> {
  readonly _tag: "Absent"
  readonly field: string
  readonly guess?: A | undefined
  readonly confidence: number
  readonly pNull: number
  readonly span?: Span | undefined
}

/**
 * Answer for a single-value field: `Found` or `Absent`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type ValueAnswer<A> = Found<A> | Absent<A>

/**
 * Tagged union schema for a single-value field's answer.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export type ValueAnswerSchema<S extends Schema.Top> = Schema.TaggedUnion<{
  readonly Found: Schema.TaggedStruct<"Found", {
    readonly value: S
    readonly confidence: Schema.Finite
    readonly pNull: Schema.Finite
    readonly span: Schema.optional<typeof Span>
  }>
  readonly Absent: Schema.TaggedStruct<"Absent", {
    readonly field: Schema.String
    readonly guess: Schema.optional<S>
    readonly confidence: Schema.Finite
    readonly pNull: Schema.Finite
    readonly span: Schema.optional<typeof Span>
  }>
}>

/**
 * Creates the `Found` / `Absent` answer schema for a value schema.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const ValueAnswer = <S extends Schema.Top>(value: S): ValueAnswerSchema<S> =>
  Schema.TaggedUnion({
    Found: { value, confidence: Probability, pNull: Probability, span: Schema.optional(Span) },
    Absent: {
      field: Schema.String,
      guess: Schema.optional(value),
      confidence: Probability,
      pNull: Probability,
      span: Schema.optional(Span)
    }
  })

/**
 * Schema for a list field's answer. `span` locates text items in the input.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export type ListAnswerSchema<S extends Schema.Top> = Schema.Struct<{
  readonly items: Schema.$Array<
    Schema.Struct<{
      readonly value: S
      readonly confidence: Schema.optional<Schema.Finite>
      readonly span: Schema.optional<typeof Span>
    }>
  >
  readonly confidence: Schema.Finite
}>

/**
 * Creates the answer schema for a list of values.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const ListAnswer = <S extends Schema.Top>(item: S): ListAnswerSchema<S> =>
  Schema.Struct({
    items: Schema.Array(Schema.Struct({
      value: item,
      confidence: Schema.optional(Probability),
      span: Schema.optional(Span)
    })),
    confidence: Probability
  })

/**
 * Schema for an estimate's distribution.
 *
 * **Details**
 *
 * `value` is the point estimate and `[p10, p90]` is the 80% interval.
 * `pBelow` and `pAbove` are the probabilities outside the field's bounds, when
 * the provider reports them. `quantiles` holds the 1st to 99th percentiles
 * when the field requested them.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export type EstimateAnswerSchema<S extends Schema.Top> = Schema.Struct<{
  readonly value: S
  readonly mean: S
  readonly median: S
  readonly p10: S
  readonly p90: S
  readonly pBelow: Schema.optional<Schema.Finite>
  readonly pAbove: Schema.optional<Schema.Finite>
  readonly quantiles: Schema.optional<Schema.$Array<S>>
}>

/**
 * Schema for a forecast: one estimate per step ahead.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export type ForecastAnswerSchema = Schema.Struct<{
  readonly steps: Schema.$Array<EstimateAnswerSchema<Schema.Finite>>
}>

/**
 * An ISO 8601 date (`YYYY-MM-DD`).
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const IsoDate: Schema.String = Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/))

/**
 * An ISO 8601 wall-clock time (`HH:MM` or `HH:MM:SS`, optionally with
 * fractional seconds).
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const IsoTime: Schema.String = Schema.String.check(Schema.isPattern(/^\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/))

/**
 * An ISO 8601 date and time, with or without a UTC offset.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export const IsoDateTime: Schema.String = Schema.String.check(
  Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/)
)

/**
 * Field instructions: what the field should contain.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface FieldOptions {
  readonly instructions?: string | undefined
}

/**
 * Options for single-value fields.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface ValueFieldOptions extends FieldOptions {
  /**
   * Probability of absence at or above which the answer is `Absent`.
   * Providers default to `0.5`.
   */
  readonly nullThreshold?: number | undefined
}

/**
 * A text value copied from the input.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface TextField extends ValueFieldOptions {
  readonly _tag: "Text"
  readonly answer: ValueAnswerSchema<Schema.String>
}

/**
 * Options for number fields.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface NumberFieldOptions extends ValueFieldOptions {
  readonly unit?: string | undefined
  readonly integer?: boolean | undefined
  readonly decimals?: number | undefined
}

/**
 * A number read or computed from the input.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface NumberField extends NumberFieldOptions {
  readonly _tag: "Number"
  readonly answer: ValueAnswerSchema<Schema.Finite>
}

/**
 * A calendar date, answered as `YYYY-MM-DD`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface DateField extends ValueFieldOptions {
  readonly _tag: "Date"
  readonly answer: ValueAnswerSchema<Schema.String>
}

/**
 * A wall-clock time, answered as `HH:MM:SS`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface TimeField extends ValueFieldOptions {
  readonly _tag: "Time"
  readonly answer: ValueAnswerSchema<Schema.String>
}

/**
 * A date and time, answered as an ISO 8601 string.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface DateTimeField extends ValueFieldOptions {
  readonly _tag: "DateTime"
  readonly answer: ValueAnswerSchema<Schema.String>
}

/**
 * Units a duration field is answered in.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type DurationUnit = "seconds" | "minutes" | "hours" | "days" | "weeks"

/**
 * Schema that decodes a number of `unit`s to a `Duration`.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.6
 */
export type DurationFromUnit = Schema.decodeTo<Schema.Duration, Schema.Finite>

/**
 * Options for duration fields.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface DurationFieldOptions extends ValueFieldOptions {
  /**
   * Unit the provider answers in.
   *
   * @default "seconds"
   */
  readonly unit?: DurationUnit | undefined
  readonly integer?: boolean | undefined
  readonly decimals?: number | undefined
}

/**
 * A length of time, answered as a `Duration`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface DurationField extends DurationFieldOptions {
  readonly _tag: "Duration"
  readonly answer: ValueAnswerSchema<DurationFromUnit>
}

/**
 * Kinds of list items.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type ListItems = "text" | "number" | "date"

/**
 * Options for list fields.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface ListFieldOptions<Items extends ListItems> extends FieldOptions {
  readonly items: Items
  /**
   * Decimal places for number items.
   */
  readonly decimals?: number | undefined
}

/**
 * Every value of a kind found in the input. Empty when there are none.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface ListField<Items extends ListItems = ListItems> extends ListFieldOptions<Items> {
  readonly _tag: "List"
  readonly answer: ListAnswerSchema<Items extends "number" ? Schema.Finite : Schema.String>
}

/**
 * Options for estimate fields. Numeric estimates take number bounds; date
 * estimates take ISO date bounds.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface EstimateFieldOptions<A extends number | string> extends FieldOptions {
  readonly min: A
  readonly max: A
  /**
   * Grid spacing: a positive number (days for date estimates), or
   * `"month"` / `"year"` for date estimates.
   */
  readonly step?: number | "month" | "year" | undefined
  /**
   * `"log"` requires `min > 0`.
   *
   * @default "linear"
   */
  readonly scale?: "linear" | "log" | undefined
  /**
   * Includes the 1st to 99th percentiles in the answer.
   */
  readonly quantiles?: boolean | undefined
}

/**
 * A value the input gives evidence for but does not state, answered as a
 * distribution inside `[min, max]`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface EstimateField<A extends number | string = number | string> extends EstimateFieldOptions<A> {
  readonly _tag: "Estimate"
  readonly answer: EstimateAnswerSchema<A extends number ? Schema.Finite : Schema.String>
}

/**
 * Intervals between forecast steps.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type ForecastInterval = "step" | "minute" | "hour" | "day" | "week" | "month" | "quarter" | "year"

/**
 * Options for forecast fields.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface ForecastFieldOptions extends FieldOptions {
  readonly min: number
  readonly max: number
  /**
   * Number of steps ahead, from 1 to 64.
   */
  readonly horizon: number
  readonly interval?: ForecastInterval | undefined
  /**
   * Includes the 1st to 99th percentiles in each step.
   */
  readonly quantiles?: boolean | undefined
}

/**
 * Future values of a series in the input, answered as one estimate per step.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface ForecastField extends ForecastFieldOptions {
  readonly _tag: "Forecast"
  readonly answer: ForecastAnswerSchema
}

/**
 * Any field.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type Any =
  | TextField
  | NumberField
  | DateField
  | TimeField
  | DateTimeField
  | DurationField
  | ListField
  | EstimateField
  | ForecastField

/**
 * Answer type for a field.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type Answer<F extends Any> = F["answer"]["Type"]

/**
 * Answers keyed by field name.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type Answers<Fields extends Record<string, Any>> = {
  readonly [K in keyof Fields]: Answer<Fields[K]>
}

/**
 * Reason a field has no valid answer: the provider omitted it, or its answer
 * failed to decode.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface Unanswered {
  readonly _tag: "Unanswered"
  readonly reason: "Missing" | "Invalid"
  readonly description: string
}

/**
 * A field's validated answer or the reason it has none.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type Outcome<F extends Any> = Result.Result<Answer<F>, Unanswered>

/**
 * Outcomes keyed by field name.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type Outcomes<Fields extends Record<string, Any>> = {
  readonly [K in keyof Fields]: Outcome<Fields[K]>
}

/**
 * Named fields to answer from one input.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface Definition<Fields extends Record<string, Any>> {
  readonly [TypeId]: TypeId
  readonly fields: Fields
}

/**
 * Creates a field for text copied from the input.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const text = (options?: ValueFieldOptions): TextField => ({
  ...options,
  _tag: "Text",
  answer: ValueAnswer(Schema.String)
})

/**
 * Creates a field for a number read or computed from the input.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const number = (options?: NumberFieldOptions): NumberField => ({
  ...options,
  _tag: "Number",
  answer: ValueAnswer(options?.integer ? Schema.Finite.check(Schema.isInt()) : Schema.Finite)
})

/**
 * Creates a field for a calendar date, answered as `YYYY-MM-DD`.
 *
 * **Gotchas**
 *
 * - Dates have no time zone, so they are strings rather than `DateTime`
 *   instants, which would shift the day in zones behind UTC.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const date = (options?: ValueFieldOptions): DateField => ({
  ...options,
  _tag: "Date",
  answer: ValueAnswer(IsoDate)
})

/**
 * Creates a field for a wall-clock time, answered as `HH:MM:SS`.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const time = (options?: ValueFieldOptions): TimeField => ({
  ...options,
  _tag: "Time",
  answer: ValueAnswer(IsoTime)
})

/**
 * Creates a field for a date and time, answered as an ISO 8601 string.
 *
 * **Gotchas**
 *
 * - Providers may drop the time zone. Cloudflare Clairic answers
 *   `"Oct 28 at 3:30pm Pacific"` as `"2026-10-28T15:30:00"`. Add a text
 *   field for the zone when you need an instant.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const dateTime = (options?: ValueFieldOptions): DateTimeField => ({
  ...options,
  _tag: "DateTime",
  answer: ValueAnswer(IsoDateTime)
})

const unitMillis: Record<DurationUnit, number> = {
  seconds: 1_000,
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
  weeks: 604_800_000
}

/**
 * Creates a field for a length of time, answered as a `Duration`.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const duration = (options?: DurationFieldOptions): DurationField => {
  const millis = unitMillis[options?.unit ?? "seconds"]
  const amount = options?.integer ? Schema.Finite.check(Schema.isInt()) : Schema.Finite
  return {
    ...options,
    _tag: "Duration",
    answer: ValueAnswer(amount.pipe(Schema.decodeTo(
      Schema.Duration,
      SchemaTransformation.transform({
        decode: (n) => Duration.millis(n * millis),
        encode: (d) => Duration.toMillis(d) / millis
      })
    )))
  }
}

const listItem: Record<ListItems, Schema.Finite | Schema.String> = {
  text: Schema.String,
  number: Schema.Finite,
  date: IsoDate
}

/**
 * Creates a field for every value of a kind found in the input.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const list = <const Items extends ListItems>(options: ListFieldOptions<Items>): ListField<Items> => ({
  ...options,
  _tag: "List",
  answer: ListAnswer(listItem[options.items]) as ListField<Items>["answer"]
})

const checkDistribution = <A extends number | string>(min: A, max: A) =>
  Schema.makeFilter<{
    readonly value: A
    readonly mean: A
    readonly median: A
    readonly p10: A
    readonly p90: A
    readonly quantiles?: ReadonlyArray<A> | undefined
  }>((answer) => {
    for (const key of ["value", "mean", "median", "p10", "p90"] as const) {
      if (answer[key] < min || answer[key] > max) return `${key} must be within [${min}, ${max}]`
    }
    if (answer.p10 > answer.median || answer.median > answer.p90) return "p10 <= median <= p90 must hold"
    return answer.quantiles === undefined || answer.quantiles.length === 99 || "quantiles must have 99 entries"
  })

const EstimateAnswer = <S extends Schema.Finite | Schema.String>(
  value: S,
  min: S["Type"],
  max: S["Type"]
): EstimateAnswerSchema<S> =>
  Schema.Struct({
    value,
    mean: value,
    median: value,
    p10: value,
    p90: value,
    pBelow: Schema.optional(Probability),
    pAbove: Schema.optional(Probability),
    quantiles: Schema.optional(Schema.Array(value))
  }).check(checkDistribution(min, max) as any)

/**
 * Creates a field for a value the input gives evidence for but does not
 * state. Number bounds give a numeric estimate; ISO date bounds give a date
 * estimate.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const estimate: {
  (options: EstimateFieldOptions<number>): EstimateField<number>
  (options: EstimateFieldOptions<string>): EstimateField<string>
} = (options: EstimateFieldOptions<number> | EstimateFieldOptions<string>): EstimateField<any> => {
  if (!(options.min < options.max)) {
    throw new Error("Extraction.estimate: min must be less than max")
  }
  return {
    ...options,
    _tag: "Estimate",
    answer: typeof options.min === "number"
      ? EstimateAnswer(Schema.Finite, options.min, options.max as number)
      : EstimateAnswer(IsoDate, options.min, options.max as string)
  }
}

/**
 * Creates a field for future values of a series in the input.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const forecast = (options: ForecastFieldOptions): ForecastField => {
  if (!(options.min < options.max)) {
    throw new Error("Extraction.forecast: min must be less than max")
  }
  if (!Number.isInteger(options.horizon) || options.horizon < 1 || options.horizon > 64) {
    throw new Error("Extraction.forecast: horizon must be an integer from 1 to 64")
  }
  return {
    ...options,
    _tag: "Forecast",
    answer: Schema.Struct({
      steps: Schema.Array(EstimateAnswer(Schema.Finite, options.min, options.max)).check(
        Schema.makeFilter((steps) => steps.length === options.horizon || `expected ${options.horizon} steps`)
      )
    })
  }
}

/**
 * Creates an extraction definition from named fields.
 *
 * **Example** (Reading an invoice)
 *
 * ```ts
 * import { Extraction } from "effect/ai"
 *
 * const Invoice = Extraction.make({
 *   fields: {
 *     invoiceNumber: Extraction.text(),
 *     total: Extraction.number({ decimals: 2, unit: "USD", instructions: "Amount due including shipping" }),
 *     dueDate: Extraction.date({ instructions: "Issue date plus the net payment days" }),
 *     contacts: Extraction.list({ items: "text" }),
 *     daysToPay: Extraction.estimate({ min: 0, max: 120, step: 1, instructions: "Days until paid" })
 *   }
 * })
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const make = <const Fields extends Record<string, Any>>(options: {
  readonly fields: Fields
}): Definition<Fields> => {
  if (Object.keys(options.fields).length === 0) {
    throw new Error("Extraction.make: fields must not be empty")
  }
  return { [TypeId]: TypeId, fields: options.fields }
}

/**
 * Converts a single-value answer to a `Result` that fails with the `Absent`
 * answer.
 *
 * **When to use**
 *
 * Use when a field is required. Pass the result to `Effect.fromResult` to
 * fail the program with the `Absent` answer when the input does not determine
 * the value.
 *
 * **Example** (Requiring an invoice number)
 *
 * ```ts
 * import { Effect } from "effect"
 * import { Extraction, ExtractionModel } from "effect/ai"
 *
 * const Invoice = Extraction.make({ fields: { invoiceNumber: Extraction.text() } })
 *
 * const program = Effect.gen(function*() {
 *   const { answers } = yield* ExtractionModel.extract(Invoice, { text: "Invoice INV-2291" })
 *   return yield* Effect.fromResult(Extraction.toResult(answers.invoiceNumber))
 * }).pipe(
 *   Effect.catchTag("Absent", (absent) => Effect.succeed(`missing ${absent.field}`))
 * )
 * ```
 *
 * @see {@link toOption} for optional fields
 *
 * @stability unstable
 * @category converting
 * @since 4.0.6
 */
export const toResult = <A>(answer: ValueAnswer<A>): Result.Result<A, Absent<A>> =>
  answer._tag === "Found" ? Result.succeed(answer.value) : Result.fail(answer)

/**
 * Converts a single-value answer to an `Option` of its value.
 *
 * @see {@link toResult} for required fields
 *
 * @stability unstable
 * @category converting
 * @since 4.0.6
 */
export const toOption = <A>(answer: ValueAnswer<A>): Option.Option<A> =>
  answer._tag === "Found" ? Option.some(answer.value) : Option.none()
