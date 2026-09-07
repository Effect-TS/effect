import { Effect, type Redacted } from "effect"
import { Argument, Flag, Param, Primitive, Prompt } from "effect/unstable/cli"
import { describe, expect, it } from "tstyche"

describe("Param", () => {
  it("uses Schema and Config names for scalar constructors", () => {
    expect(Primitive.String).type.toBe<Primitive.Primitive<string>>()
    expect(Flag.String("value")).type.toBe<Flag.Flag<string>>()
    expect(Param.String(Param.flagKind, "value")).type.toBe<Param.Param<"flag", string>>()
    expect(Argument.String("value")).type.toBe<Argument.Argument<string>>()
    expect(Primitive.Boolean).type.toBe<Primitive.Primitive<boolean>>()
    expect(Flag.Boolean("value")).type.toBe<Flag.Flag<boolean>>()
    expect(Param.Boolean(Param.flagKind, "value")).type.toBe<Param.Param<"flag", boolean>>()
    expect(Primitive.Finite).type.toBe<Primitive.Primitive<number>>()
    expect(Flag.Finite("value")).type.toBe<Flag.Flag<number>>()
    expect(Param.Finite(Param.flagKind, "value")).type.toBe<Param.Param<"flag", number>>()
    expect(Argument.Finite("value")).type.toBe<Argument.Argument<number>>()
    expect(Primitive.Int).type.toBe<Primitive.Primitive<number>>()
    expect(Flag.Int("value")).type.toBe<Flag.Flag<number>>()
    expect(Param.Int(Param.flagKind, "value")).type.toBe<Param.Param<"flag", number>>()
    expect(Argument.Int("value")).type.toBe<Argument.Argument<number>>()
    expect(Primitive.Date).type.toBe<Primitive.Primitive<Date>>()
    expect(Flag.Date("value")).type.toBe<Flag.Flag<Date>>()
    expect(Param.Date(Param.flagKind, "value")).type.toBe<Param.Param<"flag", Date>>()
    expect(Argument.Date("value")).type.toBe<Argument.Argument<Date>>()
    expect(Primitive.Redacted).type.toBe<Primitive.Primitive<Redacted.Redacted<string>>>()
    expect(Flag.Redacted("value")).type.toBe<Flag.Flag<Redacted.Redacted<string>>>()
    expect(Param.Redacted(Param.flagKind, "value")).type.toBe<Param.Param<"flag", Redacted.Redacted<string>>>()
    expect(Argument.Redacted("value")).type.toBe<Argument.Argument<Redacted.Redacted<string>>>()
  })

  it("accepts effectful fallback prompts for flags and arguments", () => {
    const prompt = Effect.succeed(Prompt.text({ message: "Name" }))
    const integerPrompt = Effect.succeed(Prompt.integer({ message: "Count" }))

    const flag = Flag.String("name").pipe(Flag.withFallbackPrompt(prompt))
    const argument = Argument.String("name").pipe(Argument.withFallbackPrompt(prompt))
    const integerFlag = Flag.String("count").pipe(Flag.withFallbackPrompt(integerPrompt))
    const integerArgument = Argument.String("count").pipe(Argument.withFallbackPrompt(integerPrompt))

    expect(flag).type.toBe<Flag.Flag<string>>()
    expect(argument).type.toBe<Argument.Argument<string>>()
    expect(integerFlag).type.toBe<Flag.Flag<string | number>>()
    expect(integerArgument).type.toBe<Argument.Argument<string | number>>()
  })
})
