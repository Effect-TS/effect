import type * as HelpDoc from "@effect/cli/HelpDoc"
import type * as ValidationError from "@effect/cli/ValidationError"

const ValidationErrorSymbolKey = "@effect/cli/ValidationError"

/** @internal */
export const ValidationErrorTypeId: ValidationError.ValidationErrorTypeId = Symbol.for(
  ValidationErrorSymbolKey
) as ValidationError.ValidationErrorTypeId

/** @internal */
export const isValidationError = (u: unknown): u is ValidationError.ValidationError =>
  typeof u === "object" && u != null && ValidationErrorTypeId in u

/** @internal */
export const isExtraneousValue = (validationError: ValidationError.ValidationError): boolean =>
  validationError.type === "ExtraneousValue"

/** @internal */
export const isInvalidValue = (validationError: ValidationError.ValidationError): boolean =>
  validationError.type === "InvalidValue"

/** @internal */
export const isMissingValue = (validationError: ValidationError.ValidationError): boolean =>
  validationError.type === "MissingValue"

/** @internal */
export const isCommandMismatch = (validationError: ValidationError.ValidationError): boolean =>
  validationError.type === "CommandMismatch"

/** @internal */
export const isMissingSubCommand = (validationError: ValidationError.ValidationError): boolean =>
  validationError.type === "MissingSubCommand"

/** @internal */
export const isInvalidArgument = (validationError: ValidationError.ValidationError): boolean =>
  validationError.type === "InvalidArgument"

/** @internal */
export const make = (
  type: ValidationError.ValidationError.Type,
  error: HelpDoc.HelpDoc
): ValidationError.ValidationError => ({
  [ValidationErrorTypeId]: ValidationErrorTypeId,
  type,
  error
})

/** @internal */
export const extraneousValue = (error: HelpDoc.HelpDoc): ValidationError.ValidationError =>
  make("ExtraneousValue", error)

/** @internal */
export const invalidValue = (error: HelpDoc.HelpDoc): ValidationError.ValidationError => make("InvalidValue", error)

/** @internal */
export const missingValue = (error: HelpDoc.HelpDoc): ValidationError.ValidationError => make("MissingValue", error)

/** @internal */
export const commandMismatch = (error: HelpDoc.HelpDoc): ValidationError.ValidationError =>
  make("CommandMismatch", error)

/** @internal */
export const missingSubCommand = (error: HelpDoc.HelpDoc): ValidationError.ValidationError =>
  make("MissingSubCommand", error)

/** @internal */
export const invalidArgument = (error: HelpDoc.HelpDoc): ValidationError.ValidationError =>
  make("InvalidArgument", error)
