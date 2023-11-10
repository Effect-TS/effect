/**
 * @since 1.0.0
 */
import * as InternalShellType from "./internal/shellType.js"
import type { Options } from "./Options.js"

/**
 * @since 1.0.0
 * @category models
 */
export type ShellType = Bash | Fish | Zsh

/**
 * @since 1.0.0
 * @category models
 */
export interface Bash {
  readonly _tag: "Bash"
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Fish {
  readonly _tag: "Fish"
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Zsh {
  readonly _tag: "Zsh"
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const bash: ShellType = InternalShellType.bash

/**
 * @since 1.0.0
 * @category constructors
 */
export const fish: ShellType = InternalShellType.fish

/**
 * @since 1.0.0
 * @category constructors
 */
export const zsh: ShellType = InternalShellType.zsh

/**
 * @since 1.0.0
 * @category options
 */
export const shellOption: Options<ShellType> = InternalShellType.shellOption
