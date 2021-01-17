/**
 * From https://github.com/gillchristian/io-ts-reporters
 */
import * as A from "@effect-ts/core/Array"
import { pipe } from "@effect-ts/core/Function"
import * as NEA from "@effect-ts/core/NonEmptyArray"
import * as O from "@effect-ts/core/Option"
import * as R from "@effect-ts/core/Record"
import * as S from "@effect-ts/core/Sync"

import type * as t from "../common"

const isUnionType = (_: t.ContextEntry) => _.type.codecType === "union"

const jsToString = (value: unknown) =>
  value === undefined ? "undefined" : JSON.stringify(value)

const keyPath = (ctx: t.Context) =>
  ctx
    .map((c) => c.key)
    .filter(Boolean)
    .join(".")

const getErrorFromCtx = (validation: t.ValidationError) =>
  A.last(validation.context as t.ContextEntry[])

const getValidationContext = (validation: t.ValidationError) =>
  validation.context as t.ContextEntry[]

export const TYPE_MAX_LEN = 160

const truncateType = (type: string, options: ReporterOptions = {}): string => {
  const { truncateLongTypes = true } = options

  if (truncateLongTypes && type.length > TYPE_MAX_LEN) {
    return `${type.slice(0, TYPE_MAX_LEN - 3)}...`
  }

  return type
}

const errorMessageSimple = (
  expectedType: string,
  path: string,
  error: t.ValidationError,
  options?: ReporterOptions
) =>
  [
    `Expecting ${truncateType(expectedType, options)}`,
    path === "" ? "" : `at ${path}`,
    `but instead got: ${jsToString(error.value)}`,
    error.message ? `(${error.message})` : ""
  ]
    .filter(Boolean)
    .join(" ")

const errorMessageUnion = (
  expectedTypes: string[],
  path: string,
  value: unknown,
  options?: ReporterOptions
) =>
  [
    "Expecting one of:\n",
    expectedTypes.map((type) => `    ${truncateType(type, options)}`).join("\n"),
    path === "" ? "\n" : `\nat ${path} `,
    `but instead got: ${jsToString(value)}`
  ]
    .filter(Boolean)
    .join("")

const findExpectedType = (ctx: t.ContextEntry[]) =>
  pipe(
    ctx,
    A.findIndex(isUnionType),
    O.chain((n) => A.lookup_(ctx, n + 1))
  )

const formatValidationErrorOfUnion = (
  path: string,
  errors: NEA.NonEmptyArray<t.ValidationError>,
  options?: ReporterOptions
) => {
  const expectedTypes = pipe(
    errors,
    A.map(getValidationContext),
    A.map(findExpectedType),
    A.compact
  )

  const value = pipe(
    expectedTypes,
    A.head,
    O.map((v) => v.actual),
    O.getOrElse((): unknown => undefined)
  )

  const expected = expectedTypes.map(({ type }) => type?.name || "Anonymous")

  return expected.length > 0
    ? O.some(errorMessageUnion(expected, path, value, options))
    : O.none
}

const formatValidationCommonError = (
  path: string,
  error: t.ValidationError,
  options?: ReporterOptions
) =>
  pipe(
    error,
    getErrorFromCtx,
    O.map((errorContext) =>
      errorMessageSimple(errorContext.type?.name || "Anonymous", path, error, options)
    )
  )

const groupByKey = NEA.groupBy((error: t.ValidationError) =>
  keyPath(A.takeUntil_(error.context, isUnionType))
)

const format = (
  path: string,
  errors: NEA.NonEmptyArray<t.ValidationError>,
  options?: ReporterOptions
) =>
  NEA.tail(errors).length > 0
    ? formatValidationErrorOfUnion(path, errors, options)
    : formatValidationCommonError(path, NEA.head(errors), options)

export const formatValidationError = (
  error: t.ValidationError,
  options?: ReporterOptions
) => formatValidationCommonError(keyPath(error.context), error, options)

export const formatValidationErrors = (errors: t.Errors, options?: ReporterOptions) =>
  pipe(
    errors,
    groupByKey,
    R.mapWithIndex((path, errors) => format(path, errors, options)),
    R.compact,
    R.toArray,
    A.map(([_key, error]) => error)
  )

export interface ReporterOptions {
  truncateLongTypes?: boolean
}

export const report = <T>(validation: t.Validation<T>, options?: ReporterOptions) =>
  pipe(
    validation,
    S.mapError((errors) => formatValidationErrors(errors, options))
  )
