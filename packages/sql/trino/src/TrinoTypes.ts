/**
 * Decoding of Trino result values, and the codecs that replace it.
 *
 * **Details**
 *
 * Without a registry, values decode as `pg` decodes its equivalents, so
 * `Model` and `Schema` fields work unchanged:
 *
 * - `timestamp(p)` and `timestamp(p) with time zone` decode to `Date`
 *   (millisecond precision, truncated). A `timestamp` is its wall clock read
 *   as UTC fields; a `timestamp with time zone` is its instant, and its zone
 *   is dropped.
 * - `decimal(p, s)` and `number` decode to the text Trino wrote, `bigint` to
 *   `bigint`, and `date`, `time`, `time with time zone` and both `interval`
 *   types to their text.
 *
 * Pass a `Registry` as `TrinoClientConfig.types` to decode a type differently.
 * `makeEffectRegistry` decodes to Effect types and keeps every digit; encoders
 * accept both representations.
 *
 * @stability unstable
 * @since 4.2.0
 */
import * as BigDecimal from "effect/BigDecimal"
import * as Data from "effect/Data"
import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import * as Option from "effect/Option"
import * as Result from "effect/Result"
import {
  Invalid,
  invalid,
  parseDateMillis,
  parseDayTimeIntervalNanos,
  parseTime,
  parseTimestamp,
  parseYearMonthIntervalMonths,
  parseZonedTimestamp
} from "./internal/wire.ts"

/**
 * Failure returned when a codec cannot decode a value.
 *
 * @stability unstable
 * @category errors
 * @since 4.2.0
 */
export class CodecError extends Data.TaggedError("TrinoTypesCodecError")<{
  readonly message: string
}> {}

/**
 * A type as the server describes it: its name and arguments.
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export interface TypeSignature {
  readonly rawType: string
  readonly arguments: ReadonlyArray<TypeArgument>
}

/**
 * An argument of a type: a type, a named type (row fields), a number
 * (precision, scale, length) or a type variable.
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export type TypeArgument =
  | { readonly kind: "TYPE"; readonly value: TypeSignature }
  | { readonly kind: "NAMED_TYPE"; readonly fieldName: string | undefined; readonly value: TypeSignature }
  | { readonly kind: "LONG"; readonly value: number }
  | { readonly kind: "VARIABLE"; readonly value: string }

/**
 * A result column: its name and type.
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export interface Column {
  readonly name: string
  readonly type: string
  readonly typeSignature: TypeSignature
}

/**
 * The column type a value is decoded for.
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export interface TypeInfo {
  /** The lower-case type name without arguments, such as `timestamp with time zone`. */
  readonly rawType: string
  /** The precision of a `time` or `timestamp` type; 3 when the server sent a bare type. */
  readonly precision: number
}

/**
 * Decodes the text Trino writes for a value, or the source of a JSON number.
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export interface Codec<A> {
  readonly decode: (text: string, type: TypeInfo) => Result.Result<A, CodecError>
}

/**
 * A client-specific set of codecs, keyed by the lower-case type name without
 * arguments. Registered codecs take precedence over the built-in decoding.
 *
 * **Details**
 *
 * A codec receives scalar values: types sent as a JSON string or number. It
 * also applies to the elements of arrays, the keys and values of maps and the
 * fields of rows. `array`, `map`, `row` and `boolean` cannot be overridden.
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export interface Registry {
  readonly register: <A>(rawType: string, codec: Codec<A>) => void
  readonly lookup: (rawType: string) => Codec<unknown> | undefined
}

/**
 * Creates an empty registry, which decodes everything as the built-in
 * decoding does until codecs are registered.
 *
 * @stability unstable
 * @category constructors
 * @since 4.2.0
 */
export const makeRegistry = (): Registry => {
  const codecs = new Map<string, Codec<unknown>>()
  return {
    register: (rawType, codec) => {
      codecs.set(rawType.toLowerCase(), codec)
    },
    lookup: (rawType) => codecs.get(rawType)
  }
}

const codec = <A>(decode: (text: string, type: TypeInfo) => A): Codec<A> => ({
  decode: (text, type) => {
    try {
      return Result.succeed(decode(text, type))
    } catch (error) {
      if (error instanceof Invalid) return Result.fail(new CodecError({ message: error.message }))
      throw error
    }
  }
})

// -----------------------------------------------------------------------------
// value classes
// -----------------------------------------------------------------------------

/**
 * A `time(p)` or `time(p) with time zone` value: picoseconds since midnight
 * and, when zoned, the UTC offset in minutes.
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export class Time extends Data.Class<{
  readonly picosOfDay: bigint
  readonly offsetMinutes: number | undefined
}> {}

/**
 * A `timestamp(p)` or `timestamp(p) with time zone` value with more than
 * millisecond precision: the instant truncated to milliseconds plus the
 * picoseconds within that millisecond (0 to 999_999_999).
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export class PreciseTimestamp<D extends DateTime.DateTime = DateTime.Utc | DateTime.Zoned> extends Data.Class<{
  readonly dateTime: D
  readonly picosOfMilli: number
}> {}

/**
 * An `interval year to month` value as a signed number of months.
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export class IntervalYearMonth extends Data.Class<{
  readonly months: number
}> {}

// -----------------------------------------------------------------------------
// codecs
// -----------------------------------------------------------------------------

const toUtc = (epochMillis: number, text: string): DateTime.Utc => {
  const dateTime = DateTime.make(epochMillis)
  return Option.isSome(dateTime) ? dateTime.value : invalid(`Out of range: "${text}"`)
}

/**
 * `decimal(p, s)` as a `BigDecimal`.
 *
 * @stability unstable
 * @category codecs
 * @since 4.2.0
 */
export const decimal: Codec<BigDecimal.BigDecimal> = codec((text) => {
  const parsed = BigDecimal.fromString(text)
  return Option.isSome(parsed) ? parsed.value : invalid(`Expected a decimal, received "${text}"`)
})

/**
 * `number` as a `BigDecimal`, or a `number` for `NaN` and `±Infinity`, which
 * have no `BigDecimal` form.
 *
 * @stability unstable
 * @category codecs
 * @since 4.2.0
 */
export const number: Codec<BigDecimal.BigDecimal | number> = codec((text, type) => {
  switch (text) {
    case "NaN":
      return Number.NaN
    case "+Infinity":
    case "Infinity":
      return Number.POSITIVE_INFINITY
    case "-Infinity":
      return Number.NEGATIVE_INFINITY
  }
  const result = decimal.decode(text, type)
  return Result.isSuccess(result) ? result.success : invalid(result.failure.message)
})

/**
 * `date` as a `DateTime.Utc` at midnight UTC.
 *
 * @stability unstable
 * @category codecs
 * @since 4.2.0
 */
export const date: Codec<DateTime.Utc> = codec((text) => toUtc(parseDateMillis(text), text))

/**
 * `time(p)` as a `Time`.
 *
 * @stability unstable
 * @category codecs
 * @since 4.2.0
 */
export const time: Codec<Time> = codec((text) => new Time(parseTime(text, false)))

/**
 * `time(p) with time zone` as a `Time` with its offset.
 *
 * @stability unstable
 * @category codecs
 * @since 4.2.0
 */
export const timeWithTimeZone: Codec<Time> = codec((text) => new Time(parseTime(text, true)))

/**
 * `timestamp(p)` as a `DateTime.Utc` when p ≤ 3, otherwise a
 * `PreciseTimestamp`.
 *
 * @stability unstable
 * @category codecs
 * @since 4.2.0
 */
export const timestamp: Codec<DateTime.Utc | PreciseTimestamp<DateTime.Utc>> = codec((text, type) => {
  const { millis, picosOfMilli } = parseTimestamp(text)
  const dateTime = toUtc(millis, text)
  return type.precision <= 3 ? dateTime : new PreciseTimestamp({ dateTime, picosOfMilli })
})

/**
 * `timestamp(p) with time zone` as a `DateTime.Zoned` when p ≤ 3, otherwise
 * a `PreciseTimestamp`.
 *
 * @stability unstable
 * @category codecs
 * @since 4.2.0
 */
export const timestampWithTimeZone: Codec<DateTime.Zoned | PreciseTimestamp<DateTime.Zoned>> = codec((text, type) => {
  const { dateTime, picosOfMilli } = parseZonedTimestamp(text)
  return type.precision <= 3 ? dateTime : new PreciseTimestamp({ dateTime, picosOfMilli })
})

/**
 * `interval day to second` as a `Duration`. Digits beyond nanoseconds
 * (precision 10 to 12) are truncated.
 *
 * @stability unstable
 * @category codecs
 * @since 4.2.0
 */
export const intervalDayToSecond: Codec<Duration.Duration> = codec((text) =>
  Duration.nanos(parseDayTimeIntervalNanos(text))
)

/**
 * `interval year to month` as an `IntervalYearMonth`.
 *
 * @stability unstable
 * @category codecs
 * @since 4.2.0
 */
export const intervalYearToMonth: Codec<IntervalYearMonth> = codec((text) =>
  new IntervalYearMonth({ months: parseYearMonthIntervalMonths(text) })
)

/**
 * Creates a registry that decodes to Effect types: `decimal` and `number` to
 * `BigDecimal`, `date` and `timestamp` to `DateTime.Utc`, `timestamp with
 * time zone` to `DateTime.Zoned`, `time` to `Time`, `interval day to second`
 * to `Duration` and `interval year to month` to `IntervalYearMonth`.
 * Timestamps with more than millisecond precision decode to
 * `PreciseTimestamp`.
 *
 * **Gotchas**
 *
 * `Model` fields do not accept these values: use `Schema.BigDecimal` and
 * `Schema.DateTimeUtc` for them.
 *
 * @stability unstable
 * @category constructors
 * @since 4.2.0
 */
export const makeEffectRegistry = (): Registry => {
  const registry = makeRegistry()
  registry.register("decimal", decimal)
  registry.register("number", number)
  registry.register("date", date)
  registry.register("time", time)
  registry.register("time with time zone", timeWithTimeZone)
  registry.register("timestamp", timestamp)
  registry.register("timestamp with time zone", timestampWithTimeZone)
  registry.register("interval day to second", intervalDayToSecond)
  registry.register("interval year to month", intervalYearToMonth)
  return registry
}
