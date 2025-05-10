/**
 * @since 1.0.0
 */
import type { Command } from "./CommandDescriptor.js"
import type { HelpDoc } from "./HelpDoc.js"
import * as InternalCommand from "./internal/commandDescriptor.js"
import * as InternalValidationError from "./internal/validationError.js"

/**
 * @since 1.0.0
 * @category symbols
 */
export const ValidationErrorTypeId: unique symbol = InternalValidationError.ValidationErrorTypeId

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
  | HelpRequested
  | InvalidArgument
  | InvalidValue
  | MissingValue
  | MissingFlag
  | MultipleValuesDetected
  | MissingSubcommand
  | NoBuiltInMatch
  | UnclusteredFlag

/**
 * @since 1.0.0
 * @category models
 */
export interface CommandMismatch extends ValidationError.Proto {
  readonly _tag: "CommandMismatch"
  readonly error: HelpDoc
}

/**
 * @since 1.0.0
 * @category models
 */
export interface CorrectedFlag extends ValidationError.Proto {
  readonly _tag: "CorrectedFlag"
  readonly error: HelpDoc
}

/**
 * @since 1.0.0
 * @category models
 */
export interface HelpRequested extends ValidationError.Proto {
  readonly _tag: "HelpRequested"
  readonly error: HelpDoc
  readonly command: Command<unknown>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface InvalidArgument extends ValidationError.Proto {
  readonly _tag: "InvalidArgument"
  readonly error: HelpDoc
}

/**
 * @since 1.0.0
 * @category models
 */
export interface InvalidValue extends ValidationError.Proto {
  readonly _tag: "InvalidValue"
  readonly error: HelpDoc
}

/**
 * @since 1.0.0
 * @category models
 */
export interface MissingFlag extends ValidationError.Proto {
  readonly _tag: "MissingFlag"
  readonly error: HelpDoc
}

/**
 * @since 1.0.0
 * @category models
 */
export interface MissingValue extends ValidationError.Proto {
  readonly _tag: "MissingValue"
  readonly error: HelpDoc
}

/**
 * @since 1.0.0
 * @category models
 */
export interface MissingSubcommand extends ValidationError.Proto {
  readonly _tag: "MissingSubcommand"
  readonly error: HelpDoc
}

/**
 * @since 1.0.0
 * @category models
 */
export interface MultipleValuesDetected extends ValidationError.Proto {
  readonly _tag: "MultipleValuesDetected"
  readonly error: HelpDoc
  readonly values: ReadonlyArray<string>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface NoBuiltInMatch extends ValidationError.Proto {
  readonly _tag: "NoBuiltInMatch"
  readonly error: HelpDoc
}

/**
 * @since 1.0.0
 * @category models
 */
export interface UnclusteredFlag extends ValidationError.Proto {
  readonly _tag: "UnclusteredFlag"
  readonly error: HelpDoc
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
  }
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isValidationError: (u: unknown) => u is ValidationError = InternalValidationError.isValidationError

/**
 * @since 1.0.0
 * @category refinements
 */
export const isCommandMismatch: (self: ValidationError) => self is CommandMismatch =
  InternalValidationError.isCommandMismatch

/**
 * @since 1.0.0
 * @category refinements
 */
export const isCorrectedFlag: (self: ValidationError) => self is CorrectedFlag = InternalValidationError.isCorrectedFlag

/**
 * @since 1.0.0
 * @category refinements
 */
export const isHelpRequested: (self: ValidationError) => self is HelpRequested = InternalValidationError.isHelpRequested

/**
 * @since 1.0.0
 * @category refinements
 */
export const isInvalidArgument: (self: ValidationError) => self is InvalidArgument =
  InternalValidationError.isInvalidArgument

/**
 * @since 1.0.0
 * @category refinements
 */
export const isInvalidValue: (self: ValidationError) => self is InvalidValue = InternalValidationError.isInvalidValue

/**
 * @since 1.0.0
 * @category refinements
 */
export const isMultipleValuesDetected: (self: ValidationError) => self is MultipleValuesDetected =
  InternalValidationError.isMultipleValuesDetected

/**
 * @since 1.0.0
 * @category refinements
 */
export const isMissingFlag: (self: ValidationError) => self is MissingFlag = InternalValidationError.isMissingFlag

/**
 * @since 1.0.0
 * @category refinements
 */
export const isMissingValue: (self: ValidationError) => self is MissingValue = InternalValidationError.isMissingValue

/**
 * @since 1.0.0
 * @category refinements
 */
export const isMissingSubcommand: (self: ValidationError) => self is MissingSubcommand =
  InternalValidationError.isMissingSubcommand

/**
 * @since 1.0.0
 * @category refinements
 */
export const isNoBuiltInMatch: (self: ValidationError) => self is NoBuiltInMatch =
  InternalValidationError.isNoBuiltInMatch

/**
 * @since 1.0.0
 * @category refinements
 */
export const isUnclusteredFlag: (self: ValidationError) => self is UnclusteredFlag =
  InternalValidationError.isUnclusteredFlag

/**
 * @since 1.0.0
 * @category constructors
 */
export const commandMismatch: (error: HelpDoc) => ValidationError = InternalValidationError.commandMismatch

/**
 * @since 1.0.0
 * @category constructors
 */
export const correctedFlag: (error: HelpDoc) => ValidationError = InternalValidationError.correctedFlag

/**
 * @since 1.0.0
 * @category constructors
 */
export const helpRequested: <A>(command: Command<A>) => ValidationError = InternalCommand.helpRequestedError

/**
 * @since 1.0.0
 * @category constructors
 */
export const invalidArgument: (error: HelpDoc) => ValidationError = InternalValidationError.invalidArgument

/**
 * @since 1.0.0
 * @category constructors
 */
export const invalidValue: (error: HelpDoc) => ValidationError = InternalValidationError.invalidValue

/**
 * @since 1.0.0
 * @category constructors
 */
export const keyValuesDetected: (
  error: HelpDoc,
  keyValues: ReadonlyArray<string>
) => ValidationError = InternalValidationError.multipleValuesDetected

/**
 * @since 1.0.0
 * @category constructors
 */
export const missingFlag: (error: HelpDoc) => ValidationError = InternalValidationError.missingFlag

/**
 * @since 1.0.0
 * @category constructors
 */
export const missingValue: (error: HelpDoc) => ValidationError = InternalValidationError.missingValue

/**
 * @since 1.0.0
 * @category constructors
 */
export const missingSubcommand: (error: HelpDoc) => ValidationError = InternalValidationError.missingSubcommand

/**
 * @since 1.0.0
 * @category constructors
 */
export const noBuiltInMatch: (error: HelpDoc) => ValidationError = InternalValidationError.noBuiltInMatch

/**
 * @since 1.0.0
 * @category constructors
 */
export const unclusteredFlag: (
  error: HelpDoc,
  unclustered: ReadonlyArray<string>,
  rest: ReadonlyArray<string>
) => ValidationError = InternalValidationError.unclusteredFlag
