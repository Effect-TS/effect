import type * as HelpDoc from "../HelpDoc.js"
import type * as ValidationError from "../ValidationError.js"

const ValidationErrorSymbolKey = "@effect/cli/ValidationError"

/** @internal */
export const ValidationErrorTypeId: ValidationError.ValidationErrorTypeId = Symbol.for(
  ValidationErrorSymbolKey
) as ValidationError.ValidationErrorTypeId

/** @internal */
export const proto: ValidationError.ValidationError.Proto = {
  [ValidationErrorTypeId]: ValidationErrorTypeId
}

/** @internal */
export const isValidationError = (u: unknown): u is ValidationError.ValidationError =>
  typeof u === "object" && u != null && ValidationErrorTypeId in u

/** @internal */
export const isCommandMismatch = (
  self: ValidationError.ValidationError
): self is ValidationError.CommandMismatch => self._tag === "CommandMismatch"

/** @internal */
export const isCorrectedFlag = (
  self: ValidationError.ValidationError
): self is ValidationError.CorrectedFlag => self._tag === "CorrectedFlag"

/** @internal */
export const isHelpRequested = (
  self: ValidationError.ValidationError
): self is ValidationError.HelpRequested => self._tag === "HelpRequested"

/** @internal */
export const isInvalidArgument = (
  self: ValidationError.ValidationError
): self is ValidationError.InvalidArgument => self._tag === "InvalidArgument"

/** @internal */
export const isInvalidValue = (
  self: ValidationError.ValidationError
): self is ValidationError.InvalidValue => self._tag === "InvalidValue"

/** @internal */
export const isMultipleValuesDetected = (
  self: ValidationError.ValidationError
): self is ValidationError.MultipleValuesDetected => self._tag === "MultipleValuesDetected"

/** @internal */
export const isMissingFlag = (
  self: ValidationError.ValidationError
): self is ValidationError.MissingFlag => self._tag === "MissingFlag"

/** @internal */
export const isMissingValue = (
  self: ValidationError.ValidationError
): self is ValidationError.MissingValue => self._tag === "MissingValue"

/** @internal */
export const isMissingSubcommand = (
  self: ValidationError.ValidationError
): self is ValidationError.MissingSubcommand => self._tag === "MissingSubcommand"

/** @internal */
export const isNoBuiltInMatch = (
  self: ValidationError.ValidationError
): self is ValidationError.NoBuiltInMatch => self._tag === "NoBuiltInMatch"

/** @internal */
export const isUnclusteredFlag = (
  self: ValidationError.ValidationError
): self is ValidationError.UnclusteredFlag => self._tag === "UnclusteredFlag"

/** @internal */
export const commandMismatch = (error: HelpDoc.HelpDoc): ValidationError.ValidationError => {
  const op = Object.create(proto)
  op._tag = "CommandMismatch"
  op.error = error
  return op
}

/** @internal */
export const correctedFlag = (error: HelpDoc.HelpDoc): ValidationError.ValidationError => {
  const op = Object.create(proto)
  op._tag = "CorrectedFlag"
  op.error = error
  return op
}

/** @internal */
export const invalidArgument = (error: HelpDoc.HelpDoc): ValidationError.ValidationError => {
  const op = Object.create(proto)
  op._tag = "InvalidArgument"
  op.error = error
  return op
}

/** @internal */
export const invalidValue = (error: HelpDoc.HelpDoc): ValidationError.ValidationError => {
  const op = Object.create(proto)
  op._tag = "InvalidValue"
  op.error = error
  return op
}

/** @internal */
export const missingFlag = (error: HelpDoc.HelpDoc): ValidationError.ValidationError => {
  const op = Object.create(proto)
  op._tag = "MissingFlag"
  op.error = error
  return op
}

/** @internal */
export const missingValue = (error: HelpDoc.HelpDoc): ValidationError.ValidationError => {
  const op = Object.create(proto)
  op._tag = "MissingValue"
  op.error = error
  return op
}

/** @internal */
export const missingSubcommand = (error: HelpDoc.HelpDoc): ValidationError.ValidationError => {
  const op = Object.create(proto)
  op._tag = "MissingSubcommand"
  op.error = error
  return op
}

/** @internal */
export const multipleValuesDetected = (
  error: HelpDoc.HelpDoc,
  values: ReadonlyArray<unknown>
): ValidationError.ValidationError => {
  const op = Object.create(proto)
  op._tag = "MultipleValuesDetected"
  op.error = error
  op.values = values
  return op
}

/** @internal */
export const noBuiltInMatch = (error: HelpDoc.HelpDoc): ValidationError.ValidationError => {
  const op = Object.create(proto)
  op._tag = "NoBuiltInMatch"
  op.error = error
  return op
}

/** @internal */
export const unclusteredFlag = (
  error: HelpDoc.HelpDoc,
  unclustered: ReadonlyArray<string>,
  rest: ReadonlyArray<string>
): ValidationError.ValidationError => {
  const op = Object.create(proto)
  op._tag = "UnclusteredFlag"
  op.error = error
  op.unclustered = unclustered
  op.rest = rest
  return op
}
