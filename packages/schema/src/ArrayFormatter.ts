/**
 * @since 1.0.0
 */

import * as Effect from "effect/Effect"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type * as ParseResult from "./ParseResult.js"
import * as TreeFormatter from "./TreeFormatter.js"

/**
 * @category model
 * @since 1.0.0
 */
export interface Issue {
  readonly _tag: ParseResult.ParseIssue["_tag"] | ParseResult.Missing["_tag"] | ParseResult.Unexpected["_tag"]
  readonly path: ReadonlyArray<PropertyKey>
  readonly message: string
}

const go = (
  e: ParseResult.ParseIssue | ParseResult.Missing | ParseResult.Unexpected,
  path: ReadonlyArray<PropertyKey> = []
): Effect.Effect<Array<Issue>> => {
  const _tag = e._tag
  switch (_tag) {
    case "Type":
      return Effect.map(
        TreeFormatter.formatTypeMessage(e),
        (message) => [{ _tag, path, message }]
      )
    case "Forbidden":
      return Effect.succeed([{ _tag, path, message: TreeFormatter.formatForbiddenMessage(e) }])
    case "Unexpected":
      return Effect.succeed([{ _tag, path, message: `is unexpected, expected ${e.ast.toString(true)}` }])
    case "Missing":
      return Effect.succeed([{ _tag, path, message: "is missing" }])
    case "Union":
      return Effect.matchEffect(TreeFormatter.getMessage(e), {
        onFailure: () =>
          Effect.map(
            Effect.forEach(e.errors, (e) => {
              switch (e._tag) {
                case "Member":
                  return go(e.error, path)
                default:
                  return go(e, path)
              }
            }),
            ReadonlyArray.flatten
          ),
        onSuccess: (message) => Effect.succeed([{ _tag, path, message }])
      })
    case "Tuple":
      return Effect.matchEffect(TreeFormatter.getMessage(e), {
        onFailure: () =>
          Effect.map(
            Effect.forEach(e.errors, (index) => go(index.error, [...path, index.index])),
            ReadonlyArray.flatten
          ),
        onSuccess: (message) => Effect.succeed([{ _tag, path, message }])
      })
    case "TypeLiteral":
      return Effect.matchEffect(TreeFormatter.getMessage(e), {
        onFailure: () =>
          Effect.map(
            Effect.forEach(e.errors, (key) => go(key.error, [...path, key.key])),
            ReadonlyArray.flatten
          ),
        onSuccess: (message) => Effect.succeed([{ _tag, path, message }])
      })
    case "Transform":
      return Effect.matchEffect(TreeFormatter.getMessage(e), {
        onFailure: () => go(e.error, path),
        onSuccess: (message) => Effect.succeed([{ _tag, path, message }])
      })
    case "Refinement":
      return Effect.matchEffect(TreeFormatter.getMessage(e), {
        onFailure: () => go(e.error, path),
        onSuccess: (message) => Effect.succeed([{ _tag, path, message }])
      })
    case "Declaration":
      return Effect.matchEffect(TreeFormatter.getMessage(e), {
        onFailure: () => go(e.error, path),
        onSuccess: (message) => Effect.succeed([{ _tag, path, message }])
      })
  }
}

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatIssuesEffect = (
  issues: ReadonlyArray.NonEmptyReadonlyArray<ParseResult.ParseIssue>
): Effect.Effect<Array<Issue>> => Effect.map(Effect.forEach(issues, (issue) => go(issue)), ReadonlyArray.flatten)

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatIssues = (issues: ReadonlyArray.NonEmptyReadonlyArray<ParseResult.ParseIssue>): Array<Issue> =>
  Effect.runSync(formatIssuesEffect(issues))

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatIssueEffect = (error: ParseResult.ParseIssue): Effect.Effect<Array<Issue>> =>
  formatIssuesEffect([error])

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatIssue = (error: ParseResult.ParseIssue): Array<Issue> => formatIssues([error])

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatErrorEffect = (error: ParseResult.ParseError): Effect.Effect<Array<Issue>> =>
  formatIssueEffect(error.error)

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatError = (error: ParseResult.ParseError): Array<Issue> => formatIssue(error.error)
