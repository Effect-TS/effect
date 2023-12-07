/**
 * @since 1.0.0
 */

import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import type { NonEmptyReadonlyArray } from "effect/ReadonlyArray"
import * as AST from "./AST.js"
import type { ParseIssue, Type } from "./ParseResult.js"

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
export const formatErrors = (errors: NonEmptyReadonlyArray<ParseIssue>): string =>
  drawTree(make(`error(s) found`, errors.map(go)))

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

/** @internal */
export const formatActual = (actual: unknown): string => {
  if (Predicate.isString(actual)) {
    return JSON.stringify(actual)
  } else if (
    Predicate.isNumber(actual)
    || actual == null
    || Predicate.isBoolean(actual)
    || Predicate.isSymbol(actual)
    || Predicate.isDate(actual)
  ) {
    return String(actual)
  } else if (Predicate.isBigInt(actual)) {
    return String(actual) + "n"
  } else if (
    !Array.isArray(actual)
    && Predicate.hasProperty(actual, "toString")
    && Predicate.isFunction(actual["toString"])
    && actual["toString"] !== Object.prototype.toString
  ) {
    return actual["toString"]()
  }
  try {
    return JSON.stringify(actual)
  } catch (e) {
    return String(actual)
  }
}

const formatTemplateLiteralSpan = (span: AST.TemplateLiteralSpan): string => {
  switch (span.type._tag) {
    case "StringKeyword":
      return "${string}"
    case "NumberKeyword":
      return "${number}"
  }
}

const formatTemplateLiteral = (ast: AST.TemplateLiteral): string =>
  ast.head + ast.spans.map((span) => formatTemplateLiteralSpan(span) + span.literal).join("")

const getExpected = (ast: AST.AST): Option.Option<string> =>
  AST.getIdentifierAnnotation(ast).pipe(
    Option.orElse(() => AST.getTitleAnnotation(ast)),
    Option.orElse(() => AST.getDescriptionAnnotation(ast))
  )

/** @internal */
export const formatExpected = (ast: AST.AST): string => {
  switch (ast._tag) {
    case "StringKeyword":
    case "NumberKeyword":
    case "BooleanKeyword":
    case "BigIntKeyword":
    case "UndefinedKeyword":
    case "SymbolKeyword":
    case "ObjectKeyword":
    case "AnyKeyword":
    case "UnknownKeyword":
    case "VoidKeyword":
    case "NeverKeyword":
      return Option.getOrElse(getExpected(ast), () => ast._tag)
    case "Literal":
      return Option.getOrElse(getExpected(ast), () => formatActual(ast.literal))
    case "UniqueSymbol":
      return Option.getOrElse(getExpected(ast), () => formatActual(ast.symbol))
    case "Union":
      return [...new Set(ast.types.map(formatExpected))].join(" or ")
    case "TemplateLiteral":
      return Option.getOrElse(getExpected(ast), () => formatTemplateLiteral(ast))
    case "Tuple":
      return Option.getOrElse(getExpected(ast), () => "<anonymous tuple or array schema>")
    case "TypeLiteral":
      return Option.getOrElse(getExpected(ast), () => "<anonymous type literal schema>")
    case "Enums":
      return Option.getOrElse(
        getExpected(ast),
        () => ast.enums.map((_, value) => JSON.stringify(value)).join(" | ")
      )
    case "Suspend":
      return Option.getOrElse(getExpected(ast), () => "<anonymous suspended schema>")
    case "Declaration":
      return Option.getOrElse(getExpected(ast), () => "<anonymous declaration schema>")
    case "Refinement":
      return Option.getOrElse(getExpected(ast), () => "<anonymous refinement schema>")
    case "Transform":
      return Option.getOrElse(
        getExpected(ast),
        () => `${formatExpected(ast.from)} <-> ${formatExpected(ast.to)}`
      )
  }
}

const isCollapsible = (es: Forest<string>, errors: NonEmptyReadonlyArray<ParseIssue>): boolean =>
  es.length === 1 && es[0].forest.length !== 0 && errors[0]._tag !== "UnionMember"

/** @internal */
export const getMessage = (e: Type) =>
  AST.getMessageAnnotation(e.expected).pipe(
    Option.map((annotation) => annotation(e.actual)),
    Option.orElse(() => e.message),
    Option.getOrElse(() =>
      `Expected ${formatExpected(e.expected)}, actual ${formatActual(e.actual)}`
    )
  )

const go = (e: ParseIssue): Tree<string> => {
  switch (e._tag) {
    case "Type":
      return make(getMessage(e))
    case "Forbidden":
      return make("is forbidden")
    case "Index": {
      const es = e.errors.map(go)
      if (isCollapsible(es, e.errors)) {
        return make(`[${e.index}]${es[0].value}`, es[0].forest)
      }
      return make(`[${e.index}]`, es)
    }
    case "Unexpected":
      return make(
        "is unexpected" + (Option.isSome(e.ast) ? `, expected ${formatExpected(e.ast.value)}` : "")
      )
    case "Key": {
      const es = e.errors.map(go)
      if (isCollapsible(es, e.errors)) {
        return make(`[${formatActual(e.key)}]${es[0].value}`, es[0].forest)
      }
      return make(`[${formatActual(e.key)}]`, es)
    }
    case "Missing":
      return make("is missing")
    case "UnionMember":
      return make("union member", e.errors.map(go))
  }
}
