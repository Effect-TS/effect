/**
 * @since 1.0.0
 */

import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as Format from "./Format.js"
import type { Missing, ParseError, ParseIssue, Unexpected } from "./ParseResult.js"
import { formatMessage, getMessage, getRefinementMessage, getTransformMessage } from "./TreeFormatter.js"

/**
 * @category model
 * @since 1.0.0
 */
export interface Issue {
  readonly _tag: ParseIssue["_tag"] | Missing["_tag"] | Unexpected["_tag"]
  readonly path: ReadonlyArray<PropertyKey>
  readonly message: string
}

const go = (e: ParseIssue | Missing | Unexpected, path: ReadonlyArray<PropertyKey> = []): Array<Issue> => {
  const _tag = e._tag
  switch (_tag) {
    case "Type":
      return [{ _tag, path, message: formatMessage(e) }]
    case "Forbidden":
      return [{ _tag, path, message: "is forbidden" }]
    case "Unexpected":
      return [{ _tag, path, message: `is unexpected, expected ${Format.formatAST(e.ast, true)}` }]
    case "Missing":
      return [{ _tag, path, message: "is missing" }]
    case "Union":
      return Option.match(getMessage(e.ast, e.actual), {
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
      return Option.match(getMessage(e.ast, e.actual), {
        onNone: () =>
          ReadonlyArray.flatMap(
            e.errors,
            (index) => go(index.error, [...path, index.index])
          ),
        onSome: (message) => [{ _tag, path, message }]
      })
    case "TypeLiteral":
      return Option.match(getMessage(e.ast, e.actual), {
        onNone: () =>
          ReadonlyArray.flatMap(
            e.errors,
            (key) => go(key.error, [...path, key.key])
          ),
        onSome: (message) => [{ _tag, path, message }]
      })
    case "Transform":
      return Option.match(getTransformMessage(e, e.actual), {
        onNone: () => go(e.error, path),
        onSome: (message) => [{ _tag, path, message }]
      })
    case "Refinement":
      return Option.match(getRefinementMessage(e, e.actual), {
        onNone: () => go(e.error, path),
        onSome: (message) => [{ _tag, path, message }]
      })
    case "Declaration":
      return Option.match(getMessage(e.ast, e.actual), {
        onNone: () => go(e.error, path),
        onSome: (message) => [{ _tag, path, message }]
      })
  }
}

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatIssues = (issues: ReadonlyArray.NonEmptyReadonlyArray<ParseIssue>): Array<Issue> =>
  ReadonlyArray.flatMap(issues, (e) => go(e))

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatIssue = (error: ParseIssue): Array<Issue> => formatIssues([error])

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatError = (error: ParseError): Array<Issue> => formatIssue(error.error)
