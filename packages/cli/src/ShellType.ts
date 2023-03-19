/**
 * @since 1.0.0
 */
import * as internal from "@effect/cli/internal_effect_untraced/shellType"
import type { Options } from "@effect/cli/Options"

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
export const bash: ShellType = internal.bash

/**
 * @since 1.0.0
 * @category constructors
 */
export const zShell: ShellType = internal.zShell

/**
 * @since 1.0.0
 * @category options
 */
export const shellOption: Options<ShellType> = internal.shellOption
