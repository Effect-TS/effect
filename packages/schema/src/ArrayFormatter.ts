/**
 * @since 0.67.0
 */

import * as Arr from "effect/Array"
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
    | "Declaration"
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
export const formatError = (error: ParseResult.ParseError): Effect.Effect<Array<Issue>> => formatIssue(error.error)

/**
 * @category formatting
 * @since 0.67.0
 */
export const formatErrorSync = (error: ParseResult.ParseError): Array<Issue> => formatIssueSync(error.error)

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

const flatten = (eff: Effect.Effect<Array<Array<Issue>>>): Effect.Effect<Array<Issue>> => Effect.map(eff, Arr.flatten)

const go = (
  e: ParseResult.ParseIssue | ParseResult.Missing | ParseResult.Unexpected,
  path: ReadonlyArray<PropertyKey> = []
): Effect.Effect<Array<Issue>> => {
  const _tag = e._tag
  switch (_tag) {
    case "Type":
      return Effect.map(TreeFormatter.formatTypeMessage(e), (message) => [{ _tag, path, message }])
    case "Forbidden":
      return succeed({ _tag, path, message: TreeFormatter.formatForbiddenMessage(e) })
    case "Unexpected":
      return succeed({ _tag, path, message: `is unexpected, expected ${e.ast.toString(true)}` })
    case "Missing":
      return succeed({ _tag, path, message: "is missing" })
    case "Union":
      return getArray(e, path, () =>
        flatten(
          Effect.forEach(e.errors, (e) => {
            switch (e._tag) {
              case "Member":
                return go(e.error, path)
              default:
                return go(e, path)
            }
          })
        ))
    case "TupleType":
      return getArray(
        e,
        path,
        () => flatten(Effect.forEach(e.errors, (index) => go(index.error, path.concat(index.index))))
      )
    case "TypeLiteral":
      return getArray(
        e,
        path,
        () => flatten(Effect.forEach(e.errors, (key) => go(key.error, path.concat(key.key))))
      )
    case "Declaration":
    case "Refinement":
    case "Transformation":
      return getArray(e, path, () => go(e.error, path))
  }
}
