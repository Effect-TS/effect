import * as Option from "effect/Option"
import type * as BuiltInOptions from "../BuiltInOptions"
import type * as Command from "../Command"
import type * as HelpDoc from "../HelpDoc"
import type * as Options from "../Options"
import type * as ShellType from "../ShellType"
import type * as Usage from "../Usage"
import * as options from "./options"
import * as _shellType from "./shellType"

/** @internal */
export const showCompletions = (index: number, shellType: ShellType.ShellType): BuiltInOptions.BuiltInOptions => ({
  _tag: "ShowCompletions",
  index,
  shellType
})

/** @internal */
export const showCompletionScript = (
  pathToExecutable: string,
  shellType: ShellType.ShellType
): BuiltInOptions.BuiltInOptions => ({
  _tag: "ShowCompletionScript",
  pathToExecutable,
  shellType
})

/** @internal */
export const showHelp = (usage: Usage.Usage, helpDoc: HelpDoc.HelpDoc): BuiltInOptions.BuiltInOptions => ({
  _tag: "ShowHelp",
  usage,
  helpDoc
})

/** @internal */
export const showWizard = (commmand: Command.Command<unknown>): BuiltInOptions.BuiltInOptions => ({
  _tag: "ShowWizard",
  commmand
})

/** @internal */
export const isShowCompletionScript = (
  self: BuiltInOptions.BuiltInOptions
): self is BuiltInOptions.ShowCompletionScript => self._tag === "ShowCompletionScript"

/** @internal */
export const isShowCompletions = (self: BuiltInOptions.BuiltInOptions): self is BuiltInOptions.ShowCompletions =>
  self._tag === "ShowCompletions"

/** @internal */
export const isShowHelp = (self: BuiltInOptions.BuiltInOptions): self is BuiltInOptions.ShowHelp =>
  self._tag === "ShowHelp"

/** @internal */
export const isShowWizard = (self: BuiltInOptions.BuiltInOptions): self is BuiltInOptions.ShowWizard =>
  self._tag === "ShowWizard"

/** @internal */
export const builtInOptions = <A>(
  command: Command.Command<A>,
  usage: Usage.Usage,
  helpDoc: HelpDoc.HelpDoc
): Options.Options<Option.Option<BuiltInOptions.BuiltInOptions>> => {
  const help = options.boolean("help").pipe(options.withAlias("h"))
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
      return Option.some(showWizard(command))
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
