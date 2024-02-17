/**
 * @since 1.0.0
 */

import type * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
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
export const formatIssuesEffect = (issues: NonEmptyReadonlyArray<ParseResult.ParseIssue>): Effect.Effect<string> =>
  Effect.map(
    Effect.forEach(issues, go),
    (forest) => drawTree(forest.length === 1 ? forest[0] : make(`error(s) found`, forest))
  )

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatIssues = (issues: NonEmptyReadonlyArray<ParseResult.ParseIssue>): string =>
  Effect.runSync(formatIssuesEffect(issues))

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatIssueEffect = (error: ParseResult.ParseIssue): Effect.Effect<string> => formatIssuesEffect([error])

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
export const getMessage: (
  issue: ParseResult.ParseIssue
) => Effect.Effect<string, Cause.NoSuchElementException> = (issue: ParseResult.ParseIssue) =>
  AST.getMessageAnnotation(issue.ast).pipe(Effect.flatMap((annotation) => {
    const out = annotation(issue)
    return Predicate.isString(out) ? Effect.succeed(out) : out
  }))

/** @internal */
export const formatTypeMessage = (e: ParseResult.Type): Effect.Effect<string> =>
  getMessage(e).pipe(
    Effect.orElse(() => e.message),
    Effect.catchAll(() => Effect.succeed(`Expected ${AST.format(e.ast, true)}, actual ${AST.formatUnknown(e.actual)}`))
  )

/** @internal */
export const formatForbiddenMessage = (e: ParseResult.Forbidden): string =>
  Option.getOrElse(e.message, () => "is forbidden")

const getParseIssueMessage = (
  issue: ParseResult.ParseIssue,
  orElse: () => Effect.Effect<string, Cause.NoSuchElementException>
): Effect.Effect<string, Cause.NoSuchElementException> => {
  switch (issue._tag) {
    case "Refinement":
      return Effect.catchAll(getRefinementMessage(issue), orElse)
    case "Transform":
      return Effect.catchAll(getTransformMessage(issue), orElse)
    case "Tuple":
    case "TypeLiteral":
    case "Union":
    case "Type":
      return Effect.catchAll(getMessage(issue), orElse)
  }
  return orElse()
}

/** @internal */
export const getRefinementMessage = (
  e: ParseResult.Refinement
): Effect.Effect<string, Cause.NoSuchElementException> => {
  if (e.kind === "From") {
    return getParseIssueMessage(e.error, () => getMessage(e))
  }
  return getMessage(e)
}

/** @internal */
export const getTransformMessage = (e: ParseResult.Transform): Effect.Effect<string, Cause.NoSuchElementException> =>
  getParseIssueMessage(e.error, () => getMessage(e))

const go = (e: ParseResult.ParseIssue | ParseResult.Missing | ParseResult.Unexpected): Effect.Effect<Tree<string>> => {
  switch (e._tag) {
    case "Type":
      return Effect.map(formatTypeMessage(e), make)
    case "Forbidden":
      return Effect.succeed(make(AST.format(e.ast), [make(formatForbiddenMessage(e))]))
    case "Unexpected":
      return Effect.succeed(make(`is unexpected, expected ${AST.format(e.ast, true)}`))
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
            (forest) => make(AST.format(e.ast), forest)
          ),
        onSuccess: (message) => Effect.succeed(make(message))
      })
    case "Tuple":
      return Effect.matchEffect(getMessage(e), {
        onFailure: () =>
          Effect.map(
            Effect.forEach(
              e.errors,
              (index) => Effect.map(go(index.error), (tree) => make(`[${index.index}]`, [tree]))
            ),
            (forest) => make(AST.format(e.ast), forest)
          ),
        onSuccess: (message) => Effect.succeed(make(message))
      })
    case "TypeLiteral":
      return Effect.matchEffect(getMessage(e), {
        onFailure: () =>
          Effect.map(
            Effect.forEach(e.errors, (key) =>
              Effect.map(go(key.error), (tree) => make(`[${AST.formatUnknown(key.key)}]`, [tree]))),
            (forest) =>
              make(AST.format(e.ast), forest)
          ),
        onSuccess: (message) => Effect.succeed(make(message))
      })
    case "Transform":
      return Effect.matchEffect(getTransformMessage(e), {
        onFailure: () =>
          Effect.map(go(e.error), (tree) => make(AST.format(e.ast), [make(formatTransformationKind(e.kind), [tree])])),
        onSuccess: (message) => Effect.succeed(make(message))
      })
    case "Refinement":
      return Effect.matchEffect(getRefinementMessage(e), {
        onFailure: () =>
          Effect.map(go(e.error), (tree) => make(AST.format(e.ast), [make(formatRefinementKind(e.kind), [tree])])),
        onSuccess: (message) => Effect.succeed(make(message))
      })
    case "Declaration":
      return Effect.matchEffect(getMessage(e), {
        onFailure: () => {
          const error = e.error
          const shouldSkipDefaultMessage = error._tag === "Type" && error.ast === e.ast
          return shouldSkipDefaultMessage
            ? go(error)
            : Effect.map(go(e.error), (tree) => make(AST.format(e.ast), [tree]))
        },
        onSuccess: (message) => Effect.succeed(make(message))
      })
  }
}
