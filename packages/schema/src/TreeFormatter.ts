/**
 * @since 1.0.0
 */

import { pipe } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import type { NonEmptyReadonlyArray } from "@effect/data/ReadonlyArray"
import * as AST from "@effect/schema/AST"
import type { ParseErrors } from "@effect/schema/ParseResult"

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
 * @since 1.0.0
 */
export const formatErrors = (errors: NonEmptyReadonlyArray<ParseErrors>): string =>
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
  if (
    actual === undefined || actual === null || typeof actual === "number" ||
    typeof actual === "symbol" || actual instanceof Date
  ) {
    return String(actual)
  }
  if (typeof actual === "bigint") {
    return String(actual) + "n"
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

const getMessage = AST.getAnnotation<AST.MessageAnnotation<unknown>>(
  AST.MessageAnnotationId
)

const getTitle = AST.getAnnotation<AST.TitleAnnotation>(
  AST.TitleAnnotationId
)

const getIdentifier = AST.getAnnotation<AST.IdentifierAnnotation>(
  AST.IdentifierAnnotationId
)

const getDescription = AST.getAnnotation<AST.DescriptionAnnotation>(
  AST.DescriptionAnnotationId
)

const getExpected = (ast: AST.AST): O.Option<string> =>
  pipe(
    getIdentifier(ast),
    O.orElse(() => getTitle(ast)),
    O.orElse(() => getDescription(ast))
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
      return O.getOrElse(getExpected(ast), () => ast._tag)
    case "Literal":
      return O.getOrElse(getExpected(ast), () => formatActual(ast.literal))
    case "UniqueSymbol":
      return O.getOrElse(getExpected(ast), () => formatActual(ast.symbol))
    case "Union":
      return ast.types.map(formatExpected).join(" or ")
    case "TemplateLiteral":
      return O.getOrElse(getExpected(ast), () => formatTemplateLiteral(ast))
    case "Tuple":
      return O.getOrElse(getExpected(ast), () => "<anonymous tuple or array schema>")
    case "TypeLiteral":
      return O.getOrElse(getExpected(ast), () => "<anonymous type literal schema>")
    case "Enums":
      return O.getOrElse(
        getExpected(ast),
        () => ast.enums.map((_, value) => JSON.stringify(value)).join(" | ")
      )
    case "Lazy":
      return O.getOrElse(getExpected(ast), () => "<anonymous lazy schema>")
    case "Declaration":
      return O.getOrElse(getExpected(ast), () => "<anonymous declaration schema>")
    case "Refinement":
      return O.getOrElse(getExpected(ast), () => "<anonymous refinement schema>")
    case "Transform":
      return O.getOrElse(
        getExpected(ast),
        () => `${formatExpected(ast.from)} -> ${formatExpected(ast.to)}`
      )
  }
}

const go = (e: ParseErrors): Tree<string> => {
  switch (e._tag) {
    case "Type":
      return make(
        pipe(
          getMessage(e.expected),
          O.map((f) => f(e.actual)),
          O.orElse(() => e.message),
          O.getOrElse(() =>
            `Expected ${formatExpected(e.expected)}, actual ${formatActual(e.actual)}`
          )
        )
      )
    case "Forbidden":
      return make("is forbidden")
    case "Index": {
      const es = e.errors.map(go)
      if (es.length === 1 && es[0].forest.length !== 0) {
        return make(`[${e.index}]${es[0].value}`, es[0].forest)
      }
      return make(`[${e.index}]`, es)
    }
    case "Unexpected":
      return make(`is unexpected`)
    case "Key": {
      const es = e.errors.map(go)
      if (es.length === 1 && es[0].forest.length !== 0) {
        return make(`[${formatActual(e.key)}]${es[0].value}`, es[0].forest)
      }
      return make(`[${formatActual(e.key)}]`, es)
    }
    case "Missing":
      return make(`is missing`)
    case "UnionMember":
      return make(`union member`, e.errors.map(go))
  }
}
