/**
 * @since 1.0.0
 */
import * as InternalShellType from "./internal/shellType.js"
import type { Options } from "./Options.js"

/**
 * @since 1.0.0
 * @category models
 */
export type ShellType = Bash | ZShell

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
export interface ZShell {
  readonly _tag: "ZShell"
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
export const zShell: ShellType = InternalShellType.zShell

/**
 * @since 1.0.0
 * @category options
 */
export const shellOption: Options<ShellType> = InternalShellType.shellOption
