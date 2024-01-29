/**
 * @since 1.0.0
 */

import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as AST from "./AST.js"
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
): Array<Issue> => {
  const _tag = e._tag
  switch (_tag) {
    case "Type":
      return [{ _tag, path, message: TreeFormatter.formatTypeMessage(e) }]
    case "Forbidden":
      return [{ _tag, path, message: TreeFormatter.formatForbiddenMessage(e) }]
    case "Unexpected":
      return [{ _tag, path, message: `is unexpected, expected ${AST.format(e.ast, true)}` }]
    case "Missing":
      return [{ _tag, path, message: "is missing" }]
    case "Union":
      return Option.match(TreeFormatter.getMessage(e.ast, e.actual), {
        onNone: () =>
          ReadonlyArray.flatMap(e.errors, (e) => {
            switch (e._tag) {
              case "Member":
                return go(e.error, path)
              default:
                return go(e, path)
            }
          }),
        onSome: (message) => [{ _tag, path, message }]
      })
    case "Tuple":
      return Option.match(TreeFormatter.getMessage(e.ast, e.actual), {
        onNone: () =>
          ReadonlyArray.flatMap(
            e.errors,
            (index) => go(index.error, [...path, index.index])
          ),
        onSome: (message) => [{ _tag, path, message }]
      })
    case "TypeLiteral":
      return Option.match(TreeFormatter.getMessage(e.ast, e.actual), {
        onNone: () =>
          ReadonlyArray.flatMap(
            e.errors,
            (key) => go(key.error, [...path, key.key])
          ),
        onSome: (message) => [{ _tag, path, message }]
      })
    case "Transform":
      return Option.match(TreeFormatter.getTransformMessage(e, e.actual), {
        onNone: () => go(e.error, path),
        onSome: (message) => [{ _tag, path, message }]
      })
    case "Refinement":
      return Option.match(TreeFormatter.getRefinementMessage(e, e.actual), {
        onNone: () => go(e.error, path),
        onSome: (message) => [{ _tag, path, message }]
      })
    case "Declaration":
      return Option.match(TreeFormatter.getMessage(e.ast, e.actual), {
        onNone: () => go(e.error, path),
        onSome: (message) => [{ _tag, path, message }]
      })
  }
}

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatIssues = (issues: ReadonlyArray.NonEmptyReadonlyArray<ParseResult.ParseIssue>): Array<Issue> =>
  ReadonlyArray.flatMap(issues, (e) => go(e))

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatIssue = (error: ParseResult.ParseIssue): Array<Issue> => formatIssues([error])

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatError = (error: ParseResult.ParseError): Array<Issue> => formatIssue(error.error)
