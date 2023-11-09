/**
 * @since 1.0.0
 */

import type { Option } from "effect/Option"
import type { Command } from "./Command"
import type { HelpDoc } from "./HelpDoc"
import * as InternalBuiltInOptions from "./internal/builtInOptions"
import type { Options } from "./Options"
import type { ShellType } from "./ShellType"
import type { Usage } from "./Usage"

/**
 * @since 1.0.0
 * @category models
 */
export type BuiltInOptions = ShowHelp | ShowCompletionScript | ShowCompletions | ShowWizard

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
export interface ShowWizard {
  readonly _tag: "ShowWizard"
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
) => Options<Option<BuiltInOptions>> = InternalBuiltInOptions.builtInOptions

/**
 * @since 1.0.0
 * @category refinements
 */
export const isShowCompletionScript: (self: BuiltInOptions) => self is ShowCompletionScript =
  InternalBuiltInOptions.isShowCompletionScript

/**
 * @since 1.0.0
 * @category refinements
 */
export const isShowCompletions: (self: BuiltInOptions) => self is ShowCompletions =
  InternalBuiltInOptions.isShowCompletions

/**
 * @since 1.0.0
 * @category refinements
 */
export const isShowHelp: (self: BuiltInOptions) => self is ShowHelp = InternalBuiltInOptions.isShowHelp

/**
 * @since 1.0.0
 * @category refinements
 */
export const isShowWizard: (self: BuiltInOptions) => self is ShowWizard = InternalBuiltInOptions.isShowWizard

/**
 * @since 1.0.0
 * @category constructors
 */
export const showCompletions: (index: number, shellType: ShellType) => BuiltInOptions =
  InternalBuiltInOptions.showCompletions

/**
 * @since 1.0.0
 * @category constructors
 */
export const showCompletionScript: (pathToExecutable: string, shellType: ShellType) => BuiltInOptions =
  InternalBuiltInOptions.showCompletionScript

/**
 * @since 1.0.0
 * @category constructors
 */
export const showHelp: (usage: Usage, helpDoc: HelpDoc) => BuiltInOptions = InternalBuiltInOptions.showHelp

/**
 * @since 1.0.0
 * @category constructors
 */
export const showWizard: (commmand: Command<unknown>) => BuiltInOptions = InternalBuiltInOptions.showWizard
