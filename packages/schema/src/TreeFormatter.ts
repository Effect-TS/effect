/**
 * @since 1.0.0
 */

import * as Option from "effect/Option"
import type { NonEmptyReadonlyArray } from "effect/ReadonlyArray"
import * as AST from "./AST.js"
import * as Format from "./Format.js"
import type { ParseIssue, Refinement, Transform, Type } from "./ParseResult.js"

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
export const formatErrors = (errors: NonEmptyReadonlyArray<ParseIssue>): string => {
  const forest = errors.map(go)
  return drawTree(forest.length === 1 ? forest[0] : make(`error(s) found`, errors.map(go)))
}

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

const formatTransformationKind = (kind: Transform["kind"]): string => {
  switch (kind) {
    case "From":
      return "From side transformation failure"
    case "Transformation":
      return "Transformation process failure"
    case "To":
      return "To side transformation failure"
  }
}

const formatRefinementKind = (kind: Refinement["kind"]): string => {
  switch (kind) {
    case "From":
      return "From side refinement failure"
    case "Predicate":
      return "Predicate refinement failure"
  }
}

const getMessage = (ast: AST.AST, actual: unknown): Option.Option<string> => {
  return AST.getMessageAnnotation(ast).pipe(
    Option.map((annotation) => annotation(actual))
  )
}

/** @internal */
export const formatMessage = (e: Type): string =>
  getMessage(e.ast, e.actual).pipe(
    Option.orElse(() => e.message),
    Option.getOrElse(() =>
      `Expected ${Format.formatAST(e.ast, true)}, actual ${Format.formatUnknown(e.actual)}`
    )
  )

const getRefinementMessage = (e: Refinement, actual: unknown): Option.Option<string> => {
  const message = getMessage(e.ast, actual)
  if (e.kind === "From" && e.errors.length === 1) {
    const err = e.errors[0]
    if (err._tag === "Refinement") {
      return Option.orElse(getRefinementMessage(err, err.actual), () => message)
    } else if ("ast" in err) {
      return Option.orElse(getMessage(err.ast, err.actual), () => message)
    }
  }
  return message
}

const go = (e: ParseIssue): Tree<string> => {
  switch (e._tag) {
    case "Type":
      return make(formatMessage(e))
    case "Forbidden":
      return make("is forbidden")
    case "Unexpected":
      return make(`is unexpected, expected ${Format.formatAST(e.expected, true)}`)
    case "Key":
      return make(`[${Format.formatUnknown(e.key)}]`, e.errors.map(go))
    case "Missing":
      return make("is missing")
    case "Union":
      return Option.match(getMessage(e.ast, e.actual), {
        onNone: () =>
          make(
            Format.formatAST(e.ast),
            e.errors.map((e) => {
              switch (e._tag) {
                case "Key":
                case "Type":
                  return go(e)
                case "Member":
                  return make(`Union member`, e.errors.map(go))
              }
            })
          ),
        onSome: make
      })
    case "Tuple":
      return Option.match(getMessage(e.ast, e.actual), {
        onNone: () =>
          make(
            Format.formatAST(e.ast),
            e.errors.map((e) => make(`[${e.index}]`, e.errors.map(go)))
          ),
        onSome: make
      })
    case "TypeLiteral":
      return Option.match(getMessage(e.ast, e.actual), {
        onNone: () => make(Format.formatAST(e.ast), e.errors.map(go)),
        onSome: make
      })
    case "Transform":
      return Option.match(getMessage(e.ast, e.actual), {
        onNone: () =>
          make(Format.formatAST(e.ast), [make(formatTransformationKind(e.kind), e.errors.map(go))]),
        onSome: make
      })
    case "Refinement":
      return Option.match(getRefinementMessage(e, e.actual), {
        onNone: () =>
          make(Format.formatAST(e.ast), [
            make(formatRefinementKind(e.kind), e.errors.map(go))
          ]),
        onSome: make
      })
  }
}
