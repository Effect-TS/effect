import * as Option from "effect/Option"
import type * as BuiltInOptions from "../BuiltInOptions.js"
import type * as Command from "../Command.js"
import type * as HelpDoc from "../HelpDoc.js"
import type * as Options from "../Options.js"
import type * as ShellType from "../ShellType.js"
import type * as Usage from "../Usage.js"
import * as InternalOptions from "./options.js"
import * as InternalShellType from "./shellType.js"

/** @internal */
export const showCompletions = (
  index: number,
  shellType: ShellType.ShellType
): BuiltInOptions.BuiltInOptions => ({
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
export const isShowCompletionScript = (
  self: BuiltInOptions.BuiltInOptions
): self is BuiltInOptions.ShowCompletionScript => self._tag === "ShowCompletionScript"

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
export const builtInOptions = <A>(
  command: Command.Command<A>,
  usage: Usage.Usage,
  helpDoc: HelpDoc.HelpDoc
): Options.Options<Option.Option<BuiltInOptions.BuiltInOptions>> => {
  const help = InternalOptions.boolean("help").pipe(InternalOptions.withAlias("h"))
  const shellCompletionScriptPath = InternalOptions.optional(
    InternalOptions.file("shell-completion-script")
  )
  const shellType = InternalOptions.optional(InternalShellType.shellOption)
  const shellCompletionIndex = InternalOptions.optional(
    InternalOptions.integer("shell-completion-index")
  )
  const wizard = InternalOptions.boolean("wizard")
  const version = InternalOptions.boolean("version")
  const option = InternalOptions.all({
    shellCompletionScriptPath,
    shellType,
    shellCompletionIndex,
    help,
    wizard,
    version
  })
  return InternalOptions.map(option, (builtIn) => {
    if (builtIn.help) {
      return Option.some(showHelp(usage, helpDoc))
    }
    if (builtIn.wizard) {
      return Option.some(showWizard(command))
    }
    if (builtIn.version) {
      return Option.some(showVersion)
    }
    if (Option.isSome(builtIn.shellCompletionScriptPath) && Option.isSome(builtIn.shellType)) {
      return Option.some(
        showCompletionScript(builtIn.shellCompletionScriptPath.value, builtIn.shellType.value)
      )
    }
    if (Option.isSome(builtIn.shellType) && Option.isSome(builtIn.shellCompletionIndex)) {
      return Option.some(
        showCompletions(builtIn.shellCompletionIndex.value, builtIn.shellType.value)
      )
    }
    return Option.none()
  })
}
