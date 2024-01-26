/**
 * @since 1.0.0
 */

import * as Option from "effect/Option"
import type { NonEmptyReadonlyArray } from "effect/ReadonlyArray"
import * as AST from "./AST.js"
import type * as ParseResult from "./ParseResult.js"

interface Forest<A> extends ReadonlyArray<Tree<A>> {}

interface Tree<A> {
  readonly value: A
  readonly forest: Forest<A>
}

const make = <A>(value: A, forest: Forest<A> = []): Tree<A> => ({
  value,
  forest
})

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatIssues = (issues: NonEmptyReadonlyArray<ParseResult.ParseIssue>): string => {
  const forest = issues.map(go)
  return drawTree(forest.length === 1 ? forest[0] : make(`error(s) found`, issues.map(go)))
}

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatIssue = (issue: ParseResult.ParseIssue): string => formatIssues([issue])

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatError = (error: ParseResult.ParseError): string => formatIssue(error.error)

const drawTree = (tree: Tree<string>): string => tree.value + draw("\n", tree.forest)

const draw = (indentation: string, forest: Forest<string>): string => {
  let r = ""
  const len = forest.length
  let tree: Tree<string>
  for (let i = 0; i < len; i++) {
    tree = forest[i]
    const isLast = i === len - 1
    r += indentation + (isLast ? "└" : "├") + "─ " + tree.value
    r += draw(indentation + (len > 1 && !isLast ? "│  " : "   "), tree.forest)
  }
  return r
}

const formatTransformationKind = (kind: ParseResult.Transform["kind"]): string => {
  switch (kind) {
    case "From":
      return "From side transformation failure"
    case "Transformation":
      return "Transformation process failure"
    case "To":
      return "To side transformation failure"
  }
}

const formatRefinementKind = (kind: ParseResult.Refinement["kind"]): string => {
  switch (kind) {
    case "From":
      return "From side refinement failure"
    case "Predicate":
      return "Predicate refinement failure"
  }
}

/** @internal */
export const getMessage = (ast: AST.AST, actual: unknown): Option.Option<string> => {
  return AST.getMessageAnnotation(ast).pipe(
    Option.map((annotation) => annotation(actual))
  )
}

/** @internal */
export const formatTypeMessage = (e: ParseResult.Type): string =>
  getMessage(e.ast, e.actual).pipe(
    Option.orElse(() => e.message),
    Option.getOrElse(() => `Expected ${AST.format(e.ast, true)}, actual ${AST.formatUnknown(e.actual)}`)
  )

/** @internal */
export const formatForbiddenMessage = (e: ParseResult.Forbidden): string =>
  Option.getOrElse(e.message, () => "is forbidden")

const getParseIsssueMessage = (
  issue: ParseResult.ParseIssue,
  orElse: () => Option.Option<string>
): Option.Option<string> => {
  switch (issue._tag) {
    case "Refinement":
      return Option.orElse(getRefinementMessage(issue, issue.actual), orElse)
    case "Transform":
      return Option.orElse(getTransformMessage(issue, issue.actual), orElse)
    case "Tuple":
    case "TypeLiteral":
    case "Union":
    case "Type":
      return Option.orElse(getMessage(issue.ast, issue.actual), orElse)
  }
  return orElse()
}

/** @internal */
export const getRefinementMessage = (e: ParseResult.Refinement, actual: unknown): Option.Option<string> => {
  if (e.kind === "From") {
    return getParseIsssueMessage(e.error, () => getMessage(e.ast, actual))
  }
  return getMessage(e.ast, actual)
}

/** @internal */
export const getTransformMessage = (e: ParseResult.Transform, actual: unknown): Option.Option<string> => {
  return getParseIsssueMessage(e.error, () => getMessage(e.ast, actual))
}

const go = (e: ParseResult.ParseIssue | ParseResult.Missing | ParseResult.Unexpected): Tree<string> => {
  switch (e._tag) {
    case "Type":
      return make(formatTypeMessage(e))
    case "Forbidden":
      return make(AST.format(e.ast), [make(formatForbiddenMessage(e))])
    case "Unexpected":
      return make(`is unexpected, expected ${AST.format(e.ast, true)}`)
    case "Missing":
      return make("is missing")
    case "Union":
      return Option.match(getMessage(e.ast, e.actual), {
        onNone: () =>
          make(
            AST.format(e.ast),
            e.errors.map((e) => {
              switch (e._tag) {
                case "Member":
                  return make(`Union member`, [go(e.error)])
                default:
                  return go(e)
              }
            })
          ),
        onSome: make
      })
    case "Tuple":
      return Option.match(getMessage(e.ast, e.actual), {
        onNone: () =>
          make(
            AST.format(e.ast),
            e.errors.map((index) => make(`[${index.index}]`, [go(index.error)]))
          ),
        onSome: make
      })
    case "TypeLiteral":
      return Option.match(getMessage(e.ast, e.actual), {
        onNone: () =>
          make(
            AST.format(e.ast),
            e.errors.map((key) => make(`[${AST.formatUnknown(key.key)}]`, [go(key.error)]))
          ),
        onSome: make
      })
    case "Transform":
      return Option.match(getTransformMessage(e, e.actual), {
        onNone: () => make(AST.format(e.ast), [make(formatTransformationKind(e.kind), [go(e.error)])]),
        onSome: make
      })
    case "Refinement":
      return Option.match(getRefinementMessage(e, e.actual), {
        onNone: () =>
          make(AST.format(e.ast), [
            make(formatRefinementKind(e.kind), [go(e.error)])
          ]),
        onSome: make
      })
    case "Declaration":
      return Option.match(getMessage(e.ast, e.actual), {
        onNone: () => {
          const error = e.error
          const shouldSkipDefaultMessage = error._tag === "Type" && error.ast === e.ast
          return shouldSkipDefaultMessage ? go(error) : make(AST.format(e.ast), [go(e.error)])
        },
        onSome: make
      })
  }
}
