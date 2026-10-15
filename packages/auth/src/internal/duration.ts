import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"
import * as SchemaIssue from "effect/SchemaIssue"

const DurationInputComponents = Schema.Struct({
  weeks: Schema.optional(Schema.Finite),
  days: Schema.optional(Schema.Finite),
  hours: Schema.optional(Schema.Finite),
  minutes: Schema.optional(Schema.Finite),
  seconds: Schema.optional(Schema.Finite),
  milliseconds: Schema.optional(Schema.Finite),
  microseconds: Schema.optional(Schema.Finite),
  nanoseconds: Schema.optional(Schema.Finite)
})

// Validate and capture components before Duration parsing, which otherwise
// accepts NaN as zero and coerces some malformed object components.
const DurationInputValue = Schema.Union([
  Schema.Duration,
  Schema.Finite,
  Schema.BigInt,
  Schema.Tuple([Schema.Finite, Schema.Finite]),
  Schema.String,
  DurationInputComponents
])

const decodeInput = Schema.decodeUnknownSync(DurationInputValue)

const readMillis = (input: unknown): Option.Option<number> => {
  try {
    const captured = decodeInput(input, { reportInput: false })
    const duration = Duration.fromInput(captured as Duration.Input)
    if (Option.isNone(duration)) return Option.none()
    const millis = Duration.toMillis(duration.value)
    return Number.isFinite(millis) ? Option.some(millis) : Option.none()
  } catch {
    return Option.none()
  }
}

/** @internal */
export const NonNegativeInput = Schema.declare<Duration.Input>(
  (input): input is Duration.Input => {
    const millis = readMillis(input)
    return Option.isSome(millis) && millis.value >= 0
  },
  { expected: "a finite nonnegative duration input" }
)

const normalized = (divisor: number) =>
  Schema.Unknown.pipe(
    Schema.decodeTo(Schema.Finite, {
      decode: SchemaGetter.transformEffect((input, options) =>
        Option.match(readMillis(input), {
          onNone: () =>
            Effect.fail(new SchemaIssue.InvalidValue({ expected: "a finite duration input" }, input, options)),
          onSome: (millis) => Effect.succeed(millis / divisor)
        })
      ),
      encode: SchemaGetter.transform((value) => value * divisor)
    })
  )

/** @internal */
export const Millis = normalized(1)

/** @internal */
export const Seconds = normalized(1000)
