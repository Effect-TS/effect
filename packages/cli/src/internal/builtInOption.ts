import type * as BuiltInOption from "@effect/cli/BuiltInOption"
import type * as Command from "@effect/cli/Command"
import type * as HelpDoc from "@effect/cli/HelpDoc"
import * as options from "@effect/cli/internal/options"
import * as _shellType from "@effect/cli/internal/shellType"
import type * as Options from "@effect/cli/Options"
import type * as ShellType from "@effect/cli/ShellType"
import type * as Usage from "@effect/cli/Usage"
import * as Option from "@effect/data/Option"

/** @internal */
export const showCompletions = (index: number, shellType: ShellType.ShellType): BuiltInOption.BuiltInOption => ({
  _tag: "ShowCompletions",
  index,
  shellType
})

/** @internal */
export const showCompletionScript = (
  pathToExecutable: string,
  shellType: ShellType.ShellType
): BuiltInOption.BuiltInOption => ({
  _tag: "ShowCompletionScript",
  pathToExecutable,
  shellType
})

/** @internal */
export const showHelp = (usage: Usage.Usage, helpDoc: HelpDoc.HelpDoc): BuiltInOption.BuiltInOption => ({
  _tag: "ShowHelp",
  usage,
  helpDoc
})

/** @internal */
export const wizard = (commmand: Command.Command<unknown>): BuiltInOption.BuiltInOption => ({
  _tag: "Wizard",
  commmand
})

/** @internal */
export const isShowCompletionScript = (self: BuiltInOption.BuiltInOption): self is BuiltInOption.ShowCompletionScript =>
  self._tag === "ShowCompletionScript"

/** @internal */
export const isShowCompletions = (self: BuiltInOption.BuiltInOption): self is BuiltInOption.ShowCompletions =>
  self._tag === "ShowCompletions"

/** @internal */
export const isShowHelp = (self: BuiltInOption.BuiltInOption): self is BuiltInOption.ShowHelp =>
  self._tag === "ShowHelp"

/** @internal */
export const isWizard = (self: BuiltInOption.BuiltInOption): self is BuiltInOption.Wizard => self._tag === "Wizard"

/** @internal */
export const builtInOptions = <A>(
  command: Command.Command<A>,
  usage: Usage.Usage,
  helpDoc: HelpDoc.HelpDoc
): Options.Options<Option.Option<BuiltInOption.BuiltInOption>> => {
  const help = options.alias(options.boolean("help"), "h")
  // TODO: after path/file primitives added
  // const completionScriptPath = options.optional(options.file("shell-completion-script"))
  const shellCompletionScriptPath = options.optional(options.text("shell-completion-script"))
  const shellType = options.optional(_shellType.shellOption)
  const shellCompletionIndex = options.optional(options.integer("shell-completion-index"))
  const wizardOption = options.boolean("wizard")
  const option = options.all({
    shellCompletionScriptPath,
    shellType,
    shellCompletionIndex,
    help,
    wizard: wizardOption
  })
  return options.map(option, (builtIn) => {
    if (builtIn.help) {
      return Option.some(showHelp(usage, helpDoc))
    }
    if (builtIn.wizard) {
      return Option.some(wizard(command))
    }
    if (Option.isSome(builtIn.shellCompletionScriptPath) && Option.isSome(builtIn.shellType)) {
      return Option.some(showCompletionScript(builtIn.shellCompletionScriptPath.value, builtIn.shellType.value))
    }
    if (Option.isSome(builtIn.shellType) && Option.isSome(builtIn.shellCompletionIndex)) {
      return Option.some(showCompletions(builtIn.shellCompletionIndex.value, builtIn.shellType.value))
    }
    return Option.none()
  })
}
