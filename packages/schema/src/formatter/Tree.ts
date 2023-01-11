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
      return "must be a string"
    case "NumberKeyword":
      return "must be a number"
    case "BooleanKeyword":
      return "must be a boolean"
    case "BigIntKeyword":
      return "must be a bigint"
    case "UndefinedKeyword":
      return "must be undefined"
    case "SymbolKeyword":
      return "must be a symbol"
    case "ObjectKeyword":
      return "must be an object"
    case "AnyKeyword":
      return "must be any"
    case "UnknownKeyword":
      return "must be unknown"
    case "VoidKeyword":
      return "must be void"
    case "NeverKeyword":
      return "must be never"
    case "Literal":
      return `must be the literal ${formatActual(ast.literal)}`
    case "UniqueSymbol":
      return `must be the unique symbol ${formatActual(ast.symbol)}`
    case "Union":
      return ast.types.map(formatAST).join(" or ")
    case "Refinement":
      return `must be a refinement of ${formatAST(ast.from)} such that: ` + ast.meta.message
    case "TemplateLiteral":
      return `must conform to the template literal ${formatTemplateLiteral(ast)}`
    case "Tuple":
      return "must be a tuple or an array"
    case "TypeLiteral":
      return "must be an object"
    case "Enums":
      return `must conform to the enum ${ast.identifier}`
    case "Lazy":
      return `must be an instance of ${"TODO"}` // TODO
    case "TypeAlias":
      return formatAST(ast.type)
    case "Transform":
      return `must be parseable from ${ast.from} to ${ast.to}` // TODO
  }
}

const go = (e: DE.ParseError): Tree<string> => {
  switch (e._tag) {
    case "Type":
      return make(
        `${formatActual(e.actual)} ${formatAST(e.expected)}`
      )
    case "Refinement":
      return make(
        `${formatActual(e.actual)} did not satisfy: ${e.meta.message}`
      )
    case "Transform":
      return make(
        `${formatActual(e.actual)} did not satisfy parsing from (${e.from}) to (${e.to})`
      )
    case "Equal":
      return make(
        `${formatActual(e.actual)} did not satisfy isEqual(${formatActual(e.expected)})`
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
