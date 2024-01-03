/**
 * @since 1.0.0
 */

import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as Format from "./Format.js"
import type { ParseIssue } from "./ParseResult.js"
import { formatMessage, getMessage, getRefinementMessage } from "./TreeFormatter.js"

/**
 * @category model
 * @since 1.0.0
 */
export interface Issue {
  readonly _tag: ParseIssue["_tag"]
  readonly path: ReadonlyArray<PropertyKey>
  readonly message: string
}

const format = (e: ParseIssue, path: ReadonlyArray<PropertyKey> = []): Array<Issue> => {
  const _tag = e._tag
  switch (_tag) {
    case "Type":
      return [{ _tag, path, message: formatMessage(e) }]
    case "Forbidden":
      return [{ _tag, path, message: "is forbidden" }]
    case "Unexpected":
      return [{ _tag, path, message: `is unexpected, expected ${Format.formatAST(e.ast, true)}` }]
    case "Key":
      return ReadonlyArray.flatMap(e.errors, (key) => format(key, [...path, e.key]))
    case "Missing":
      return [{ _tag, path, message: "is missing" }]
    case "Union":
      return Option.match(getMessage(e.ast, e.actual), {
        onNone: () =>
          ReadonlyArray.flatMap(e.errors, (e) => {
            switch (e._tag) {
              case "Key":
              case "Type":
                return format(e, path)
              case "Member":
                return ReadonlyArray.flatMap(e.errors, (e) => format(e, path))
            }
          }),
        onSome: (message) => [{ _tag, path, message }]
      })
    case "Tuple":
      return Option.match(getMessage(e.ast, e.actual), {
        onNone: () =>
          ReadonlyArray.flatMap(
            e.errors,
            (index) => ReadonlyArray.flatMap(index.errors, (e) => format(e, [...path, index.index]))
          ),
        onSome: (message) => [{ _tag, path, message }]
      })
    case "TypeLiteral":
      return Option.match(getMessage(e.ast, e.actual), {
        onNone: () =>
          ReadonlyArray.flatMap(
            e.errors,
            (key) => ReadonlyArray.flatMap(key.errors, (e) => format(e, [...path, key.key]))
          ),
        onSome: (message) => [{ _tag, path, message }]
      })
    case "Transform":
      return Option.match(getMessage(e.ast, e.actual), {
        onNone: () => ReadonlyArray.flatMap(e.errors, (e) => format(e, path)),
        onSome: (message) => [{ _tag, path, message }]
      })
    case "Refinement":
      return Option.match(getRefinementMessage(e, e.actual), {
        onNone: () => ReadonlyArray.flatMap(e.errors, (e) => format(e, path)),
        onSome: (message) => [{ _tag, path, message }]
      })
  }
}

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatErrors = (
  errors: ReadonlyArray.NonEmptyReadonlyArray<ParseIssue>
): Array<Issue> => ReadonlyArray.flatMap(errors, (e) => format(e))
