/**
 * @since 1.0.0
 */

import * as Arr from "effect/Array"
import * as Effect from "effect/Effect"
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

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatIssue = (issue: ParseResult.ParseIssue): Effect.Effect<Array<Issue>> => go(issue)

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatIssueSync = (issue: ParseResult.ParseIssue): Array<Issue> => Effect.runSync(formatIssue(issue))

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatError = (error: ParseResult.ParseError): Effect.Effect<Array<Issue>> => formatIssue(error.error)

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatErrorSync = (error: ParseResult.ParseError): Array<Issue> => formatIssueSync(error.error)

const getArray = (
  issue: ParseResult.ParseIssue,
  path: ReadonlyArray<PropertyKey>,
  onFailure: () => Effect.Effect<Array<Issue>>
) =>
  Effect.matchEffect(TreeFormatter.getMessage(issue), {
    onFailure,
    onSuccess: (message) => Effect.succeed<Array<Issue>>([{ _tag: issue._tag, path, message }])
  })

const go = (
  e: ParseResult.ParseIssue | ParseResult.Missing | ParseResult.Unexpected,
  path: ReadonlyArray<PropertyKey> = []
): Effect.Effect<Array<Issue>> => {
  const _tag = e._tag
  switch (_tag) {
    case "Type":
      return Effect.map(TreeFormatter.formatTypeMessage(e), (message) => [{ _tag, path, message }])
    case "Forbidden":
      return Effect.succeed([{ _tag, path, message: TreeFormatter.formatForbiddenMessage(e) }])
    case "Unexpected":
      return Effect.succeed([{ _tag, path, message: `is unexpected, expected ${e.ast.toString(true)}` }])
    case "Missing":
      return Effect.succeed([{ _tag, path, message: "is missing" }])
    case "Union":
      return getArray(e, path, () =>
        Effect.map(
          Effect.forEach(e.errors, (e) => {
            switch (e._tag) {
              case "Member":
                return go(e.error, path)
              default:
                return go(e, path)
            }
          }),
          Arr.flatten
        ))
    case "TupleType":
      return getArray(e, path, () =>
        Effect.map(
          Effect.forEach(e.errors, (index) => go(index.error, [...path, index.index])),
          Arr.flatten
        ))
    case "TypeLiteral":
      return getArray(e, path, () =>
        Effect.map(
          Effect.forEach(e.errors, (key) => go(key.error, [...path, key.key])),
          Arr.flatten
        ))
    case "Transformation":
    case "Refinement":
    case "Declaration":
      return getArray(e, path, () => go(e.error, path))
  }
}
