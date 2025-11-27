/**
 * Schema-based input parsing for GitHub Actions.
 *
 * This module provides a simple, Schema-first API for parsing action inputs.
 * The core functions are `raw` and `parse`, with convenience helpers for common cases.
 *
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import * as ParseResult from "effect/ParseResult"
import type * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import { InputValidationFailure } from "./ActionError.js"
import * as ActionRunner from "./ActionRunner.js"

/**
 * YAML 1.2 boolean schema.
 *
 * Parses the following values:
 * - `true`: true, True, TRUE, yes, Yes, YES, on, On, ON, 1
 * - `false`: false, False, FALSE, no, No, NO, off, Off, OFF, 0, "" (empty string)
 *
 * @since 1.0.0
 * @category schemas
 */
export const YamlBoolean: Schema.Schema<boolean, string> = Schema.transformOrFail(
  Schema.String,
  Schema.Boolean,
  {
    strict: true,
    decode: (s, _, ast) => {
      const lower = s.toLowerCase()
      if (["true", "yes", "on", "1"].includes(lower)) {
        return ParseResult.succeed(true)
      }
      if (["false", "no", "off", "0", ""].includes(lower)) {
        return ParseResult.succeed(false)
      }
      return ParseResult.fail(
        new ParseResult.Type(ast, s, `Invalid boolean value: "${s}"`)
      )
    },
    encode: (b) => ParseResult.succeed(b ? "true" : "false")
  }
)

/**
 * Get the raw string value of an input.
 *
 * This never fails - returns empty string if the input is missing.
 *
 * @since 1.0.0
 * @category primitives
 */
export const raw = (
  name: string
): Effect.Effect<string, never, ActionRunner.ActionRunner> => ActionRunner.getInput(name)

/**
 * Parse an input value using an Effect Schema.
 *
 * On validation failure, returns an `InputValidationFailure` with details.
 *
 * @since 1.0.0
 * @category primitives
 */
export const parse = <A, I, R>(
  name: string,
  schema: Schema.Schema<A, I, R>
): Effect.Effect<A, InputValidationFailure, ActionRunner.ActionRunner | R> =>
  Effect.flatMap(raw(name), (value) =>
    Schema.decodeUnknown(schema)(value).pipe(
      Effect.mapError((parseError) =>
        new InputValidationFailure({
          input: name,
          reason: "SchemaValidation",
          value,
          message: formatParseError(parseError),
          cause: parseError
        })
      )
    ))

/**
 * Format a ParseError for display.
 *
 * @internal
 */
const formatParseError = (error: ParseResult.ParseError): string => {
  // Get the tree-formatted output
  const formatted = ParseResult.TreeFormatter.formatErrorSync(error)
  // Take just the first line for brevity
  const firstLine = formatted.split("\n")[0]
  return firstLine ?? "validation failed"
}

// =============================================================================
// Convenience Helpers
// =============================================================================

/**
 * Parse input as a string.
 *
 * Returns empty string if missing.
 *
 * @since 1.0.0
 * @category helpers
 */
export const string = (
  name: string
): Effect.Effect<string, InputValidationFailure, ActionRunner.ActionRunner> => parse(name, Schema.String)

/**
 * Parse input as a non-empty string.
 *
 * Fails if missing or empty.
 *
 * @since 1.0.0
 * @category helpers
 */
export const nonEmptyString = (
  name: string
): Effect.Effect<string, InputValidationFailure, ActionRunner.ActionRunner> => parse(name, Schema.NonEmptyString)

/**
 * Parse input as an integer.
 *
 * @since 1.0.0
 * @category helpers
 */
export const integer = (
  name: string
): Effect.Effect<number, InputValidationFailure, ActionRunner.ActionRunner> =>
  parse(name, Schema.NumberFromString.pipe(Schema.int()))

/**
 * Parse input as a number.
 *
 * @since 1.0.0
 * @category helpers
 */
export const number = (
  name: string
): Effect.Effect<number, InputValidationFailure, ActionRunner.ActionRunner> => parse(name, Schema.NumberFromString)

/**
 * Parse input as a boolean (YAML 1.2 style).
 *
 * Accepts: true/false/yes/no/on/off/1/0
 *
 * @since 1.0.0
 * @category helpers
 */
export const boolean = (
  name: string
): Effect.Effect<boolean, InputValidationFailure, ActionRunner.ActionRunner> => parse(name, YamlBoolean)

/**
 * Parse input as a secret (Redacted string).
 *
 * Fails if missing or empty.
 *
 * @since 1.0.0
 * @category helpers
 */
export const secret = (
  name: string
): Effect.Effect<Redacted.Redacted<string>, InputValidationFailure, ActionRunner.ActionRunner> =>
  parse(name, Schema.Redacted(Schema.NonEmptyString))

/**
 * Parse input as JSON and validate against a schema.
 *
 * @since 1.0.0
 * @category helpers
 */
export const json = <A, I, R>(
  name: string,
  schema: Schema.Schema<A, I, R>
): Effect.Effect<A, InputValidationFailure, ActionRunner.ActionRunner | R> => parse(name, Schema.parseJson(schema))
