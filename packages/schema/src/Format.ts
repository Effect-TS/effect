/**
 * @since 1.0.0
 */
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as AST from "./AST.js"
import type * as Schema from "./Schema.js"

/**
 * @category formatting
 * @since 1.0.0
 */
export const format = <I, A>(schema: Schema.Schema<I, A>): string => formatAST(schema.ast)

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatAST = (ast: AST.AST, verbose: boolean = false): string => {
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
      return Option.getOrElse(getExpected(ast, verbose), () => ast._tag)
    case "Literal":
      return Option.getOrElse(getExpected(ast, verbose), () => formatUnknown(ast.literal))
    case "UniqueSymbol":
      return Option.getOrElse(getExpected(ast, verbose), () => formatUnknown(ast.symbol))
    case "Union":
      return Option.getOrElse(
        getExpected(ast, verbose),
        () => ast.types.map((member) => formatAST(member)).join(" | ")
      )
    case "TemplateLiteral":
      return Option.getOrElse(getExpected(ast, verbose), () => formatTemplateLiteral(ast))
    case "Tuple":
      return Option.getOrElse(getExpected(ast, verbose), () => formatTuple(ast))
    case "TypeLiteral":
      return Option.getOrElse(getExpected(ast, verbose), () => formatTypeLiteral(ast))
    case "Enums":
      return Option.getOrElse(
        getExpected(ast, verbose),
        () => `<enum ${ast.enums.length} value(s): ${ast.enums.map((_, value) => JSON.stringify(value)).join(" | ")}>`
      )
    case "Suspend":
      Option.liftThrowable(ast.f)
      return getExpected(ast, verbose).pipe(
        Option.orElse(() =>
          Option.flatMap(
            Option.liftThrowable(ast.f)(),
            (ast) => getExpected(ast, verbose)
          )
        ),
        Option.getOrElse(() => "<suspended schema>")
      )
    case "Declaration":
      return Option.getOrElse(getExpected(ast, verbose), () => "<declaration schema>")
    case "Refinement":
      return Option.getOrElse(getExpected(ast, verbose), () => "<refinement schema>")
    case "Transform":
      return Option.getOrElse(
        getExpected(ast, verbose),
        () => formatTransformation(formatAST(ast.from), formatAST(ast.to))
      )
  }
}

/** @internal */
export const formatTransformation = (from: string, to: string): string => `(${from} <-> ${to})`

/**
 * @category formatting
 * @since 1.0.0
 */
export const formatUnknown = (u: unknown): string => {
  if (Predicate.isString(u)) {
    return JSON.stringify(u)
  } else if (
    Predicate.isNumber(u)
    || u == null
    || Predicate.isBoolean(u)
    || Predicate.isSymbol(u)
    || Predicate.isDate(u)
  ) {
    return String(u)
  } else if (Predicate.isBigInt(u)) {
    return String(u) + "n"
  } else if (
    !Array.isArray(u)
    && Predicate.hasProperty(u, "toString")
    && Predicate.isFunction(u["toString"])
    && u["toString"] !== Object.prototype.toString
  ) {
    return u["toString"]()
  }
  try {
    return JSON.stringify(u)
  } catch (e) {
    return String(u)
  }
}

const formatTemplateLiteral = (ast: AST.TemplateLiteral): string =>
  "`" + ast.head + ast.spans.map((span) => formatTemplateLiteralSpan(span) + span.literal).join("") +
  "`"

const getExpected = (ast: AST.AST, verbose: boolean): Option.Option<string> => {
  if (verbose) {
    const description = AST.getDescriptionAnnotation(ast).pipe(
      Option.orElse(() => AST.getTitleAnnotation(ast))
    )
    return Option.match(AST.getIdentifierAnnotation(ast), {
      onNone: () => description,
      onSome: (identifier) =>
        Option.match(description, {
          onNone: () => Option.some(identifier),
          onSome: (description) => Option.some(`${identifier} (${description})`)
        })
    })
  }
  return AST.getIdentifierAnnotation(ast).pipe(
    Option.orElse(() => AST.getTitleAnnotation(ast)),
    Option.orElse(() => AST.getDescriptionAnnotation(ast))
  )
}

const formatTuple = (ast: AST.Tuple): string => {
  const formattedElements = ast.elements.map((element) => formatAST(element.type) + (element.isOptional ? "?" : ""))
    .join(", ")
  return Option.match(ast.rest, {
    onNone: () => "readonly [" + formattedElements + "]",
    onSome: ([head, ...tail]) => {
      const formattedHead = formatAST(head)
      const wrappedHead = formattedHead.includes(" | ") ? "(" + formattedHead + ")" : formattedHead

      if (tail.length > 0) {
        const formattedTail = tail.map((ast) => formatAST(ast)).join(", ")
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
    ).join("; ")
    if (ast.propertySignatures.length > 0) {
      return `{ ${formattedPropertySignatures}; ${formattedIndexSignatures} }`
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

const formatTemplateLiteralSpan = (span: AST.TemplateLiteralSpan): string => {
  switch (span.type._tag) {
    case "StringKeyword":
      return "${string}"
    case "NumberKeyword":
      return "${number}"
  }
}
