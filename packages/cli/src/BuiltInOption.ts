/**
 * @since 1.0.0
 */

import type { Command } from "@effect/cli/Command"
import type { HelpDoc } from "@effect/cli/HelpDoc"
import * as internal from "@effect/cli/internal/builtInOption"
import type { Options } from "@effect/cli/Options"
import type { ShellType } from "@effect/cli/ShellType"
import type { Usage } from "@effect/cli/Usage"
import type { Option } from "effect/Option"

/**
 * @since 1.0.0
 * @category models
 */
export type BuiltInOption = ShowHelp | ShowCompletionScript | ShowCompletions | Wizard

/**
 * @since 1.0.0
 * @category models
 */
export interface ShowHelp {
  readonly _tag: "ShowHelp"
  readonly usage: Usage
  readonly helpDoc: HelpDoc
}

/**
 * @since 1.0.0
 * @category models
 */
export interface ShowCompletionScript {
  readonly _tag: "ShowCompletionScript"
  readonly pathToExecutable: string
  readonly shellType: ShellType
}

/**
 * @since 1.0.0
 * @category models
 */
export interface ShowCompletions {
  readonly _tag: "ShowCompletions"
  readonly index: number
  readonly shellType: ShellType
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Wizard {
  readonly _tag: "Wizard"
  readonly commmand: Command<unknown>
}

/**
 * @since 1.0.0
 * @category options
 */
export const builtInOptions: <A>(
  command: Command<A>,
  usage: Usage,
  helpDoc: HelpDoc
) => Options<Option<BuiltInOption>> = internal.builtInOptions

/**
 * @since 1.0.0
 * @category refinements
 */
export const isShowCompletionScript: (self: BuiltInOption) => self is ShowCompletionScript =
  internal.isShowCompletionScript

/**
 * @since 1.0.0
 * @category refinements
 */
export const isShowCompletions: (self: BuiltInOption) => self is ShowCompletions = internal.isShowCompletions

/**
 * @since 1.0.0
 * @category refinements
 */
export const isShowHelp: (self: BuiltInOption) => self is ShowHelp = internal.isShowHelp

/**
 * @since 1.0.0
 * @category refinements
 */
export const isWizard: (self: BuiltInOption) => self is Wizard = internal.isWizard

/**
 * @since 1.0.0
 * @category constructors
 */
export const showCompletions: (index: number, shellType: ShellType) => BuiltInOption = internal.showCompletions

/**
 * @since 1.0.0
 * @category constructors
 */
export const showCompletionScript: (pathToExecutable: string, shellType: ShellType) => BuiltInOption =
  internal.showCompletionScript

/**
 * @since 1.0.0
 * @category constructors
 */
export const showHelp: (usage: Usage, helpDoc: HelpDoc) => BuiltInOption = internal.showHelp

/**
 * @since 1.0.0
 * @category constructors
 */
export const wizard: (commmand: Command<unknown>) => BuiltInOption = internal.wizard
