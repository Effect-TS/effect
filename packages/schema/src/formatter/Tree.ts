/**
 * @since 1.0.0
 */

import type { NonEmptyReadonlyArray } from "@fp-ts/data/ReadonlyArray"
import type * as AST from "@fp-ts/schema/AST"
import type * as DE from "@fp-ts/schema/ParseError"

interface Forest<A> extends ReadonlyArray<Tree<A>> {}

interface Tree<A> {
  value: A
  forest: Forest<A>
}

const make = <A>(value: A, forest: Forest<A> = []): Tree<A> => ({
  value,
  forest
})

/**
 * @since 1.0.0
 */
export const formatErrors = (errors: NonEmptyReadonlyArray<DE.ParseError>): string =>
  drawTree(make(`${errors.length} error(s) found`, errors.map(go)))

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
  if (typeof actual === "number") {
    return Number.isNaN(actual) ? "NaN" : String(actual)
  }
  if (typeof actual === "symbol") {
    return String(actual)
  }
  if (actual === undefined) {
    return "undefined"
  }
  if (actual === null) {
    return "null"
  }
  if (actual instanceof Set) {
    return `Set([${formatActual(Array.from(actual.values()))}])`
  }
  if (actual instanceof Map) {
    return `Map([${formatActual(Array.from(actual.entries()))}])`
  }
  try {
    return JSON.stringify(actual, (_, value) => typeof value === "function" ? value.name : value)
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

/** @internal */
export const formatAST = (ast: AST.AST): string => {
  switch (ast._tag) {
    case "StringKeyword":
      return "a string"
    case "NumberKeyword":
      return "a number"
    case "BooleanKeyword":
      return "a boolean"
    case "BigIntKeyword":
      return "a bigint"
    case "UndefinedKeyword":
      return "undefined"
    case "SymbolKeyword":
      return "a symbol"
    case "ObjectKeyword":
      return "an object"
    case "AnyKeyword":
      return "any"
    case "UnknownKeyword":
      return "unknown"
    case "VoidKeyword":
      return "void"
    case "NeverKeyword":
      return "never"
    case "Literal":
      return `the literal ${formatActual(ast.literal)}`
    case "UniqueSymbol":
      return `the unique symbol ${formatActual(ast.symbol)}`
    case "Union":
      return ast.types.map(formatAST).join(" or ")
    case "Refinement":
      return `a refinement of ${formatAST(ast.from)} such that: ` + ast.meta.message
    case "TemplateLiteral":
      return `a value conforming to the template literal ${formatTemplateLiteral(ast)}`
    case "Tuple":
      return "a tuple or an array"
    case "TypeLiteral":
      return "an object"
    case "Enums":
      return `a value conforming to the enum ${ast.identifier}`
    case "Lazy":
      return `an instance of ${ast.identifier}`
    case "TypeAlias":
      return `an instance of ${ast.identifier}`
    case "Transform":
      return `a value parsable from ${formatAST(ast.from)} to  ${formatAST(ast.to)}`
  }
}

const go = (e: DE.ParseError): Tree<string> => {
  switch (e._tag) {
    case "Type":
      return make(
        `${formatActual(e.actual)} must be ${formatAST(e.expected)}`
      )
    case "Refinement":
      return make(
        `${formatActual(e.actual)} must be ${e.meta.message}`
      )
    case "Transform":
      return make(
        `${formatActual(e.actual)} must be parsable from ${formatAST(e.from)} to ${formatAST(e.to)}`
      )
    case "Equal":
      return make(
        `${formatActual(e.actual)} must be equal to ${formatActual(e.expected)}`
      )
    case "Index":
      return make(`index ${e.index}`, e.errors.map(go))
    case "Unexpected":
      return make(`is unexpected`)
    case "Key":
      return make(`key ${formatActual(e.key)}`, e.errors.map(go))
    case "Missing":
      return make(`is missing`)
    case "Member":
      return make(`union member`, e.errors.map(go))
  }
}
