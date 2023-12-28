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

const formatTuple = (ast: AST.Tuple): string => {
  const formattedElements = ast.elements.map((element) =>
    formatAST(element.type) + (element.isOptional ? "?" : "")
  ).join(", ")
  return Option.match(ast.rest, {
    onNone: () => "readonly [" + formattedElements + "]",
    onSome: ([head, ...tail]) => {
      const formattedHead = formatAST(head)
      const wrappedHead = formattedHead.includes(" | ") ? "(" + formattedHead + ")" : formattedHead

      if (tail.length > 0) {
        const formattedTail = tail.map(formatAST).join(", ")
        if (ast.elements.length > 0) {
          return `readonly [${formattedElements}, ...${wrappedHead}[], ${formattedTail}]`
        } else {
          return `readonly [...${wrappedHead}[], ${formattedTail}]`
        }
      } else {
        if (ast.elements.length > 0) {
          return `readonly [${formattedElements}, ...${wrappedHead}[]]`
        } else {
          return `ReadonlyArray<${formattedHead}>`
        }
      }
    }
  })
}

const formatTypeLiteral = (ast: AST.TypeLiteral): string => {
  const formattedPropertySignatures = ast.propertySignatures.map((ps) =>
    String(ps.name) + (ps.isOptional ? "?" : "") + ": " + formatAST(ps.type)
  ).join("; ")
  if (ast.indexSignatures.length > 0) {
    const formattedIndexSignatures = ast.indexSignatures.map((is) =>
      `[x: ${formatAST(AST.getParameterBase(is.parameter))}]: ${formatAST(is.type)}`
    ).join(" ")
    if (ast.propertySignatures.length > 0) {
      return `{ ${formattedPropertySignatures}, ${formattedIndexSignatures} }`
    } else {
      return `{ ${formattedIndexSignatures} }`
    }
  } else {
    if (ast.propertySignatures.length > 0) {
      return `{ ${formattedPropertySignatures} }`
    } else {
      return "{}"
    }
  }
}

/** @internal */
export const formatAST = (ast: AST.AST): string => {
  switch (ast._tag) {
    case "StringKeyword":
      return Option.getOrElse(getExpected(ast), () => "string")
    case "NumberKeyword":
      return Option.getOrElse(getExpected(ast), () => "number")
    case "BooleanKeyword":
      return Option.getOrElse(getExpected(ast), () => "boolean")
    case "BigIntKeyword":
      return Option.getOrElse(getExpected(ast), () => "bigint")
    case "UndefinedKeyword":
      return Option.getOrElse(getExpected(ast), () => "undefined")
    case "SymbolKeyword":
      return Option.getOrElse(getExpected(ast), () => "symbol")
    case "ObjectKeyword":
      return Option.getOrElse(getExpected(ast), () => "object")
    case "AnyKeyword":
      return Option.getOrElse(getExpected(ast), () => "any")
    case "UnknownKeyword":
      return Option.getOrElse(getExpected(ast), () => "unknown")
    case "VoidKeyword":
      return Option.getOrElse(getExpected(ast), () => "void")
    case "NeverKeyword":
      return Option.getOrElse(getExpected(ast), () => "never")
    case "Literal":
      return Option.getOrElse(getExpected(ast), () => formatActual(ast.literal))
    case "UniqueSymbol":
      return Option.getOrElse(getExpected(ast), () => formatActual(ast.symbol))
    case "Union":
      return Option.getOrElse(
        getExpected(ast),
        () => ast.types.map((member) => formatAST(member)).join(" | ")
      )
    case "TemplateLiteral":
      return Option.getOrElse(getExpected(ast), () => formatTemplateLiteral(ast))
    case "Tuple":
      return Option.getOrElse(getExpected(ast), () => formatTuple(ast))
    case "TypeLiteral":
      return Option.getOrElse(getExpected(ast), () => formatTypeLiteral(ast))
    case "Enums":
      return Option.getOrElse(
        getExpected(ast),
        () =>
          `<enum ${ast.enums.length} value(s): ${
            ast.enums.map((_, value) => JSON.stringify(value)).join(" | ")
          }>`
      )
    case "Suspend":
      return Option.getOrElse(getExpected(ast), () => "<suspended schema>")
    case "Declaration":
      return Option.getOrElse(getExpected(ast), () => "<declaration schema>")
    case "Refinement":
      return Option.getOrElse(getExpected(ast), () => "<refinement schema>")
    case "Transform":
      return Option.getOrElse(
        getExpected(ast),
        () => `<transformation ${formatAST(ast.from)} <-> ${formatAST(ast.to)}>`
      )
  }
}

const uncollapsible = { Union: true, Tuple: true }

const isCollapsible = (es: Forest<string>, errors: NonEmptyReadonlyArray<ParseIssue>): boolean =>
  es.length === 1 && es[0].forest.length !== 0 &&
  !(errors[0]._tag in uncollapsible)

/** @internal */
export const getMessage = (e: Type) =>
  AST.getMessageAnnotation(e.expected).pipe(
    Option.map((annotation) => annotation(e.actual)),
    Option.orElse(() => e.message),
    Option.getOrElse(() => `Expected ${formatAST(e.expected)}, actual ${formatActual(e.actual)}`)
  )

const go = (e: ParseIssue): Tree<string> => {
  switch (e._tag) {
    case "Type":
      return make(getMessage(e))
    case "Forbidden":
      return make("is forbidden")
    case "Unexpected":
      return make(
        `is unexpected, expected ${formatAST(e.expected)}`
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
    case "Union":
      return make(
        formatAST(e.ast),
        e.errors.map((e) => {
          switch (e._tag) {
            case "Key":
            case "Type":
              return go(e)
            case "Member":
              return make(`Union member`, e.errors.map(go))
          }
        })
      )
    case "Tuple":
      return make(
        formatAST(e.ast),
        e.errors.map((e) => {
          const es = e.errors.map(go)
          if (isCollapsible(es, e.errors)) {
            return make(`[${e.index}]${es[0].value}`, es[0].forest)
          }
          return make(`[${e.index}]`, es)
        })
      )
  }
}
