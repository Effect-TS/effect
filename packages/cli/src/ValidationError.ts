/**
 * @since 1.0.0
 */
import type { HelpDoc } from "./HelpDoc.js"
import * as internal from "./internal/validationError.js"

/**
 * @since 1.0.0
 * @category symbols
 */
export const ValidationErrorTypeId: unique symbol = internal.ValidationErrorTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type ValidationErrorTypeId = typeof ValidationErrorTypeId

/**
 * @since 1.0.0
 * @category models
 */
export type ValidationError =
  | CommandMismatch
  | CorrectedFlag
  | InvalidArgument
  | InvalidValue
  | KeyValuesDetected
  | MissingValue
  | MissingFlag
  | MissingSubcommand
  | NoBuiltInMatch
  | UnclusteredFlag

/**
 * @since 1.0.0
 * @category models
 */
export interface CommandMismatch extends ValidationError.Proto {
  readonly _tag: "CommandMismatch"
}

/**
 * @since 1.0.0
 * @category models
 */
export interface CorrectedFlag extends ValidationError.Proto {
  readonly _tag: "CorrectedFlag"
}

/**
 * @since 1.0.0
 * @category models
 */
export interface InvalidArgument extends ValidationError.Proto {
  readonly _tag: "InvalidArgument"
}

/**
 * @since 1.0.0
 * @category models
 */
export interface InvalidValue extends ValidationError.Proto {
  readonly _tag: "InvalidValue"
}

/**
 * @since 1.0.0
 * @category models
 */
export interface KeyValuesDetected extends ValidationError.Proto {
  readonly _tag: "KeyValuesDetected"
  readonly keyValues: ReadonlyArray<string>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface MissingFlag extends ValidationError.Proto {
  readonly _tag: "MissingFlag"
}

/**
 * @since 1.0.0
 * @category models
 */
export interface MissingValue extends ValidationError.Proto {
  readonly _tag: "MissingValue"
}

/**
 * @since 1.0.0
 * @category models
 */
export interface MissingSubcommand extends ValidationError.Proto {
  readonly _tag: "MissingSubcommand"
}

/**
 * @since 1.0.0
 * @category models
 */
export interface NoBuiltInMatch extends ValidationError.Proto {
  readonly _tag: "NoBuiltInMatch"
}

/**
 * @since 1.0.0
 * @category models
 */
export interface UnclusteredFlag extends ValidationError.Proto {
  readonly _tag: "UnclusteredFlag"
  readonly unclustered: ReadonlyArray<string>
  readonly rest: ReadonlyArray<string>
}

/**
 * @since 1.0.0
 */
export declare namespace ValidationError {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto {
    readonly [ValidationErrorTypeId]: ValidationErrorTypeId
    readonly error: HelpDoc
  }
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isCommandMismatch: (self: ValidationError) => self is CommandMismatch =
  internal.isCommandMismatch

/**
 * @since 1.0.0
 * @category refinements
 */
export const isCorrectedFlag: (self: ValidationError) => self is CorrectedFlag =
  internal.isCorrectedFlag

/**
 * @since 1.0.0
 * @category refinements
 */
export const isInvalidArgument: (self: ValidationError) => self is InvalidArgument =
  internal.isInvalidArgument

/**
 * @since 1.0.0
 * @category refinements
 */
export const isInvalidValue: (self: ValidationError) => self is InvalidValue =
  internal.isInvalidValue

/**
 * @since 1.0.0
 * @category refinements
 */
export const isKeyValuesDetected: (self: ValidationError) => self is KeyValuesDetected =
  internal.isKeyValuesDetected

/**
 * @since 1.0.0
 * @category refinements
 */
export const isMissingFlag: (self: ValidationError) => self is MissingFlag = internal.isMissingFlag

/**
 * @since 1.0.0
 * @category refinements
 */
export const isMissingValue: (self: ValidationError) => self is MissingValue =
  internal.isMissingValue

/**
 * @since 1.0.0
 * @category refinements
 */
export const isMissingSubcommand: (self: ValidationError) => self is MissingSubcommand =
  internal.isMissingSubcommand

/**
 * @since 1.0.0
 * @category refinements
 */
export const isNoBuiltInMatch: (self: ValidationError) => self is NoBuiltInMatch =
  internal.isNoBuiltInMatch

/**
 * @since 1.0.0
 * @category refinements
 */
export const isUnclusteredFlag: (self: ValidationError) => self is UnclusteredFlag =
  internal.isUnclusteredFlag

/**
 * @since 1.0.0
 * @category constructors
 */
export const commandMismatch: (error: HelpDoc) => ValidationError = internal.commandMismatch

/**
 * @since 1.0.0
 * @category constructors
 */
export const correctedFlag: (error: HelpDoc) => ValidationError = internal.correctedFlag

/**
 * @since 1.0.0
 * @category constructors
 */
export const invalidArgument: (error: HelpDoc) => ValidationError = internal.invalidArgument

/**
 * @since 1.0.0
 * @category constructors
 */
export const invalidValue: (error: HelpDoc) => ValidationError = internal.invalidValue

/**
 * @since 1.0.0
 * @category constructors
 */
export const keyValuesDetected: (
  error: HelpDoc,
  keyValues: ReadonlyArray<string>
) => ValidationError = internal.keyValuesDetected

/**
 * @since 1.0.0
 * @category constructors
 */
export const missingFlag: (error: HelpDoc) => ValidationError = internal.missingFlag

/**
 * @since 1.0.0
 * @category constructors
 */
export const missingValue: (error: HelpDoc) => ValidationError = internal.missingValue

/**
 * @since 1.0.0
 * @category constructors
 */
export const missingSubcommand: (error: HelpDoc) => ValidationError = internal.missingSubcommand

/**
 * @since 1.0.0
 * @category constructors
 */
export const noBuiltInMatch: (error: HelpDoc) => ValidationError = internal.noBuiltInMatch

/**
 * @since 1.0.0
 * @category constructors
 */
export const unclusteredFlag: (
  error: HelpDoc,
  unclustered: ReadonlyArray<string>,
  rest: ReadonlyArray<string>
) => ValidationError = internal.unclusteredFlag
