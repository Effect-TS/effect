/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/core/Function"
import * as O from "@fp-ts/core/Option"
import type { NonEmptyReadonlyArray } from "@fp-ts/core/ReadonlyArray"
import * as annotations from "@fp-ts/schema/annotation/AST"
import * as AST from "@fp-ts/schema/AST"
import type * as PR from "@fp-ts/schema/ParseResult"

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
export const formatErrors = (errors: NonEmptyReadonlyArray<PR.ParseError>): string =>
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
  if (actual === undefined) {
    return "undefined"
  }
  if (actual === null) {
    return "null"
  }
  if (typeof actual === "number") {
    return Number.isNaN(actual) ? "NaN" : String(actual)
  }
  if (typeof actual === "bigint") {
    return String(actual) + "n"
  }
  if (typeof actual === "symbol") {
    return String(actual)
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

const getMessage = AST.getAnnotation<annotations.Message<unknown>>(
  annotations.MessageId
)

const getTitle = AST.getAnnotation<annotations.Title>(
  annotations.TitleId
)

const getIdentifier = AST.getAnnotation<annotations.Identifier>(
  annotations.IdentifierId
)

const getDescription = AST.getAnnotation<annotations.Description>(
  annotations.DescriptionId
)

const getExpected = (ast: AST.AST): O.Option<string> =>
  pipe(getIdentifier(ast), O.orElse(() => getTitle(ast)), O.orElse(() => getDescription(ast)))

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
      return pipe(getExpected(ast), O.getOrElse(() => ast._tag))
    case "Literal":
      return pipe(getExpected(ast), O.getOrElse(() => formatActual(ast.literal)))
    case "UniqueSymbol":
      return pipe(getExpected(ast), O.getOrElse(() => formatActual(ast.symbol)))
    case "Union":
      return ast.types.map(formatExpected).join(" or ")
    case "Refinement":
      return pipe(getExpected(ast), O.getOrElse(() => "refinement"))
    case "TemplateLiteral":
      return pipe(getExpected(ast), O.getOrElse(() => formatTemplateLiteral(ast)))
    case "Tuple":
      return pipe(getExpected(ast), O.getOrElse(() => "tuple or array"))
    case "TypeLiteral":
      return pipe(getExpected(ast), O.getOrElse(() => "type literal"))
    case "Enums":
      return pipe(
        getExpected(ast),
        O.getOrElse(() => ast.enums.map((_, value) => JSON.stringify(value)).join(" | "))
      )
    case "Lazy":
      return pipe(
        getExpected(ast),
        O.getOrElse(() => "<anonymous Lazy schema>")
      )
    case "TypeAlias":
      return pipe(
        getExpected(ast),
        O.getOrElse(() => "<anonymous TypeAlias schema>")
      )
    case "Transform":
      return `a parsable value from ${formatExpected(ast.from)} to ${formatExpected(ast.to)}`
  }
}

const go = (e: PR.ParseError): Tree<string> => {
  switch (e._tag) {
    case "Type":
      return make(
        pipe(
          getMessage(e.expected),
          O.map((f) => f(e.actual)),
          O.getOrElse(() =>
            `Expected ${formatExpected(e.expected)}, actual ${formatActual(e.actual)}`
          )
        )
      )
    case "Index":
      return make(`index ${e.index}`, e.errors.map(go))
    case "Unexpected":
      return make(`is unexpected`)
    case "Key":
      return make(`key ${formatActual(e.key)}`, e.errors.map(go))
    case "Missing":
      return make(`is missing`)
    case "UnionMember":
      return make(`union member`, e.errors.map(go))
  }
}
