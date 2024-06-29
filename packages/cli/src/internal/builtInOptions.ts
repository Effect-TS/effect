import * as LogLevel from "effect/LogLevel"
import * as Option from "effect/Option"
import type * as BuiltInOptions from "../BuiltInOptions.js"
import type * as Command from "../CommandDescriptor.js"
import type * as HelpDoc from "../HelpDoc.js"
import type * as Options from "../Options.js"
import type * as Usage from "../Usage.js"
import * as InternalOptions from "./options.js"

/** @internal */
export const setLogLevel = (
  level: LogLevel.LogLevel
): BuiltInOptions.BuiltInOptions => ({
  _tag: "SetLogLevel",
  level
})

/** @internal */
export const showCompletions = (
  shellType: BuiltInOptions.BuiltInOptions.ShellType
): BuiltInOptions.BuiltInOptions => ({
  _tag: "ShowCompletions",
  shellType
})

/** @internal */
export const showHelp = (
  usage: Usage.Usage,
  helpDoc: HelpDoc.HelpDoc
): BuiltInOptions.BuiltInOptions => ({
  _tag: "ShowHelp",
  usage,
  helpDoc
})

/** @internal */
export const showWizard = (command: Command.Command<unknown>): BuiltInOptions.BuiltInOptions => ({
  _tag: "ShowWizard",
  command
})

/** @internal */
export const showVersion: BuiltInOptions.BuiltInOptions = {
  _tag: "ShowVersion"
}

/** @internal */
export const isShowCompletions = (
  self: BuiltInOptions.BuiltInOptions
): self is BuiltInOptions.ShowCompletions => self._tag === "ShowCompletions"

/** @internal */
export const isShowHelp = (self: BuiltInOptions.BuiltInOptions): self is BuiltInOptions.ShowHelp =>
  self._tag === "ShowHelp"

/** @internal */
export const isShowWizard = (
  self: BuiltInOptions.BuiltInOptions
): self is BuiltInOptions.ShowWizard => self._tag === "ShowWizard"

/** @internal */
export const isShowVersion = (
  self: BuiltInOptions.BuiltInOptions
): self is BuiltInOptions.ShowVersion => self._tag === "ShowVersion"

/** @internal */
export const completionsOptions: Options.Options<
  Option.Option<BuiltInOptions.BuiltInOptions.ShellType>
> = InternalOptions.choiceWithValue("completions", [
  ["sh", "bash" as const],
  ["bash", "bash" as const],
  ["fish", "fish" as const],
  ["zsh", "zsh" as const]
]).pipe(
  InternalOptions.optional,
  InternalOptions.withDescription("Generate a completion script for a specific shell.")
)

/** @internal */
export const logLevelOptions: Options.Options<
  Option.Option<LogLevel.LogLevel>
> = InternalOptions.choiceWithValue(
  "log-level",
  LogLevel.allLevels.map((level) => [level._tag.toLowerCase(), level] as const)
).pipe(
  InternalOptions.optional,
  InternalOptions.withDescription("Sets the minimum log level for a command.")
)

/** @internal */
export const helpOptions: Options.Options<boolean> = InternalOptions.boolean("help").pipe(
  InternalOptions.withAlias("h"),
  InternalOptions.withDescription("Show the help documentation for a command.")
)

/** @internal */
export const versionOptions: Options.Options<boolean> = InternalOptions.boolean("version").pipe(
  InternalOptions.withDescription("Show the version of the application.")
)

/** @internal */
export const wizardOptions: Options.Options<boolean> = InternalOptions.boolean("wizard").pipe(
  InternalOptions.withDescription("Start wizard mode for a command.")
)

/** @internal */
export const builtIns = InternalOptions.all({
  completions: completionsOptions,
  logLevel: logLevelOptions,
  help: helpOptions,
  wizard: wizardOptions,
  version: versionOptions
})

/** @internal */
export const builtInOptions = <A>(
  command: Command.Command<A>,
  usage: Usage.Usage,
  helpDoc: HelpDoc.HelpDoc
): Options.Options<Option.Option<BuiltInOptions.BuiltInOptions>> =>
  InternalOptions.map(builtIns, (builtIn) => {
    if (Option.isSome(builtIn.completions)) {
      return Option.some(showCompletions(builtIn.completions.value))
    }
    if (Option.isSome(builtIn.logLevel)) {
      return Option.some(setLogLevel(builtIn.logLevel.value))
    }
    if (builtIn.help) {
      return Option.some(showHelp(usage, helpDoc))
    }
    if (builtIn.wizard) {
      return Option.some(showWizard(command))
    }
    if (builtIn.version) {
      return Option.some(showVersion)
    }
    return Option.none()
  })
