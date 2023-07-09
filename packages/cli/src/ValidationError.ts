/**
 * @since 1.0.0
 */
import type { HelpDoc } from "@effect/cli/HelpDoc"
import * as internal from "@effect/cli/internal/validationError"

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
export interface ValidationError extends ValidationError.Proto {
  readonly type: ValidationError.Type
  readonly error: HelpDoc
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

  /**
   * @since 1.0.0
   * @category models
   */
  export type Type =
    | "ExtraneousValue"
    | "InvalidValue"
    | "MissingValue"
    | "CommandMismatch"
    | "MissingSubCommand"
    | "InvalidArgument"
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isValidationError: (u: unknown) => u is ValidationError = internal.isValidationError

/**
 * @since 1.0.0
 * @category refinements
 */
export const isExtraneousValue: (validationError: ValidationError) => boolean = internal.isExtraneousValue

/**
 * @since 1.0.0
 * @category predicates
 */
export const isInvalidValue: (validationError: ValidationError) => boolean = internal.isInvalidValue

/**
 * @since 1.0.0
 * @category predicates
 */
export const isMissingValue: (validationError: ValidationError) => boolean = internal.isMissingValue

/**
 * @since 1.0.0
 * @category predicates
 */
export const isCommandMismatch: (validationError: ValidationError) => boolean = internal.isCommandMismatch

/**
 * @since 1.0.0
 * @category predicates
 */
export const isMissingSubCommand: (validationError: ValidationError) => boolean = internal.isMissingSubCommand

/**
 * @since 1.0.0
 * @category predicates
 */
export const isInvalidArgument: (validationError: ValidationError) => boolean = internal.isInvalidArgument

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (type: ValidationError.Type, error: HelpDoc) => ValidationError = internal.make

/**
 * @since 1.0.0
 * @category constructors
 */
export const extraneousValue: (error: HelpDoc) => ValidationError = internal.extraneousValue

/**
 * @since 1.0.0
 * @category constructors
 */
export const invalidValue: (error: HelpDoc) => ValidationError = internal.invalidValue

/**
 * @since 1.0.0
 * @category constructors
 */
export const missingValue: (error: HelpDoc) => ValidationError = internal.missingValue

/**
 * @since 1.0.0
 * @category constructors
 */
export const commandMismatch: (error: HelpDoc) => ValidationError = internal.commandMismatch

/**
 * @since 1.0.0
 * @category constructors
 */
export const missingSubCommand: (error: HelpDoc) => ValidationError = internal.missingSubCommand

/**
 * @since 1.0.0
 * @category constructors
 */
export const invalidArgument: (error: HelpDoc) => ValidationError = internal.invalidArgument
