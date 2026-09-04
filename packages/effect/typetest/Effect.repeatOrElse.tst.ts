/** @effect-diagnostics floatingEffect:skip-file missingEffectError:skip-file */
import { type Duration, Effect, Option, type Schedule } from "effect"
import { describe, expect, it } from "tstyche"

declare const source: Effect.Effect<string, "source-error", "source-service">
declare const schedule: Schedule.Schedule<number, string, "schedule-error", "schedule-service">
declare const fallback: Effect.Effect<number, "fallback-error", "fallback-service">

describe("repeatOrElse metadata", () => {
  it("direct contextual envelope and channels", () => {
    const result = Effect.repeatOrElse(source, schedule, (error, previous) => {
      expect(error).type.toBe<"source-error" | "schedule-error">()
      expect(previous).type.toBe<Option.Option<Schedule.Metadata<number, string>>>()
      return fallback
    })
    expect(result).type.toBe<
      Effect.Effect<number, "fallback-error", "source-service" | "schedule-service" | "fallback-service">
    >()
  })
  it("direct contextual fields", () => {
    Effect.repeatOrElse(source, schedule, (_error, previous) => {
      if (Option.isSome(previous)) {
        expect(previous.value.output).type.toBe<number>()
        expect(previous.value.input).type.toBe<string>()
        expect(previous.value.attempt).type.toBe<number>()
        expect(previous.value.duration).type.toBe<Duration.Duration>()
      }
      return fallback
    })
  })
  it("curried contextual envelope and channels", () => {
    const result = source.pipe(Effect.repeatOrElse(schedule, (error: "source-error" | "schedule-error", previous) => {
      expect(error).type.toBe<"source-error" | "schedule-error">()
      expect(previous).type.toBe<Option.Option<Schedule.Metadata<number, string>>>()
      return fallback
    }))
    expect(result).type.toBe<
      Effect.Effect<number, "fallback-error", "source-service" | "schedule-service" | "fallback-service">
    >()
  })
  it("curried contextual fields", () => {
    source.pipe(Effect.repeatOrElse(schedule, (_error: "source-error" | "schedule-error", previous) => {
      if (Option.isSome(previous)) {
        expect(previous.value.output).type.toBe<number>()
        expect(previous.value.input).type.toBe<string>()
        expect(previous.value.attempt).type.toBe<number>()
        expect(previous.value.duration).type.toBe<Duration.Duration>()
      }
      return fallback
    }))
  })
  it("rejects output-only methods directly and curried", () => {
    Effect.repeatOrElse(source, schedule, (_error, previous) => {
      if (Option.isSome(previous)) {
        expect(previous.value).type.not.toBeAssignableTo<{ toFixed(digits: number): string }>()
      }
      return fallback
    })
    source.pipe(Effect.repeatOrElse(schedule, (_error: "source-error" | "schedule-error", previous) => {
      if (Option.isSome(previous)) {
        expect(previous.value).type.not.toBeAssignableTo<{ toFixed(digits: number): string }>()
      }
      return fallback
    }))
  })
  it("rejects explicit output-only annotations", () => {
    const outputOnly = (_error: "source-error" | "schedule-error", _previous: Option.Option<number>) => fallback
    expect(Effect.repeatOrElse).type.not.toBeCallableWith(source, schedule, outputOnly)
    expect(Effect.repeatOrElse).type.not.toBeCallableWith(schedule, outputOnly)
  })
  it("accepts explicit metadata annotations and generic arities", () => {
    const recover = (
      _error: "source-error" | "schedule-error",
      previous: Option.Option<Schedule.Metadata<number, string>>
    ) => {
      expect(previous).type.toBe<Option.Option<Schedule.Metadata<number, string>>>()
      return fallback
    }
    const direct = Effect.repeatOrElse<
      string,
      "source-error",
      "source-service",
      "schedule-service",
      number,
      "schedule-error",
      "fallback-error",
      "fallback-service"
    >(source, schedule, recover)
    const curried = Effect.repeatOrElse<
      "schedule-service",
      string,
      number,
      "source-error",
      "schedule-error",
      "fallback-error",
      "fallback-service"
    >(schedule, recover)(source)
    expect(direct).type.toBe<
      Effect.Effect<number, "fallback-error", "source-service" | "schedule-service" | "fallback-service">
    >()
    expect(curried).type.toBe<typeof direct>()
  })
  it("control fallback can ignore previous and handles both errors", () => {
    const result = Effect.repeatOrElse(source, schedule, (error, previous) => {
      expect(error).type.toBe<"source-error" | "schedule-error">()
      expect(Option.isNone(previous)).type.toBe<boolean>()
      return fallback
    })
    expect(result).type.toBe<
      Effect.Effect<number, "fallback-error", "source-service" | "schedule-service" | "fallback-service">
    >()
  })
})
