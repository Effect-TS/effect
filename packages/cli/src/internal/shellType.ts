import type * as Options from "../Options"
import type * as ShellType from "../ShellType"
import * as InternalOptions from "./options"

/** @internal */
export const bash: ShellType.ShellType = {
  _tag: "Bash"
}

/** @internal */
export const zShell: ShellType.ShellType = {
  _tag: "ZShell"
}

/** @internal */
export const shellOption: Options.Options<ShellType.ShellType> = InternalOptions.choiceWithValue("shell-type", [
  ["sh", bash],
  ["bash", bash],
  ["zsh", zShell]
])
