/**
 * @since 1.0.0
 */
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as Format from "./Format.js"
import type { ParseIssue } from "./ParseResult.js"
import { formatMessage } from "./TreeFormatter.js"

/**
 * @category model
 * @since 1.0.0
 */
export interface Issue {
  readonly _tag: ParseIssue["_tag"]
  readonly path: ReadonlyArray<PropertyKey>
  readonly message: string
}

const format = (self: ParseIssue, path: ReadonlyArray<PropertyKey> = []): Array<Issue> => {
  const _tag = self._tag
  switch (_tag) {
    case "Type":
      return [{ _tag, path, message: formatMessage(self) }]
    case "Key":
      return ReadonlyArray.flatMap(self.errors, (e) => format(e, [...path, self.key]))
    case "Missing":
      return [{ _tag, path, message: "Missing key or index" }]
    case "Forbidden":
      return [{ _tag, path, message: "Forbidden" }]
    case "Unexpected":
      return [{
        _tag,
        path,
        message: `Unexpected, expected ${Format.formatAST(self.expected, true)}`
      }]
    case "Union":
      return ReadonlyArray.flatMap(self.errors, (e) => {
        switch (e._tag) {
          case "Key":
          case "Type":
            return format(e, path)
          case "Member":
            return ReadonlyArray.flatMap(e.errors, (e) => format(e, path))
        }
      })
    case "Tuple":
      return ReadonlyArray.flatMap(
        self.errors,
        (index) => ReadonlyArray.flatMap(index.errors, (e) => format(e, [...path, index.index]))
      )
    case "TypeLiteral":
      return ReadonlyArray.flatMap(
        self.errors,
        (key) => ReadonlyArray.flatMap(key.errors, (e) => format(e, [...path, key.key]))
      )
    case "Transform":
    case "Refinement":
      return ReadonlyArray.flatMap(self.errors, (e) => format(e, path))
  }
}

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatErrors = (
  errors: ReadonlyArray.NonEmptyReadonlyArray<ParseIssue>
): Array<Issue> => ReadonlyArray.flatMap(errors, (e) => format(e))
