import type * as Options from "../Options.js"
import type * as ShellType from "../ShellType.js"
import * as InternalOptions from "./options.js"

/** @internal */
export const bash: ShellType.ShellType = {
  _tag: "Bash"
}

/** @internal */
export const fish: ShellType.ShellType = {
  _tag: "Fish"
}

/** @internal */
export const zsh: ShellType.ShellType = {
  _tag: "Zsh"
}

/** @internal */
export const shellOption: Options.Options<ShellType.ShellType> = InternalOptions.choiceWithValue(
  "shell-type",
  [
    ["sh", bash],
    ["bash", bash],
    ["fish", fish],
    ["zsh", zsh]
  ]
)
