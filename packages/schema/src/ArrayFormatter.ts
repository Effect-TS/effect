/**
 * @since 0.67.0
 */

import * as array_ from "effect/Array"
import * as Effect from "effect/Effect"
import type * as ParseResult from "./ParseResult.js"
import * as TreeFormatter from "./TreeFormatter.js"

/**
 * @category model
 * @since 0.67.0
 */
export interface Issue {
  readonly _tag:
    | "Transformation"
    | "Type"
    | "And"
    | "Refinement"
    | "TupleType"
    | "TypeLiteral"
    | "Union"
    | "Forbidden"
    | "Missing"
    | "Unexpected"
  readonly path: ReadonlyArray<PropertyKey>
  readonly message: string
}

/**
 * @category formatting
 * @since 0.67.0
 */
export const formatIssue = (issue: ParseResult.ParseIssue): Effect.Effect<Array<Issue>> => go(issue)

/**
 * @category formatting
 * @since 0.67.0
 */
export const formatIssueSync = (issue: ParseResult.ParseIssue): Array<Issue> => Effect.runSync(formatIssue(issue))

/**
 * @category formatting
 * @since 0.67.0
 */
export const formatError = (error: ParseResult.ParseError): Effect.Effect<Array<Issue>> => formatIssue(error.issue)

/**
 * @category formatting
 * @since 0.67.0
 */
export const formatErrorSync = (error: ParseResult.ParseError): Array<Issue> => formatIssueSync(error.issue)

const succeed = (issue: Issue) => Effect.succeed([issue])

const getArray = (
  issue: ParseResult.ParseIssue,
  path: ReadonlyArray<PropertyKey>,
  onFailure: () => Effect.Effect<Array<Issue>>
) =>
  Effect.matchEffect(TreeFormatter.getMessage(issue), {
    onFailure,
    onSuccess: (message) => succeed({ _tag: issue._tag, path, message })
  })

const flatten = (eff: Effect.Effect<Array<Array<Issue>>>): Effect.Effect<Array<Issue>> =>
  Effect.map(eff, array_.flatten)

const addPath = (
  maybePath: undefined | ParseResult.Many<PropertyKey>,
  path: ReadonlyArray<PropertyKey>
): ReadonlyArray<PropertyKey> => maybePath === undefined ? path : path.concat(maybePath)

const go = (
  e: ParseResult.ParseIssue | ParseResult.Path,
  path: ReadonlyArray<PropertyKey> = []
): Effect.Effect<Array<Issue>> => {
  const _tag = e._tag
  switch (_tag) {
    case "Type":
      return Effect.map(
        TreeFormatter.formatTypeMessage(e),
        (message) => [{ _tag, path: addPath(e.path, path), message }]
      )
    case "Forbidden":
      return succeed({ _tag, path, message: TreeFormatter.formatForbiddenMessage(e) })
    case "Unexpected":
      return succeed({ _tag, path: addPath(e.path, path), message: TreeFormatter.formatUnexpectedMessage(e) })
    case "Missing":
      return Effect.map(
        TreeFormatter.formatMissingMessage(e),
        (message) => [{ _tag, path: addPath(e.path, path), message }]
      )
    case "Path":
      return go(e.issue, path.concat(e.name))
    case "And": {
      const path_ = addPath(e.path, path)
      return getArray(e, path_, () => flatten(Effect.forEach(e.issues, (issue) => go(issue, path_))))
    }
    case "Refinement":
    case "Transformation":
      return getArray(e, path, () => go(e.issue, path))
  }
}
