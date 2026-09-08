import { Effect, type Redacted, Schema } from "effect"
import {
  Argument,
  CliConfig,
  CliOutput,
  Command,
  Completions,
  Flag,
  GlobalFlag,
  Param,
  Primitive,
  Prompt
} from "effect/unstable/cli"
import { describe, expect, it } from "tstyche"

describe("CLI constructors", () => {
  it("Primitive preserves constructor results and inference", () => {
    expect(Primitive.Choice([["dev", 1], ["prod", 2]] as const)).type.toBe<Primitive.Primitive<1 | 2>>()
    expect(Primitive.Path("either", false)).type.toBe<Primitive.Primitive<string>>()
    expect(Primitive.FileText).type.toBe<Primitive.Primitive<string>>()
    expect(Primitive.FileParse()).type.toBe<Primitive.Primitive<unknown>>()
    expect(Primitive.FileSchema(Schema.Struct({ enabled: Schema.Boolean }))).type.toBe<
      Primitive.Primitive<{ readonly enabled: boolean }>
    >()
    expect(Primitive.None).type.toBe<Primitive.Primitive<never>>()
    expect(Primitive.KeyValuePair).type.toBe<Primitive.Primitive<Record<string, string>>>()
  })
  it("Flag preserves constructor results and inference", () => {
    expect(Flag.Literals("value", ["dev", "prod"] as const)).type.toBe<Flag.Flag<"dev" | "prod">>()
    expect(Flag.Path("value")).type.toBe<Flag.Flag<string>>()
    expect(Flag.FileText("value")).type.toBe<Flag.Flag<string>>()
    expect(Flag.FileParse("value")).type.toBe<Flag.Flag<unknown>>()
    expect(Flag.FileSchema("value", Schema.Struct({ enabled: Schema.Boolean }))).type.toBe<
      Flag.Flag<{ readonly enabled: boolean }>
    >()
    expect(Flag.Never).type.toBe<Flag.Flag<never>>()
    expect(Flag.ChoiceWithValue("value", [["dev", 1], ["prod", 2]] as const)).type.toBe<Flag.Flag<1 | 2>>()
    expect(Flag.File("value")).type.toBe<Flag.Flag<string>>()
    expect(Flag.Directory("value")).type.toBe<Flag.Flag<string>>()
    expect(Flag.KeyValuePair("value")).type.toBe<Flag.Flag<Record<string, string>>>()
  })
  it("Argument preserves constructor results and inference", () => {
    expect(Argument.Literals("value", ["dev", "prod"] as const)).type.toBe<Argument.Argument<"dev" | "prod">>()
    expect(Argument.Path("value")).type.toBe<Argument.Argument<string>>()
    expect(Argument.FileText("value")).type.toBe<Argument.Argument<string>>()
    expect(Argument.FileParse("value")).type.toBe<Argument.Argument<unknown>>()
    expect(Argument.FileSchema("value", Schema.Struct({ enabled: Schema.Boolean }))).type.toBe<
      Argument.Argument<{ readonly enabled: boolean }>
    >()
    expect(Argument.None).type.toBe<Argument.Argument<never>>()
    expect(Argument.ChoiceWithValue("value", [["dev", 1], ["prod", 2]] as const)).type.toBe<Argument.Argument<1 | 2>>()
    expect(Argument.File("value")).type.toBe<Argument.Argument<string>>()
    expect(Argument.Directory("value")).type.toBe<Argument.Argument<string>>()
  })
  it("Param preserves constructor results and inference", () => {
    expect(Param.Literals(Param.flagKind, "value", ["dev", "prod"] as const)).type.toBe<
      Param.Param<"flag", "dev" | "prod">
    >()
    expect(Param.Path(Param.flagKind, "value")).type.toBe<Param.Param<"flag", string>>()
    expect(Param.FileText(Param.flagKind, "value")).type.toBe<Param.Param<"flag", string>>()
    expect(Param.FileParse(Param.flagKind, "value")).type.toBe<Param.Param<"flag", unknown>>()
    expect(Param.FileSchema(Param.flagKind, "value", Schema.Struct({ enabled: Schema.Boolean }))).type.toBe<
      Param.Param<"flag", { readonly enabled: boolean }>
    >()
    expect(Param.None(Param.flagKind)).type.toBe<Param.Param<"flag", never>>()
    expect(Param.ChoiceWithValue(Param.flagKind, "value", [["dev", 1], ["prod", 2]] as const)).type.toBe<
      Param.Param<"flag", 1 | 2>
    >()
    expect(Param.File(Param.flagKind, "value")).type.toBe<Param.Param<"flag", string>>()
    expect(Param.Directory(Param.flagKind, "value")).type.toBe<Param.Param<"flag", string>>()
    expect(Param.KeyValuePair(Param.flagKind, "value")).type.toBe<Param.Param<"flag", Record<string, string>>>()
  })
  it("Prompt preserves control output types", () => {
    expect(Prompt.Confirm({ message: "Value" })).type.toBe<Prompt.Prompt<boolean>>()
    expect(Prompt.Date({ message: "Value" })).type.toBe<Prompt.Prompt<Date>>()
    expect(Prompt.File({ message: "Value" })).type.toBe<Prompt.Prompt<string>>()
    expect(Prompt.Number({ message: "Value" })).type.toBe<Prompt.Prompt<number>>()
    expect(Prompt.Hidden({ message: "Value" })).type.toBe<Prompt.Prompt<Redacted.Redacted<string>>>()
    expect(Prompt.Int({ message: "Value" })).type.toBe<Prompt.Prompt<number>>()
    expect(Prompt.List({ message: "Value" })).type.toBe<Prompt.Prompt<Array<string>>>()
    expect(Prompt.Password({ message: "Value" })).type.toBe<Prompt.Prompt<Redacted.Redacted<string>>>()
    expect(Prompt.String({ message: "Value" })).type.toBe<Prompt.Prompt<string>>()
    expect(Prompt.Toggle({ message: "Value" })).type.toBe<Prompt.Prompt<boolean>>()
    expect(Prompt.Select({ message: "Value", choices: [{ title: "Development", value: "dev" }] })).type.toBe<
      Prompt.Prompt<"dev">
    >()
    expect(Prompt.AutoComplete({ message: "Value", choices: [{ title: "Development", value: "dev" }] })).type.toBe<
      Prompt.Prompt<"dev">
    >()
    expect(Prompt.MultiSelect({ message: "Value", choices: [{ title: "Development", value: "dev" }] })).type.toBe<
      Prompt.Prompt<Array<"dev">>
    >()
    expect(Prompt.succeed(42)).type.toBe<Prompt.Prompt<number>>()
    expect(Prompt.makeTheme()).type.toBe<Prompt.Theme>()
  })
  it("supports the public construction factories", () => {
    expect(Command.make).type.toBeCallableWith("example")
    expect(Param.makeSingle).type.toBeCallableWith({
      name: "value",
      kind: Param.flagKind,
      primitiveType: Primitive.String
    })
    expect(CliConfig.make()).type.toBe<CliConfig.CliConfig.Service>()
    expect(CliOutput.defaultFormatter()).type.toBe<CliOutput.Formatter>()
    expect(Completions.generate).type.toBeCallableWith("example", "bash", {
      name: "example",
      description: undefined,
      flags: [],
      arguments: [],
      subcommands: []
    })
    expect(GlobalFlag.Action({ flag: Flag.Boolean("help"), run: () => Effect.void })).type.toBe<
      GlobalFlag.Action<boolean>
    >()
    expect(GlobalFlag.Setting("verbose")({ flag: Flag.Boolean("verbose") })).type.toBe<
      GlobalFlag.Setting<"verbose", boolean>
    >()
  })
})
