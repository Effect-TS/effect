/**
 * @since 0.67.0
 */

import type * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as AST from "./AST.js"
import * as util_ from "./internal/util.js"
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
 * @since 0.67.0
 */
export const formatIssue = (issue: ParseResult.ParseIssue): Effect.Effect<string> =>
  Effect.map(go(issue), (tree) => drawTree(tree))

/**
 * @category formatting
 * @since 0.67.0
 */
export const formatIssueSync = (issue: ParseResult.ParseIssue): string => Effect.runSync(formatIssue(issue))

/**
 * @category formatting
 * @since 0.67.0
 */
export const formatError = (error: ParseResult.ParseError): Effect.Effect<string> => formatIssue(error.issue)

/**
 * @category formatting
 * @since 0.67.0
 */
export const formatErrorSync = (error: ParseResult.ParseError): string => formatIssueSync(error.issue)

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

const formatTransformationKind = (kind: ParseResult.Transformation["kind"]): string => {
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

const getInnerMessage = (
  issue: ParseResult.ParseIssue
): Effect.Effect<string, Cause.NoSuchElementException> => {
  switch (issue._tag) {
    case "Refinement": {
      if (issue.kind === "From") {
        return getMessage(issue.issue)
      }
      break
    }
    case "Transformation": {
      return getMessage(issue.issue)
    }
  }
  return Option.none()
}

const getCurrentMessage: (
  issue: ParseResult.ParseIssue
) => Effect.Effect<{ message: string; override: boolean }, Cause.NoSuchElementException> = (
  issue: ParseResult.ParseIssue
) =>
  AST.getMessageAnnotation(issue.ast).pipe(Effect.flatMap((annotation) => {
    const out = annotation(issue)
    return Predicate.isString(out)
      ? Effect.succeed({ message: out, override: false })
      : Effect.isEffect(out)
      ? Effect.map(out, (message) => ({ message, override: false }))
      : Predicate.isString(out.message)
      ? Effect.succeed({ message: out.message, override: out.override })
      : Effect.map(out.message, (message) => ({ message, override: out.override }))
  }))

/** @internal */
export const getMessage: (
  issue: ParseResult.ParseIssue
) => Effect.Effect<string, Cause.NoSuchElementException> = (issue: ParseResult.ParseIssue) => {
  const current = getCurrentMessage(issue)
  return getInnerMessage(issue).pipe(
    Effect.flatMap((inner) => Effect.map(current, (current) => current.override ? current.message : inner)),
    Effect.catchAll(() =>
      Effect.flatMap(current, (current) => {
        if (
          !current.override && (
            (issue._tag === "Refinement" && issue.kind !== "Predicate") ||
            (issue._tag === "Transformation" && issue.kind !== "Transformation")
          )
        ) {
          return Option.none()
        }
        return Effect.succeed(current.message)
      })
    )
  )
}

const getParseIssueTitleAnnotation = (issue: ParseResult.ParseIssue): Option.Option<string> =>
  Option.filterMap(
    AST.getParseIssueTitleAnnotation(issue.ast),
    (annotation) => Option.fromNullable(annotation(issue))
  )

/** @internal */
export const formatTypeMessage = (e: ParseResult.Type): Effect.Effect<string> =>
  getMessage(e).pipe(
    Effect.orElse(() => getParseIssueTitleAnnotation(e)),
    Effect.catchAll(() =>
      Effect.succeed(e.message ?? `Expected ${String(e.ast)}, actual ${util_.formatUnknown(e.actual)}`)
    )
  )

const getParseIssueTitle = (issue: ParseResult.ParseIssue): string =>
  Option.getOrElse(getParseIssueTitleAnnotation(issue), () => String(issue.ast))

/** @internal */
export const formatForbiddenMessage = (e: ParseResult.Forbidden): string => e.message ?? "is forbidden"

/** @internal */
export const formatUnexpectedMessage = (e: ParseResult.Unexpected): string => e.message ?? "is unexpected"

/** @internal */
export const formatMissingMessage = (e: ParseResult.Missing): Effect.Effect<string> =>
  AST.getMissingMessageAnnotation(e.ast).pipe(
    Effect.flatMap((annotation) => {
      const out = annotation()
      return Predicate.isString(out) ? Effect.succeed(out) : out
    }),
    Effect.catchAll(() => Effect.succeed(e.message ?? "is missing"))
  )

const getTree = (issue: ParseResult.ParseIssue, onFailure: () => Effect.Effect<Tree<string>>) =>
  Effect.matchEffect(getMessage(issue), {
    onFailure,
    onSuccess: (message) => Effect.succeed(make(message))
  })

const formatPathItem = (name: PropertyKey): string => `[${util_.formatPropertyKey(name)}]`

/** @internal */
export const isMany = <A>(
  path: undefined | ParseResult.Many<A>
): path is readonly [A, A, ...ReadonlyArray<A>] => Array.isArray(path)

const addPath = (many: ParseResult.Many<PropertyKey>, tree: Tree<string>): Tree<string> =>
  make(isMany(many) ? many.map(formatPathItem).join("") : formatPathItem(many), [tree])

const go = (
  e: ParseResult.ParseIssue | ParseResult.Path
): Effect.Effect<Tree<string>> => {
  switch (e._tag) {
    case "Type":
      return Effect.map(formatTypeMessage(e), (s) => e.path !== undefined ? addPath(e.path, make(s)) : make(s))
    case "Forbidden":
      return Effect.succeed(make(getParseIssueTitle(e), [make(formatForbiddenMessage(e))]))
    case "Unexpected":
      return Effect.succeed(addPath(e.path, make(formatUnexpectedMessage(e))))
    case "Missing":
      return Effect.map(formatMissingMessage(e), (s) => addPath(e.path, make(s)))
    case "Transformation":
      return getTree(e, () =>
        Effect.map(
          go(e.issue),
          (tree) => make(getParseIssueTitle(e), [make(formatTransformationKind(e.kind), [tree])])
        ))
    case "Refinement":
      return getTree(
        e,
        () =>
          Effect.map(go(e.issue), (tree) => make(getParseIssueTitle(e), [make(formatRefinementKind(e.kind), [tree])]))
      )
    case "Path":
      return Effect.map(go(e.issue), (tree) => make(`[${util_.formatPropertyKey(e.name)}]`, [tree]))
    case "And": {
      const out = getTree(
        e,
        () => Effect.map(Effect.forEach(e.issues, go), (forest) => make(getParseIssueTitle(e), forest))
      )
      const path = e.path
      return path !== undefined ? Effect.map(out, (tree) => addPath(path, tree)) : out
    }
  }
}
