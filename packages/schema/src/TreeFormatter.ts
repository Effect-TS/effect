/**
 * @since 1.0.0
 */

import type * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as AST from "./AST.js"
import * as _util from "./internal/util.js"
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
export const formatIssueEffect = (issue: ParseResult.ParseIssue): Effect.Effect<string> =>
  Effect.map(go(issue), (tree) => drawTree(tree))

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatIssue = (issue: ParseResult.ParseIssue): string => Effect.runSync(formatIssueEffect(issue))

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatErrorEffect = (error: ParseResult.ParseError): Effect.Effect<string> =>
  formatIssueEffect(error.error)

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
    case "Encoded":
      return "Encoded side transformation failure"
    case "Transformation":
      return "Transformation process failure"
    case "Type":
      return "Type side transformation failure"
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

const getPrevMessage = (
  issue: ParseResult.ParseIssue
): Effect.Effect<string, Cause.NoSuchElementException> => {
  switch (issue._tag) {
    case "Refinement": {
      if (issue.kind === "From") {
        return getMessage(issue.error)
      }
      break
    }
    case "Transformation":
      return getMessage(issue.error)
  }
  return Option.none()
}

const getCurrentMessage: (
  issue: ParseResult.ParseIssue
) => Effect.Effect<string, Cause.NoSuchElementException> = (issue: ParseResult.ParseIssue) =>
  AST.getMessageAnnotation(issue.ast).pipe(Effect.flatMap((annotation) => {
    const out = annotation(issue)
    return Predicate.isString(out) ? Effect.succeed(out) : out
  }))

/** @internal */
export const getMessage: (
  issue: ParseResult.ParseIssue
) => Effect.Effect<string, Cause.NoSuchElementException> = (issue: ParseResult.ParseIssue) =>
  Effect.catchAll(getPrevMessage(issue), () => getCurrentMessage(issue))

/** @internal */
export const formatTypeMessage = (e: ParseResult.Type): Effect.Effect<string> =>
  getMessage(e).pipe(
    Effect.orElse(() => e.message),
    Effect.catchAll(() => Effect.succeed(`Expected ${e.ast.toString(true)}, actual ${_util.formatUnknown(e.actual)}`))
  )

/** @internal */
export const formatForbiddenMessage = (e: ParseResult.Forbidden): string =>
  Option.getOrElse(e.message, () => "is forbidden")

const go = (e: ParseResult.ParseIssue | ParseResult.Missing | ParseResult.Unexpected): Effect.Effect<Tree<string>> => {
  switch (e._tag) {
    case "Type":
      return Effect.map(formatTypeMessage(e), make)
    case "Forbidden":
      return Effect.succeed(make(String(e.ast), [make(formatForbiddenMessage(e))]))
    case "Unexpected":
      return Effect.succeed(make(`is unexpected, expected ${e.ast.toString(true)}`))
    case "Missing":
      return Effect.succeed(make("is missing"))
    case "Union":
      return Effect.matchEffect(getMessage(e), {
        onFailure: () =>
          Effect.map(
            Effect.forEach(e.errors, (e) => {
              switch (e._tag) {
                case "Member":
                  return Effect.map(go(e.error), (tree) => make(`Union member`, [tree]))
                default:
                  return go(e)
              }
            }),
            (forest) => make(String(e.ast), forest)
          ),
        onSuccess: (message) => Effect.succeed(make(message))
      })
    case "TupleType":
      return Effect.matchEffect(getMessage(e), {
        onFailure: () =>
          Effect.map(
            Effect.forEach(
              e.errors,
              (index) => Effect.map(go(index.error), (tree) => make(`[${index.index}]`, [tree]))
            ),
            (forest) => make(String(e.ast), forest)
          ),
        onSuccess: (message) => Effect.succeed(make(message))
      })
    case "TypeLiteral":
      return Effect.matchEffect(getMessage(e), {
        onFailure: () =>
          Effect.map(
            Effect.forEach(e.errors, (key) =>
              Effect.map(go(key.error), (tree) => make(`[${_util.formatUnknown(key.key)}]`, [tree]))),
            (forest) =>
              make(String(e.ast), forest)
          ),
        onSuccess: (message) => Effect.succeed(make(message))
      })
    case "Transformation":
      return Effect.matchEffect(getMessage(e), {
        onFailure: () =>
          Effect.map(go(e.error), (tree) => make(String(e.ast), [make(formatTransformationKind(e.kind), [tree])])),
        onSuccess: (message) => Effect.succeed(make(message))
      })
    case "Refinement":
      return Effect.matchEffect(getMessage(e), {
        onFailure: () =>
          Effect.map(go(e.error), (tree) => make(String(e.ast), [make(formatRefinementKind(e.kind), [tree])])),
        onSuccess: (message) => Effect.succeed(make(message))
      })
    case "Declaration":
      return Effect.matchEffect(getMessage(e), {
        onFailure: () => {
          const error = e.error
          const shouldSkipDefaultMessage = error._tag === "Type" && error.ast === e.ast
          return shouldSkipDefaultMessage
            ? go(error)
            : Effect.map(go(e.error), (tree) => make(String(e.ast), [tree]))
        },
        onSuccess: (message) => Effect.succeed(make(message))
      })
  }
}
