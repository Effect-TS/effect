/**
 * @since 1.0.0
 */

import type { Effect } from "effect/Effect"
import { dual, identity, pipe } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Hash from "effect/Hash"
import * as Number from "effect/Number"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import * as Predicate from "effect/Predicate"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type { Concurrency } from "effect/Types"
import * as _util from "./internal/util.js"
import type { ParseIssue } from "./ParseResult.js"

/**
 * @category model
 * @since 1.0.0
 */
export type AST =
  | Declaration
  | Literal
  | UniqueSymbol
  | UndefinedKeyword
  | VoidKeyword
  | NeverKeyword
  | UnknownKeyword
  | AnyKeyword
  | StringKeyword
  | NumberKeyword
  | BooleanKeyword
  | BigIntKeyword
  | SymbolKeyword
  | ObjectKeyword
  | Enums
  | TemplateLiteral
  // possible transformations
  | Refinement
  | Tuple
  | TypeLiteral
  | Union
  | Suspend
  // transformations
  | Transform

// -------------------------------------------------------------------------------------
// annotations
// -------------------------------------------------------------------------------------

/**
 * @category annotations
 * @since 1.0.0
 */
export type BrandAnnotation = ReadonlyArray.NonEmptyReadonlyArray<string | symbol>

/**
 * @category annotations
 * @since 1.0.0
 */
export const BrandAnnotationId = Symbol.for("@effect/schema/annotation/Brand")

/**
 * @category annotations
 * @since 1.0.0
 */
export type TypeAnnotation = symbol

/**
 * @category annotations
 * @since 1.0.0
 */
export const TypeAnnotationId = Symbol.for("@effect/schema/annotation/Type")

/**
 * @category annotations
 * @since 1.0.0
 */
export type MessageAnnotation = (issue: ParseIssue) => string | Effect<string>

/**
 * @category annotations
 * @since 1.0.0
 */
export const MessageAnnotationId = Symbol.for("@effect/schema/annotation/Message")

/**
 * @category annotations
 * @since 1.0.0
 */
export type IdentifierAnnotation = string

/**
 * @category annotations
 * @since 1.0.0
 */
export const IdentifierAnnotationId = Symbol.for("@effect/schema/annotation/Identifier")

/**
 * @category annotations
 * @since 1.0.0
 */
export type TitleAnnotation = string

/**
 * @category annotations
 * @since 1.0.0
 */
export const TitleAnnotationId = Symbol.for("@effect/schema/annotation/Title")

/**
 * @category annotations
 * @since 1.0.0
 */
export type DescriptionAnnotation = string

/**
 * @category annotations
 * @since 1.0.0
 */
export const DescriptionAnnotationId = Symbol.for("@effect/schema/annotation/Description")

/**
 * @category annotations
 * @since 1.0.0
 */
export type ExamplesAnnotation<A> = ReadonlyArray.NonEmptyReadonlyArray<A>

/**
 * @category annotations
 * @since 1.0.0
 */
export const ExamplesAnnotationId = Symbol.for("@effect/schema/annotation/Examples")

/**
 * @category annotations
 * @since 1.0.0
 */
export type DefaultAnnotation<A> = A

/**
 * @category annotations
 * @since 1.0.0
 */
export const DefaultAnnotationId = Symbol.for("@effect/schema/annotation/Default")

/**
 * @category annotations
 * @since 1.0.0
 */
export type JSONSchemaAnnotation = object

/**
 * @category annotations
 * @since 1.0.0
 */
export const JSONSchemaAnnotationId = Symbol.for("@effect/schema/annotation/JSONSchema")

/**
 * @category annotations
 * @since 1.0.0
 */
export type DocumentationAnnotation = string

/**
 * @category annotations
 * @since 1.0.0
 */
export const DocumentationAnnotationId = Symbol.for("@effect/schema/annotation/Documentation")

/**
 * @category annotations
 * @since 1.0.0
 */
export type ConcurrencyAnnotation = Concurrency | undefined

/**
 * @category annotations
 * @since 1.0.0
 */
export const ConcurrencyAnnotationId = Symbol.for("@effect/schema/annotation/Concurrency")

/**
 * @category annotations
 * @since 1.0.0
 */
export type BatchingAnnotation = boolean | "inherit" | undefined

/**
 * @category annotations
 * @since 1.0.0
 */
export const BatchingAnnotationId = Symbol.for("@effect/schema/annotation/Batching")

/** @internal */
export const SurrogateAnnotationId = Symbol.for("@effect/schema/annotation/Surrogate")

/**
 * Used by:
 *
 * - AST.keyof
 * - AST.getPropertyKeyIndexedAccess
 * - AST.getPropertyKeys
 * - AST.getPropertySignatures
 * - AST.getWeight
 * - Parser.getLiterals
 *
 * @internal
 */
export type SurrogateAnnotation = AST

/**
 * @category annotations
 * @since 1.0.0
 */
export interface Annotations {
  readonly [_: symbol]: unknown
}

/**
 * @category annotations
 * @since 1.0.0
 */
export interface Annotated {
  readonly annotations: Annotations
}

/**
 * @category annotations
 * @since 1.0.0
 */
export const getAnnotation: {
  <A>(key: symbol): (annotated: Annotated) => Option.Option<A>
  <A>(annotated: Annotated, key: symbol): Option.Option<A>
} = dual(
  2,
  <A>(annotated: Annotated, key: symbol): Option.Option<A> =>
    Object.prototype.hasOwnProperty.call(annotated.annotations, key) ?
      Option.some(annotated.annotations[key] as any) :
      Option.none()
)

/**
 * @category annotations
 * @since 1.0.0
 */
export const getBrandAnnotation = getAnnotation<BrandAnnotation>(
  BrandAnnotationId
)

/**
 * @category annotations
 * @since 1.0.0
 */
export const getMessageAnnotation = getAnnotation<MessageAnnotation>(
  MessageAnnotationId
)

/**
 * @category annotations
 * @since 1.0.0
 */
export const getTitleAnnotation = getAnnotation<TitleAnnotation>(
  TitleAnnotationId
)

/**
 * @category annotations
 * @since 1.0.0
 */
export const getIdentifierAnnotation = getAnnotation<IdentifierAnnotation>(
  IdentifierAnnotationId
)

/**
 * @category annotations
 * @since 1.0.0
 */
export const getDescriptionAnnotation = getAnnotation<DescriptionAnnotation>(
  DescriptionAnnotationId
)

/**
 * @category annotations
 * @since 1.0.0
 */
export const getExamplesAnnotation = getAnnotation<ExamplesAnnotation<unknown>>(ExamplesAnnotationId)

/**
 * @category annotations
 * @since 1.0.0
 */
export const getDefaultAnnotation = getAnnotation<DefaultAnnotation<unknown>>(DefaultAnnotationId)

/**
 * @category annotations
 * @since 1.0.0
 */
export const getJSONSchemaAnnotation = getAnnotation<JSONSchemaAnnotation>(
  JSONSchemaAnnotationId
)

/**
 * @category annotations
 * @since 1.0.0
 */
export const getDocumentationAnnotation = getAnnotation<DocumentationAnnotation>(
  DocumentationAnnotationId
)

/**
 * @category annotations
 * @since 1.0.0
 */
export const getConcurrencyAnnotation = getAnnotation<ConcurrencyAnnotation>(
  ConcurrencyAnnotationId
)

/**
 * @category annotations
 * @since 1.0.0
 */
export const getBatchingAnnotation = getAnnotation<BatchingAnnotation>(
  BatchingAnnotationId
)

/** @internal */
export const getSurrogateSchemaAnnotation = getAnnotation<SurrogateAnnotation>(
  SurrogateAnnotationId
)

/**
 * @category model
 * @since 1.0.0
 */
export class Declaration implements Annotated {
  /**
   * @since 1.0.0
   */
  readonly _tag = "Declaration"
  constructor(
    readonly typeParameters: ReadonlyArray<AST>,
    readonly decodeUnknown: (
      ...typeParameters: ReadonlyArray<AST>
    ) => (input: unknown, options: ParseOptions, self: Declaration) => Effect<any, ParseIssue, any>,
    readonly encodeUnknown: (
      ...typeParameters: ReadonlyArray<AST>
    ) => (input: unknown, options: ParseOptions, self: Declaration) => Effect<any, ParseIssue, any>,
    readonly annotations: Annotations = {}
  ) {}
  /**
   * @since 1.0.0
   */
  toString(verbose: boolean = false) {
    return Option.getOrElse(getExpected(this, verbose), () => "<declaration schema>")
  }
}

const createASTGuard = <T extends AST["_tag"]>(tag: T) => (ast: AST): ast is Extract<AST, { _tag: T }> =>
  ast._tag === tag

/**
 * @category guards
 * @since 1.0.0
 */
export const isDeclaration: (ast: AST) => ast is Declaration = createASTGuard("Declaration")

/**
 * @category model
 * @since 1.0.0
 */
export type LiteralValue = string | number | boolean | null | bigint

/**
 * @category model
 * @since 1.0.0
 */
export class Literal implements Annotated {
  /**
   * @since 1.0.0
   */
  readonly _tag = "Literal"
  constructor(readonly literal: LiteralValue, readonly annotations: Annotations = {}) {}
  /**
   * @since 1.0.0
   */
  toString(verbose: boolean = false) {
    return Option.getOrElse(getExpected(this, verbose), () => _util.formatUnknown(this.literal))
  }
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isLiteral: (ast: AST) => ast is Literal = createASTGuard("Literal")

/** @internal */
export const _null = new Literal(null, {
  [IdentifierAnnotationId]: "null"
})

/**
 * @category model
 * @since 1.0.0
 */
export class UniqueSymbol implements Annotated {
  /**
   * @since 1.0.0
   */
  readonly _tag = "UniqueSymbol"
  constructor(readonly symbol: symbol, readonly annotations: Annotations = {}) {}
  /**
   * @since 1.0.0
   */
  toString(verbose: boolean = false) {
    return Option.getOrElse(getExpected(this, verbose), () => _util.formatUnknown(this.symbol))
  }
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isUniqueSymbol: (ast: AST) => ast is UniqueSymbol = createASTGuard("UniqueSymbol")

/**
 * @category model
 * @since 1.0.0
 */
export class UndefinedKeyword implements Annotated {
  /**
   * @since 1.0.0
   */
  readonly _tag = "UndefinedKeyword"
  constructor(readonly annotations: Annotations = {}) {}
  /**
   * @since 1.0.0
   */
  toString(verbose: boolean = false) {
    return formatKeyword(this, verbose)
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const undefinedKeyword: UndefinedKeyword = new UndefinedKeyword({
  [TitleAnnotationId]: "undefined"
})

/**
 * @category guards
 * @since 1.0.0
 */
export const isUndefinedKeyword: (ast: AST) => ast is UndefinedKeyword = createASTGuard("UndefinedKeyword")

/**
 * @category model
 * @since 1.0.0
 */
export class VoidKeyword implements Annotated {
  /**
   * @since 1.0.0
   */
  readonly _tag = "VoidKeyword"
  constructor(readonly annotations: Annotations = {}) {}
  /**
   * @since 1.0.0
   */
  toString(verbose: boolean = false) {
    return formatKeyword(this, verbose)
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const voidKeyword: VoidKeyword = new VoidKeyword({
  [TitleAnnotationId]: "void"
})

/**
 * @category guards
 * @since 1.0.0
 */
export const isVoidKeyword: (ast: AST) => ast is VoidKeyword = createASTGuard("VoidKeyword")

/**
 * @category model
 * @since 1.0.0
 */
export class NeverKeyword implements Annotated {
  /**
   * @since 1.0.0
   */
  readonly _tag = "NeverKeyword"
  constructor(readonly annotations: Annotations = {}) {}
  /**
   * @since 1.0.0
   */
  toString(verbose: boolean = false) {
    return formatKeyword(this, verbose)
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const neverKeyword: NeverKeyword = new NeverKeyword({
  [TitleAnnotationId]: "never"
})

/**
 * @category guards
 * @since 1.0.0
 */
export const isNeverKeyword: (ast: AST) => ast is NeverKeyword = createASTGuard("NeverKeyword")

/**
 * @category model
 * @since 1.0.0
 */
export class UnknownKeyword implements Annotated {
  /**
   * @since 1.0.0
   */
  readonly _tag = "UnknownKeyword"
  constructor(readonly annotations: Annotations = {}) {}
  /**
   * @since 1.0.0
   */
  toString(verbose: boolean = false) {
    return formatKeyword(this, verbose)
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const unknownKeyword: UnknownKeyword = new UnknownKeyword({
  [TitleAnnotationId]: "unknown"
})

/**
 * @category guards
 * @since 1.0.0
 */
export const isUnknownKeyword: (ast: AST) => ast is UnknownKeyword = createASTGuard("UnknownKeyword")

/**
 * @category model
 * @since 1.0.0
 */
export class AnyKeyword implements Annotated {
  /**
   * @since 1.0.0
   */
  readonly _tag = "AnyKeyword"
  constructor(readonly annotations: Annotations = {}) {}
  /**
   * @since 1.0.0
   */
  toString(verbose: boolean = false) {
    return formatKeyword(this, verbose)
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const anyKeyword: AnyKeyword = new AnyKeyword({
  [TitleAnnotationId]: "any"
})

/**
 * @category guards
 * @since 1.0.0
 */
export const isAnyKeyword: (ast: AST) => ast is AnyKeyword = createASTGuard("AnyKeyword")

/**
 * @category model
 * @since 1.0.0
 */
export class StringKeyword implements Annotated {
  /**
   * @since 1.0.0
   */
  readonly _tag = "StringKeyword"
  constructor(readonly annotations: Annotations = {}) {}
  /**
   * @since 1.0.0
   */
  toString(verbose: boolean = false) {
    return formatKeyword(this, verbose)
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const stringKeyword: StringKeyword = new StringKeyword({
  [TitleAnnotationId]: "string",
  [DescriptionAnnotationId]: "a string"
})

/**
 * @category guards
 * @since 1.0.0
 */
export const isStringKeyword: (ast: AST) => ast is StringKeyword = createASTGuard("StringKeyword")

/**
 * @category model
 * @since 1.0.0
 */
export class NumberKeyword implements Annotated {
  /**
   * @since 1.0.0
   */
  readonly _tag = "NumberKeyword"
  constructor(readonly annotations: Annotations = {}) {}
  /**
   * @since 1.0.0
   */
  toString(verbose: boolean = false) {
    return formatKeyword(this, verbose)
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const numberKeyword: NumberKeyword = new NumberKeyword({
  [TitleAnnotationId]: "number",
  [DescriptionAnnotationId]: "a number"
})

/**
 * @category guards
 * @since 1.0.0
 */
export const isNumberKeyword: (ast: AST) => ast is NumberKeyword = createASTGuard("NumberKeyword")

/**
 * @category model
 * @since 1.0.0
 */
export class BooleanKeyword implements Annotated {
  /**
   * @since 1.0.0
   */
  readonly _tag = "BooleanKeyword"
  constructor(readonly annotations: Annotations = {}) {}
  /**
   * @since 1.0.0
   */
  toString(verbose: boolean = false) {
    return formatKeyword(this, verbose)
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const booleanKeyword: BooleanKeyword = new BooleanKeyword({
  [TitleAnnotationId]: "boolean",
  [DescriptionAnnotationId]: "a boolean"
})

/**
 * @category guards
 * @since 1.0.0
 */
export const isBooleanKeyword: (ast: AST) => ast is BooleanKeyword = createASTGuard("BooleanKeyword")

/**
 * @category model
 * @since 1.0.0
 */
export class BigIntKeyword implements Annotated {
  /**
   * @since 1.0.0
   */
  readonly _tag = "BigIntKeyword"
  constructor(readonly annotations: Annotations = {}) {}
  /**
   * @since 1.0.0
   */
  toString(verbose: boolean = false) {
    return formatKeyword(this, verbose)
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const bigIntKeyword: BigIntKeyword = new BigIntKeyword({
  [TitleAnnotationId]: "bigint",
  [DescriptionAnnotationId]: "a bigint"
})

/**
 * @category guards
 * @since 1.0.0
 */
export const isBigIntKeyword: (ast: AST) => ast is BigIntKeyword = createASTGuard("BigIntKeyword")

/**
 * @category model
 * @since 1.0.0
 */
export class SymbolKeyword implements Annotated {
  /**
   * @since 1.0.0
   */
  readonly _tag = "SymbolKeyword"
  constructor(readonly annotations: Annotations = {}) {}
  /**
   * @since 1.0.0
   */
  toString(verbose: boolean = false) {
    return formatKeyword(this, verbose)
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const symbolKeyword: SymbolKeyword = new SymbolKeyword({
  [TitleAnnotationId]: "symbol",
  [DescriptionAnnotationId]: "a symbol"
})

/**
 * @category guards
 * @since 1.0.0
 */
export const isSymbolKeyword: (ast: AST) => ast is SymbolKeyword = createASTGuard("SymbolKeyword")

/**
 * @category model
 * @since 1.0.0
 */
export class ObjectKeyword implements Annotated {
  /**
   * @since 1.0.0
   */
  readonly _tag = "ObjectKeyword"
  constructor(readonly annotations: Annotations = {}) {}
  /**
   * @since 1.0.0
   */
  toString(verbose: boolean = false) {
    return formatKeyword(this, verbose)
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const objectKeyword: ObjectKeyword = new ObjectKeyword({
  [IdentifierAnnotationId]: "object",
  [TitleAnnotationId]: "object",
  [DescriptionAnnotationId]: "an object in the TypeScript meaning, i.e. the `object` type"
})

/**
 * @category guards
 * @since 1.0.0
 */
export const isObjectKeyword: (ast: AST) => ast is ObjectKeyword = createASTGuard("ObjectKeyword")

/**
 * @category model
 * @since 1.0.0
 */
export class Enums implements Annotated {
  /**
   * @since 1.0.0
   */
  readonly _tag = "Enums"
  constructor(
    readonly enums: ReadonlyArray<readonly [string, string | number]>,
    readonly annotations: Annotations = {}
  ) {}
  /**
   * @since 1.0.0
   */
  toString(verbose: boolean = false) {
    return Option.getOrElse(
      getExpected(this, verbose),
      () => `<enum ${this.enums.length} value(s): ${this.enums.map((_, value) => JSON.stringify(value)).join(" | ")}>`
    )
  }
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isEnums: (ast: AST) => ast is Enums = createASTGuard("Enums")

/**
 * @category model
 * @since 1.0.0
 */
export class TemplateLiteralSpan {
  constructor(readonly type: StringKeyword | NumberKeyword, readonly literal: string) {}
  /**
   * @since 1.0.0
   */
  toString() {
    switch (this.type._tag) {
      case "StringKeyword":
        return "${string}"
      case "NumberKeyword":
        return "${number}"
    }
  }
}

/**
 * @category model
 * @since 1.0.0
 */
export class TemplateLiteral implements Annotated {
  static make = (
    head: string,
    spans: ReadonlyArray<TemplateLiteralSpan>,
    annotations: Annotations = {}
  ): TemplateLiteral | Literal =>
    ReadonlyArray.isNonEmptyReadonlyArray(spans) ?
      new TemplateLiteral(head, spans, annotations) :
      new Literal(head)

  /**
   * @since 1.0.0
   */
  readonly _tag = "TemplateLiteral"
  private constructor(
    readonly head: string,
    readonly spans: ReadonlyArray.NonEmptyReadonlyArray<TemplateLiteralSpan>,
    readonly annotations: Annotations = {}
  ) {}
  /**
   * @since 1.0.0
   */
  toString(verbose: boolean = false) {
    return Option.getOrElse(getExpected(this, verbose), () => formatTemplateLiteral(this))
  }
}

const formatTemplateLiteral = (ast: TemplateLiteral): string =>
  "`" + ast.head + ast.spans.map((span) => String(span) + span.literal).join("") +
  "`"

/**
 * @category guards
 * @since 1.0.0
 */
export const isTemplateLiteral: (ast: AST) => ast is TemplateLiteral = createASTGuard("TemplateLiteral")

/**
 * @category model
 * @since 1.0.0
 */
export class Element {
  constructor(readonly type: AST, readonly isOptional: boolean) {}
}

/**
 * @category model
 * @since 1.0.0
 */
export class Tuple implements Annotated {
  /**
   * @since 1.0.0
   */
  readonly _tag = "Tuple"
  constructor(
    readonly elements: ReadonlyArray<Element>,
    readonly rest: Option.Option<ReadonlyArray.NonEmptyReadonlyArray<AST>>,
    readonly isReadonly: boolean,
    readonly annotations: Annotations = {}
  ) {}
  /**
   * @since 1.0.0
   */
  toString(verbose: boolean = false) {
    return Option.getOrElse(getExpected(this, verbose), () => formatTuple(this))
  }
}

const formatTuple = (ast: Tuple): string => {
  const formattedElements = ast.elements.map((element) => String(element.type) + (element.isOptional ? "?" : ""))
    .join(", ")
  return Option.match(ast.rest, {
    onNone: () => `readonly [${formattedElements}]`,
    onSome: ([head, ...tail]) => {
      const formattedHead = String(head)
      const wrappedHead = formattedHead.includes(" | ") ? `(${formattedHead})` : formattedHead

      if (tail.length > 0) {
        const formattedTail = tail.map((ast) => String(ast)).join(", ")
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

/**
 * @category guards
 * @since 1.0.0
 */
export const isTuple: (ast: AST) => ast is Tuple = createASTGuard("Tuple")

/**
 * @category model
 * @since 1.0.0
 */
export class PropertySignature implements Annotated {
  constructor(
    readonly name: PropertyKey,
    readonly type: AST,
    readonly isOptional: boolean,
    readonly isReadonly: boolean,
    readonly annotations: Annotations = {}
  ) {}
}

/**
 * @since 1.0.0
 */
export type Parameter = StringKeyword | SymbolKeyword | TemplateLiteral | Refinement<Parameter>

/**
 * @since 1.0.0
 */
export const isParameter = (ast: AST): ast is Parameter => {
  switch (ast._tag) {
    case "StringKeyword":
    case "SymbolKeyword":
    case "TemplateLiteral":
      return true
    case "Refinement":
      return isParameter(ast.from)
  }
  return false
}

/**
 * @category model
 * @since 1.0.0
 */
export class IndexSignature {
  static make = (
    parameter: AST,
    type: AST,
    isReadonly: boolean
  ): IndexSignature => {
    if (isParameter(parameter)) {
      return new IndexSignature(parameter, type, isReadonly)
    }
    throw new Error(
      "An index signature parameter type must be 'string', 'symbol', a template literal type or a refinement of the previous types"
    )
  }
  private constructor(
    readonly parameter: Parameter,
    readonly type: AST,
    readonly isReadonly: boolean
  ) {}
}

/** @internal */
export const getDuplicatePropertySignatureErrorMessage = (name: PropertyKey): string =>
  `Duplicate property signature ${String(name)}`

/**
 * @category model
 * @since 1.0.0
 */
export class TypeLiteral implements Annotated {
  static make = (
    propertySignatures: ReadonlyArray<PropertySignature>,
    indexSignatures: ReadonlyArray<IndexSignature>,
    annotations: Annotations = {}
  ): TypeLiteral => {
    // check for duplicate property signatures
    const keys: Record<PropertyKey, null> = {}
    for (let i = 0; i < propertySignatures.length; i++) {
      const name = propertySignatures[i].name
      if (Object.prototype.hasOwnProperty.call(keys, name)) {
        throw new Error(getDuplicatePropertySignatureErrorMessage(name))
      }
      keys[name] = null
    }
    // check for duplicate index signatures
    const parameters = {
      string: false,
      symbol: false
    }
    for (let i = 0; i < indexSignatures.length; i++) {
      const parameter = getParameterBase(indexSignatures[i].parameter)
      if (isStringKeyword(parameter)) {
        if (parameters.string) {
          throw new Error("Duplicate index signature for type `string`")
        }
        parameters.string = true
      } else if (isSymbolKeyword(parameter)) {
        if (parameters.symbol) {
          throw new Error("Duplicate index signature for type `symbol`")
        }
        parameters.symbol = true
      }
    }
    return new TypeLiteral(
      sortPropertySignatures(propertySignatures),
      sortIndexSignatures(indexSignatures),
      annotations
    )
  }
  /**
   * @since 1.0.0
   */
  readonly _tag = "TypeLiteral"
  private constructor(
    readonly propertySignatures: ReadonlyArray<PropertySignature>,
    readonly indexSignatures: ReadonlyArray<IndexSignature>,
    readonly annotations: Annotations = {}
  ) {}
  /**
   * @since 1.0.0
   */
  toString(verbose: boolean = false) {
    return Option.getOrElse(getExpected(this, verbose), () => formatTypeLiteral(this))
  }
}

const formatTypeLiteral = (ast: TypeLiteral): string => {
  const formattedPropertySignatures = ast.propertySignatures.map((ps) =>
    String(ps.name) + (ps.isOptional ? "?" : "") + ": " + ps.type
  ).join("; ")
  if (ast.indexSignatures.length > 0) {
    const formattedIndexSignatures = ast.indexSignatures.map((is) =>
      `[x: ${getParameterBase(is.parameter)}]: ${is.type}`
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

/**
 * @category guards
 * @since 1.0.0
 */
export const isTypeLiteral: (ast: AST) => ast is TypeLiteral = createASTGuard("TypeLiteral")

/**
 * @since 1.0.0
 */
export type Members<A> = readonly [A, A, ...Array<A>]

/**
 * @category model
 * @since 1.0.0
 */
export class Union implements Annotated {
  static make = (
    candidates: ReadonlyArray<AST>,
    annotations: Annotations = {}
  ): AST => {
    const types = unify(candidates)
    if (isMembers(types)) {
      return new Union(sortUnionMembers(types), annotations)
    }
    if (ReadonlyArray.isNonEmptyReadonlyArray(types)) {
      return types[0]
    }
    return neverKeyword
  }
  /**
   * @since 1.0.0
   */
  readonly _tag = "Union"
  private constructor(readonly types: Members<AST>, readonly annotations: Annotations = {}) {}
  /**
   * @since 1.0.0
   */
  toString(verbose: boolean = false) {
    return Option.getOrElse(
      getExpected(this, verbose),
      () => this.types.map((member) => String(member)).join(" | ")
    )
  }
}

/** @internal */
export const mapMembers = <A, B>(members: Members<A>, f: (a: A) => B): Members<B> => members.map(f) as any

/** @internal */
export const isMembers = <A>(as: ReadonlyArray<A>): as is readonly [A, A, ...Array<A>] => as.length > 1

/**
 * @category guards
 * @since 1.0.0
 */
export const isUnion: (ast: AST) => ast is Union = createASTGuard("Union")

/**
 * @category model
 * @since 1.0.0
 */
export class Suspend implements Annotated {
  /**
   * @since 1.0.0
   */
  readonly _tag = "Suspend"
  constructor(readonly f: () => AST, readonly annotations: Annotations = {}) {
    this.f = _util.memoizeThunk(f)
  }
  /**
   * @since 1.0.0
   */
  toString(verbose: boolean = false) {
    return getExpected(this, verbose).pipe(
      Option.orElse(() =>
        Option.flatMap(
          Option.liftThrowable(this.f)(),
          (ast) => getExpected(ast, verbose)
        )
      ),
      Option.getOrElse(() => "<suspended schema>")
    )
  }
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isSuspend: (ast: AST) => ast is Suspend = createASTGuard("Suspend")

/**
 * @category model
 * @since 1.0.0
 */
export class Refinement<From extends AST = AST> implements Annotated {
  /**
   * @since 1.0.0
   */
  readonly _tag = "Refinement"
  constructor(
    readonly from: From,
    readonly filter: (
      input: any,
      options: ParseOptions,
      self: Refinement
    ) => Option.Option<ParseIssue>,
    readonly annotations: Annotations = {}
  ) {}
  /**
   * @since 1.0.0
   */
  toString(verbose: boolean = false) {
    return Option.getOrElse(getExpected(this, verbose), () => "<refinement schema>")
  }
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isRefinement: (ast: AST) => ast is Refinement<AST> = createASTGuard("Refinement")

/**
 * @category model
 * @since 1.0.0
 */
export interface ParseOptions {
  /** default "first" */
  readonly errors?: "first" | "all" | undefined
  /** default "ignore" */
  readonly onExcessProperty?: "ignore" | "error" | "preserve" | undefined
}

/**
 * @since 1.0.0
 */
export const defaultParseOption: ParseOptions = {}

/**
 * @category model
 * @since 1.0.0
 */
export class Transform implements Annotated {
  /**
   * @since 1.0.0
   */
  readonly _tag = "Transform"
  constructor(
    readonly from: AST,
    readonly to: AST,
    readonly transformation: Transformation,
    readonly annotations: Annotations = {}
  ) {}
  /**
   * @since 1.0.0
   */
  toString(verbose: boolean = false) {
    return Option.getOrElse(
      getExpected(this, verbose),
      () => `(${String(this.from)} <-> ${String(this.to)})`
    )
  }
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isTransform: (ast: AST) => ast is Transform = createASTGuard("Transform")

/**
 * @category model
 * @since 1.0.0
 */
export type Transformation =
  | FinalTransformation
  | ComposeTransformation
  | TypeLiteralTransformation

/**
 * @category model
 * @since 1.0.0
 */
export class FinalTransformation {
  /**
   * @since 1.0.0
   */
  readonly _tag = "FinalTransformation"
  constructor(
    readonly decode: (input: any, options: ParseOptions, self: Transform) => Effect<any, ParseIssue, any>,
    readonly encode: (input: any, options: ParseOptions, self: Transform) => Effect<any, ParseIssue, any>
  ) {}
}

const createTransformationGuard =
  <T extends Transformation["_tag"]>(tag: T) => (ast: Transformation): ast is Extract<Transformation, { _tag: T }> =>
    ast._tag === tag

/**
 * @category guards
 * @since 1.0.0
 */
export const isFinalTransformation: (ast: Transformation) => ast is FinalTransformation = createTransformationGuard(
  "FinalTransformation"
)

/**
 * @category model
 * @since 1.0.0
 */
export class ComposeTransformation {
  /**
   * @since 1.0.0
   */
  readonly _tag = "ComposeTransformation"
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const composeTransformation: ComposeTransformation = new ComposeTransformation()

/**
 * @category guards
 * @since 1.0.0
 */
export const isComposeTransformation: (ast: Transformation) => ast is ComposeTransformation = createTransformationGuard(
  "ComposeTransformation"
)

/**
 * Represents a `PropertySignature -> PropertySignature` transformation
 *
 * The semantic of `decode` is:
 * - `none()` represents the absence of the key/value pair
 * - `some(value)` represents the presence of the key/value pair
 *
 * The semantic of `encode` is:
 * - `none()` you don't want to output the key/value pair
 * - `some(value)` you want to output the key/value pair
 *
 * @category model
 * @since 1.0.0
 */
export class PropertySignatureTransformation {
  constructor(
    readonly from: PropertyKey,
    readonly to: PropertyKey,
    readonly decode: (o: Option.Option<any>) => Option.Option<any>,
    readonly encode: (o: Option.Option<any>) => Option.Option<any>
  ) {}
}

/**
 * @category model
 * @since 1.0.0
 */
export class TypeLiteralTransformation {
  static make = (
    propertySignatureTransformations: TypeLiteralTransformation["propertySignatureTransformations"]
  ): TypeLiteralTransformation => {
    // check for duplicate property signature transformations
    const keys: Record<PropertyKey, true> = {}
    for (const pst of propertySignatureTransformations) {
      const key = pst.from
      if (keys[key]) {
        throw new Error(`Duplicate property signature transformation ${String(key)}`)
      }
      keys[key] = true
    }

    return new TypeLiteralTransformation(propertySignatureTransformations)
  }
  /**
   * @since 1.0.0
   */
  readonly _tag = "TypeLiteralTransformation"
  private constructor(
    readonly propertySignatureTransformations: ReadonlyArray<
      PropertySignatureTransformation
    >
  ) {}
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isTypeLiteralTransformation: (ast: Transformation) => ast is TypeLiteralTransformation =
  createTransformationGuard("TypeLiteralTransformation")

// -------------------------------------------------------------------------------------
// API
// -------------------------------------------------------------------------------------

/**
 * Adds a group of annotations, potentially overwriting existing annotations.
 *
 * @since 1.0.0
 */
export const annotations = (ast: AST, annotations: Annotations): AST => {
  const d = Object.getOwnPropertyDescriptors(ast)
  d.annotations.value = { ...ast.annotations, ...annotations }
  return Object.create(Object.getPrototypeOf(ast), d)
}

/**
 * Adds a rest element to the end of a tuple, or throws an exception if the rest element is already present.
 *
 * @since 1.0.0
 */
export const appendRestElement = (
  ast: Tuple,
  restElement: AST
): Tuple => {
  if (Option.isSome(ast.rest)) {
    // example: `type A = [...string[], ...number[]]` is illegal
    throw new Error("A rest element cannot follow another rest element. ts(1265)")
  }
  return new Tuple(ast.elements, Option.some([restElement]), ast.isReadonly)
}

/**
 * Appends an element to a tuple or throws an exception in the following cases:
 * - A required element cannot follow an optional element. ts(1257)
 * - An optional element cannot follow a rest element. ts(1266)
 *
 * @since 1.0.0
 */
export const appendElement = (
  ast: Tuple,
  newElement: Element
): Tuple => {
  if (ast.elements.some((e) => e.isOptional) && !newElement.isOptional) {
    throw new Error("A required element cannot follow an optional element. ts(1257)")
  }
  return pipe(
    ast.rest,
    Option.match({
      onNone: () => new Tuple([...ast.elements, newElement], Option.none(), ast.isReadonly),
      onSome: (rest) => {
        if (newElement.isOptional) {
          throw new Error("An optional element cannot follow a rest element. ts(1266)")
        }
        return new Tuple(ast.elements, Option.some([...rest, newElement.type]), ast.isReadonly)
      }
    })
  )
}

/**
 * Equivalent at runtime to the TypeScript type-level `keyof` operator.
 *
 * @since 1.0.0
 */
export const keyof = (ast: AST): AST => Union.make(_keyof(ast))

/** @internal */
export const getTemplateLiteralRegex = (ast: TemplateLiteral): RegExp => {
  let pattern = `^${ast.head}`
  for (const span of ast.spans) {
    if (isStringKeyword(span.type)) {
      pattern += ".*"
    } else if (isNumberKeyword(span.type)) {
      pattern += "[+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?"
    }
    pattern += span.literal
  }
  pattern += "$"
  return new RegExp(pattern)
}

/**
 * @since 1.0.0
 */
export const getPropertySignatures = (ast: AST): Array<PropertySignature> => {
  switch (ast._tag) {
    case "Declaration": {
      const annotation = getSurrogateSchemaAnnotation(ast)
      if (Option.isSome(annotation)) {
        return getPropertySignatures(annotation.value)
      }
      break
    }
    case "TypeLiteral":
      return ast.propertySignatures.slice()
    case "Suspend":
      return getPropertySignatures(ast.f())
  }
  return getPropertyKeys(ast).map((name) => getPropertyKeyIndexedAccess(ast, name))
}

/** @internal */
export const getNumberIndexedAccess = (ast: AST): AST => {
  switch (ast._tag) {
    case "Tuple": {
      let hasOptional = false
      const out: Array<AST> = []
      for (const e of ast.elements) {
        if (e.isOptional) {
          hasOptional = true
        }
        out.push(e.type)
      }
      if (hasOptional) {
        out.push(undefinedKeyword)
      }
      if (Option.isSome(ast.rest)) {
        for (const e of ast.rest.value) {
          out.push(e)
        }
      }
      return Union.make(out)
    }
    case "Refinement":
      return getNumberIndexedAccess(ast.from)
    case "Union":
      return Union.make(ast.types.map(getNumberIndexedAccess))
    case "Suspend":
      return getNumberIndexedAccess(ast.f())
  }
  throw new Error(`getNumberIndexedAccess: unsupported schema (${ast})`)
}

/** @internal */
export const getPropertyKeyIndexedAccess = (ast: AST, name: PropertyKey): PropertySignature => {
  switch (ast._tag) {
    case "Declaration": {
      const annotation = getSurrogateSchemaAnnotation(ast)
      if (Option.isSome(annotation)) {
        return getPropertyKeyIndexedAccess(annotation.value, name)
      }
      break
    }
    case "TypeLiteral": {
      const ops = ReadonlyArray.findFirst(ast.propertySignatures, (ps) => ps.name === name)
      if (Option.isSome(ops)) {
        return ops.value
      } else {
        if (Predicate.isString(name)) {
          for (const is of ast.indexSignatures) {
            const parameterBase = getParameterBase(is.parameter)
            switch (parameterBase._tag) {
              case "TemplateLiteral": {
                const regex = getTemplateLiteralRegex(parameterBase)
                if (regex.test(name)) {
                  return new PropertySignature(name, is.type, false, false)
                }
                break
              }
              case "StringKeyword":
                return new PropertySignature(name, is.type, false, false)
            }
          }
        } else if (Predicate.isSymbol(name)) {
          for (const is of ast.indexSignatures) {
            const parameterBase = getParameterBase(is.parameter)
            if (isSymbolKeyword(parameterBase)) {
              return new PropertySignature(name, is.type, false, false)
            }
          }
        }
      }
      break
    }
    case "Union":
      return new PropertySignature(
        name,
        Union.make(ast.types.map((ast) => getPropertyKeyIndexedAccess(ast, name).type)),
        false,
        true
      )
    case "Suspend":
      return getPropertyKeyIndexedAccess(ast.f(), name)
  }
  return new PropertySignature(name, neverKeyword, false, true)
}

const getPropertyKeys = (ast: AST): Array<PropertyKey> => {
  switch (ast._tag) {
    case "Declaration": {
      const annotation = getSurrogateSchemaAnnotation(ast)
      if (Option.isSome(annotation)) {
        return getPropertyKeys(annotation.value)
      }
      break
    }
    case "TypeLiteral":
      return ast.propertySignatures.map((ps) => ps.name)
    case "Suspend":
      return getPropertyKeys(ast.f())
    case "Union":
      return ast.types.slice(1).reduce(
        (out: Array<PropertyKey>, ast) => ReadonlyArray.intersection(out, getPropertyKeys(ast)),
        getPropertyKeys(ast.types[0])
      )
  }
  return []
}

/**
 * Create a record with the specified key type and value type.
 *
 * @since 1.0.0
 */
export const createRecord = (key: AST, value: AST, isReadonly: boolean): TypeLiteral => {
  const propertySignatures: Array<PropertySignature> = []
  const indexSignatures: Array<IndexSignature> = []
  const go = (key: AST): void => {
    switch (key._tag) {
      case "NeverKeyword":
        break
      case "StringKeyword":
      case "SymbolKeyword":
      case "TemplateLiteral":
      case "Refinement":
        indexSignatures.push(IndexSignature.make(key, value, isReadonly))
        break
      case "Literal":
        if (Predicate.isString(key.literal) || Predicate.isNumber(key.literal)) {
          propertySignatures.push(new PropertySignature(key.literal, value, false, isReadonly))
        } else {
          throw new Error(`createRecord: unsupported literal (${_util.formatUnknown(key.literal)})`)
        }
        break
      case "UniqueSymbol":
        propertySignatures.push(new PropertySignature(key.symbol, value, false, isReadonly))
        break
      case "Union":
        key.types.forEach(go)
        break
      default:
        throw new Error(`createRecord: unsupported key schema (${key})`)
    }
  }
  go(key)
  return TypeLiteral.make(propertySignatures, indexSignatures)
}

/**
 * Equivalent at runtime to the built-in TypeScript utility type `Pick`.
 *
 * @since 1.0.0
 */
export const pick = (ast: AST, keys: ReadonlyArray<PropertyKey>): TypeLiteral =>
  TypeLiteral.make(keys.map((key) => getPropertyKeyIndexedAccess(ast, key)), [])

/**
 * Equivalent at runtime to the built-in TypeScript utility type `Omit`.
 *
 * @since 1.0.0
 */
export const omit = (ast: AST, keys: ReadonlyArray<PropertyKey>): TypeLiteral =>
  pick(ast, getPropertyKeys(ast).filter((name) => !keys.includes(name)))

/** @internal */
export const orUndefined = (ast: AST): AST => Union.make([ast, undefinedKeyword])

/**
 * Equivalent at runtime to the built-in TypeScript utility type `Partial`.
 *
 * @since 1.0.0
 */
export const partial = (ast: AST, options?: { readonly exact: true }): AST => {
  const exact = options?.exact === true
  switch (ast._tag) {
    case "Tuple":
      return new Tuple(
        ast.elements.map((e) => new Element(exact ? e.type : orUndefined(e.type), true)),
        pipe(
          ast.rest,
          Option.map((rest) => [Union.make([...rest, undefinedKeyword])])
        ),
        ast.isReadonly
      )
    case "TypeLiteral":
      return TypeLiteral.make(
        ast.propertySignatures.map((ps) =>
          new PropertySignature(ps.name, exact ? ps.type : orUndefined(ps.type), true, ps.isReadonly, ps.annotations)
        ),
        ast.indexSignatures.map((is) => IndexSignature.make(is.parameter, orUndefined(is.type), is.isReadonly))
      )
    case "Union":
      return Union.make(ast.types.map((member) => partial(member, options)))
    case "Suspend":
      return new Suspend(() => partial(ast.f(), options))
    case "Declaration":
      throw new Error("`partial` cannot handle declarations")
    case "Refinement":
      throw new Error("`partial` cannot handle refinements")
    case "Transform":
      throw new Error("`partial` cannot handle transformations")
  }
  return ast
}

/**
 * Equivalent at runtime to the built-in TypeScript utility type `Required`.
 *
 * @since 1.0.0
 */
export const required = (ast: AST): AST => {
  switch (ast._tag) {
    case "Tuple":
      return new Tuple(
        ast.elements.map((e) => new Element(e.type, false)),
        pipe(
          ast.rest,
          Option.map((rest) => {
            const u = Union.make([...rest])
            return ReadonlyArray.map(rest, () => u)
          })
        ),
        ast.isReadonly
      )
    case "TypeLiteral":
      return TypeLiteral.make(
        ast.propertySignatures.map((f) => new PropertySignature(f.name, f.type, false, f.isReadonly, f.annotations)),
        ast.indexSignatures
      )
    case "Union":
      return Union.make(ast.types.map((member) => required(member)))
    case "Suspend":
      return new Suspend(() => required(ast.f()))
    case "Declaration":
      throw new Error("`required` cannot handle declarations")
    case "Refinement":
      throw new Error("`required` cannot handle refinements")
    case "Transform":
      throw new Error("`required` cannot handle transformations")
  }
  return ast
}

/**
 * Creates a new AST with shallow mutability applied to its properties.
 *
 * @param ast - The original AST to make properties mutable (shallowly).
 *
 * @since 1.0.0
 */
export const mutable = (ast: AST): AST => {
  switch (ast._tag) {
    case "Tuple":
      return new Tuple(ast.elements, ast.rest, false, ast.annotations)
    case "TypeLiteral":
      return TypeLiteral.make(
        ast.propertySignatures.map((ps) =>
          new PropertySignature(ps.name, ps.type, ps.isOptional, false, ps.annotations)
        ),
        ast.indexSignatures.map((is) => IndexSignature.make(is.parameter, is.type, false)),
        ast.annotations
      )
    case "Union":
      return Union.make(ast.types.map(mutable), ast.annotations)
    case "Suspend":
      return new Suspend(() => mutable(ast.f()), ast.annotations)
    case "Refinement":
      return new Refinement(mutable(ast.from), ast.filter, ast.annotations)
    case "Transform":
      return new Transform(
        mutable(ast.from),
        mutable(ast.to),
        ast.transformation,
        ast.annotations
      )
  }
  return ast
}

// -------------------------------------------------------------------------------------
// compiler harness
// -------------------------------------------------------------------------------------

/**
 * @since 1.0.0
 */
export type Compiler<A> = (ast: AST) => A

/**
 * @since 1.0.0
 */
export type Match<A> = {
  [K in AST["_tag"]]: (ast: Extract<AST, { _tag: K }>, compile: Compiler<A>) => A
}

/**
 * @since 1.0.0
 */
export const getCompiler = <A>(match: Match<A>): Compiler<A> => {
  const compile = (ast: AST): A => match[ast._tag](ast as any, compile)
  return compile
}

/** @internal */
export const getToPropertySignatures = (ps: ReadonlyArray<PropertySignature>): Array<PropertySignature> =>
  ps.map((p) => new PropertySignature(p.name, to(p.type), p.isOptional, p.isReadonly, p.annotations))

/** @internal */
export const getToIndexSignatures = (ps: ReadonlyArray<IndexSignature>): Array<IndexSignature> =>
  ps.map((is) => IndexSignature.make(is.parameter, to(is.type), is.isReadonly))

/**
 * @since 1.0.0
 */
export const to = (ast: AST): AST => {
  switch (ast._tag) {
    case "Declaration":
      return new Declaration(
        ast.typeParameters.map(to),
        ast.decodeUnknown,
        ast.encodeUnknown,
        ast.annotations
      )
    case "Tuple":
      return new Tuple(
        ast.elements.map((e) => new Element(to(e.type), e.isOptional)),
        Option.map(ast.rest, ReadonlyArray.map(to)),
        ast.isReadonly,
        ast.annotations
      )
    case "TypeLiteral":
      return TypeLiteral.make(
        getToPropertySignatures(ast.propertySignatures),
        getToIndexSignatures(ast.indexSignatures),
        ast.annotations
      )
    case "Union":
      return Union.make(ast.types.map(to), ast.annotations)
    case "Suspend":
      return new Suspend(() => to(ast.f()), ast.annotations)
    case "Refinement":
      return new Refinement(to(ast.from), ast.filter, ast.annotations)
    case "Transform":
      return to(ast.to)
  }
  return ast
}

const preserveIdentifierAnnotation = (annotated: Annotated): Annotations | undefined => {
  return Option.match(getIdentifierAnnotation(annotated), {
    onNone: () => undefined,
    onSome: (identifier) => ({ [IdentifierAnnotationId]: identifier })
  })
}

/**
 * @since 1.0.0
 */
export const from = (ast: AST): AST => {
  switch (ast._tag) {
    case "Declaration":
      return new Declaration(
        ast.typeParameters.map(from),
        ast.decodeUnknown,
        ast.encodeUnknown,
        ast.annotations
      )
    case "Tuple":
      return new Tuple(
        ast.elements.map((e) => new Element(from(e.type), e.isOptional)),
        Option.map(ast.rest, ReadonlyArray.map(from)),
        ast.isReadonly,
        preserveIdentifierAnnotation(ast)
      )
    case "TypeLiteral":
      return TypeLiteral.make(
        ast.propertySignatures.map((p) => new PropertySignature(p.name, from(p.type), p.isOptional, p.isReadonly)),
        ast.indexSignatures.map((is) => IndexSignature.make(is.parameter, from(is.type), is.isReadonly)),
        preserveIdentifierAnnotation(ast)
      )
    case "Union":
      return Union.make(ast.types.map(from), preserveIdentifierAnnotation(ast))
    case "Suspend":
      return new Suspend(() => from(ast.f()), preserveIdentifierAnnotation(ast))
    case "Refinement":
    case "Transform":
      return from(ast.from)
  }
  return ast
}

const toStringMemoSet = globalValue(
  Symbol.for("@effect/schema/AST/toStringMemoSet"),
  () => new WeakSet<AST>()
)

const containerASTTags = {
  Declaration: true,
  Refinement: true,
  Tuple: true,
  TypeLiteral: true,
  Union: true,
  Suspend: true,
  Transform: true
}

const isContainerAST = (ast: object): ast is
  | Declaration
  | Refinement
  | Tuple
  | TypeLiteral
  | Union
  | Suspend
  | Transform => "_tag" in ast && Predicate.isString(ast["_tag"]) && ast["_tag"] in containerASTTags

/** @internal */
export const toString = (ast: AST): string =>
  JSON.stringify(ast, (key, value) => {
    if (Predicate.isSymbol(value)) {
      return String(value)
    }
    if (typeof value === "object" && value !== null) {
      if (isContainerAST(value)) {
        if (toStringMemoSet.has(value)) {
          return "<suspended schema>"
        }
        toStringMemoSet.add(value)
        if (isSuspend(value)) {
          const out = value.f()
          if (toStringMemoSet.has(out)) {
            return "<suspended schema>"
          }
          toStringMemoSet.add(out)
          return out
        }
      } else if (key === "annotations") {
        const out: Record<string, unknown> = {}
        for (const k of _util.ownKeys(value)) {
          out[String(k)] = value[k]
        }
        return out
      }
    }
    return value
  }, 2)

/**
 * @since 1.0.0
 */
export const hash = (ast: AST): number => Hash.string(toString(ast))

/** @internal */
export const getCardinality = (ast: AST): number => {
  switch (ast._tag) {
    case "NeverKeyword":
      return 0
    case "Literal":
    case "UndefinedKeyword":
    case "VoidKeyword":
    case "UniqueSymbol":
      return 1
    case "BooleanKeyword":
      return 2
    case "StringKeyword":
    case "NumberKeyword":
    case "BigIntKeyword":
    case "SymbolKeyword":
      return 3
    case "ObjectKeyword":
      return 5
    case "UnknownKeyword":
    case "AnyKeyword":
      return 6
    default:
      return 4
  }
}

const sortPropertySignatures = ReadonlyArray.sort(
  pipe(Number.Order, Order.mapInput((ps: PropertySignature) => getCardinality(ps.type)))
)

const sortIndexSignatures = ReadonlyArray.sort(
  pipe(
    Number.Order,
    Order.mapInput((is: IndexSignature) => {
      switch (getParameterBase(is.parameter)._tag) {
        case "StringKeyword":
          return 2
        case "SymbolKeyword":
          return 3
        case "TemplateLiteral":
          return 1
      }
    })
  )
)

type Weight = readonly [number, number, number]

const WeightOrder: Order.Order<Weight> = Order.tuple<
  readonly [Order.Order<number>, Order.Order<number>, Order.Order<number>]
>(Number.Order, Number.Order, Number.Order)

const maxWeight = Order.max<Weight>(WeightOrder)

const emptyWeight: Weight = [0, 0, 0]

const maxWeightAll = (weights: ReadonlyArray<Weight>): Weight => weights.reduce(maxWeight, emptyWeight)

/** @internal */
export const getWeight = (ast: AST): Weight => {
  switch (ast._tag) {
    case "Tuple": {
      const y = ast.elements.length
      const z = Option.isSome(ast.rest) ? ast.rest.value.length : 0
      return [2, y, z]
    }
    case "TypeLiteral": {
      const y = ast.propertySignatures.length
      const z = ast.indexSignatures.length
      return y + z === 0 ?
        [-4, 0, 0] :
        [4, y, z]
    }
    case "Declaration": {
      const annotation = getSurrogateSchemaAnnotation(ast)
      if (Option.isSome(annotation)) {
        const [_, y, z] = getWeight(annotation.value)
        return [6, y, z]
      }
      return [6, 0, 0]
    }
    case "Suspend":
      return [8, 0, 0]
    case "Union":
      return maxWeightAll(ast.types.map(getWeight))
    case "Refinement": {
      const [x, y, z] = getWeight(ast.from)
      return [x + 1, y, z]
    }
    case "Transform":
      return getWeight(ast.from)
    case "ObjectKeyword":
      return [-2, 0, 0]
    case "UnknownKeyword":
    case "AnyKeyword":
      return [-4, 0, 0]
    default:
      return emptyWeight
  }
}

const sortUnionMembers: (self: Members<AST>) => Members<AST> = ReadonlyArray.sort(
  Order.reverse(Order.mapInput(WeightOrder, getWeight))
) as any

const unify = (candidates: ReadonlyArray<AST>): Array<AST> => {
  let out = pipe(
    candidates,
    ReadonlyArray.flatMap((ast: AST): ReadonlyArray<AST> => {
      switch (ast._tag) {
        case "NeverKeyword":
          return []
        case "Union":
          return ast.types
        default:
          return [ast]
      }
    })
  )
  if (out.some(isAnyKeyword)) {
    return [anyKeyword]
  }
  if (out.some(isUnknownKeyword)) {
    return [unknownKeyword]
  }
  let i: number
  if ((i = out.findIndex(isStringKeyword)) !== -1) {
    out = out.filter((m, j) => j === i || (!isStringKeyword(m) && !(isLiteral(m) && typeof m.literal === "string")))
  }
  if ((i = out.findIndex(isNumberKeyword)) !== -1) {
    out = out.filter((m, j) => j === i || (!isNumberKeyword(m) && !(isLiteral(m) && typeof m.literal === "number")))
  }
  if ((i = out.findIndex(isBooleanKeyword)) !== -1) {
    out = out.filter((m, j) => j === i || (!isBooleanKeyword(m) && !(isLiteral(m) && typeof m.literal === "boolean")))
  }
  if ((i = out.findIndex(isBigIntKeyword)) !== -1) {
    out = out.filter((m, j) => j === i || (!isBigIntKeyword(m) && !(isLiteral(m) && typeof m.literal === "bigint")))
  }
  if ((i = out.findIndex(isSymbolKeyword)) !== -1) {
    out = out.filter((m, j) => j === i || (!isSymbolKeyword(m) && !isUniqueSymbol(m)))
  }
  return out
}

/** @internal */
export const getParameterBase = (
  ast: Parameter
): StringKeyword | SymbolKeyword | TemplateLiteral => {
  switch (ast._tag) {
    case "StringKeyword":
    case "SymbolKeyword":
    case "TemplateLiteral":
      return ast
    case "Refinement":
      return getParameterBase(ast.from)
  }
}

const equalsTemplateLiteralSpan = ReadonlyArray.getEquivalence<TemplateLiteralSpan>((self, that) =>
  self.type._tag === that.type._tag && self.literal === that.literal
)

const equalsEnums = ReadonlyArray.getEquivalence<readonly [string, string | number]>((self, that) =>
  that[0] === self[0] && that[1] === self[1]
)

const equals = (self: AST, that: AST) => {
  switch (self._tag) {
    case "Literal":
      return isLiteral(that) && that.literal === self.literal
    case "UniqueSymbol":
      return isUniqueSymbol(that) && that.symbol === self.symbol
    case "UndefinedKeyword":
    case "VoidKeyword":
    case "NeverKeyword":
    case "UnknownKeyword":
    case "AnyKeyword":
    case "StringKeyword":
    case "NumberKeyword":
    case "BooleanKeyword":
    case "BigIntKeyword":
    case "SymbolKeyword":
    case "ObjectKeyword":
      return that._tag === self._tag
    case "TemplateLiteral":
      return isTemplateLiteral(that) && that.head === self.head && equalsTemplateLiteralSpan(that.spans, self.spans)
    case "Enums":
      return isEnums(that) && equalsEnums(that.enums, self.enums)
    case "Refinement":
    case "Tuple":
    case "TypeLiteral":
    case "Union":
    case "Suspend":
    case "Transform":
    case "Declaration":
      return self === that
  }
}

const intersection = ReadonlyArray.intersectionWith(equals)

const _keyof = (ast: AST): Array<AST> => {
  switch (ast._tag) {
    case "Declaration": {
      const annotation = getSurrogateSchemaAnnotation(ast)
      if (Option.isSome(annotation)) {
        return _keyof(annotation.value)
      }
      break
    }
    case "TypeLiteral":
      return ast.propertySignatures.map((p): AST =>
        Predicate.isSymbol(p.name) ? new UniqueSymbol(p.name) : new Literal(p.name)
      ).concat(ast.indexSignatures.map((is) => getParameterBase(is.parameter)))
    case "Suspend":
      return _keyof(ast.f())
    case "Union":
      return ast.types.slice(1).reduce(
        (out: Array<AST>, ast) => intersection(out, _keyof(ast)),
        _keyof(ast.types[0])
      )
    case "Transform":
      return _keyof(ast.to)
  }
  throw new Error(`keyof: unsupported schema (${ast})`)
}

/** @internal */
export const compose = (ab: AST, cd: AST): AST => new Transform(ab, cd, composeTransformation)

/** @internal */
export const rename = (ast: AST, mapping: { readonly [K in PropertyKey]?: PropertyKey }): AST => {
  switch (ast._tag) {
    case "TypeLiteral": {
      const propertySignatureTransforms: Array<PropertySignatureTransformation> = []
      for (const key of _util.ownKeys(mapping)) {
        const name = mapping[key]
        if (name !== undefined) {
          propertySignatureTransforms.push(
            new PropertySignatureTransformation(
              key,
              name,
              identity,
              identity
            )
          )
        }
      }
      if (propertySignatureTransforms.length === 0) {
        return ast
      }
      return new Transform(
        ast,
        TypeLiteral.make(
          ast.propertySignatures.map((ps) => {
            const name = mapping[ps.name]
            return new PropertySignature(
              name === undefined ? ps.name : name,
              to(ps.type),
              ps.isOptional,
              ps.isReadonly,
              ps.annotations
            )
          }),
          ast.indexSignatures
        ),
        TypeLiteralTransformation.make(propertySignatureTransforms)
      )
    }
    case "Suspend":
      return new Suspend(() => rename(ast.f(), mapping))
    case "Transform":
      return compose(ast, rename(to(ast), mapping))
  }
  throw new Error(`rename: cannot rename (${ast})`)
}

const formatKeyword = (ast: AST, verbose: boolean = false): string =>
  Option.getOrElse(getExpected(ast, verbose), () => ast._tag)

const getExpected = (ast: AST, verbose: boolean): Option.Option<string> => {
  if (verbose) {
    const description = getDescriptionAnnotation(ast).pipe(
      Option.orElse(() => getTitleAnnotation(ast))
    )
    return Option.match(getIdentifierAnnotation(ast), {
      onNone: () => description,
      onSome: (identifier) =>
        Option.match(description, {
          onNone: () => Option.some(identifier),
          onSome: (description) => Option.some(`${identifier} (${description})`)
        })
    })
  } else {
    return getIdentifierAnnotation(ast).pipe(
      Option.orElse(() => getTitleAnnotation(ast)),
      Option.orElse(() => getDescriptionAnnotation(ast))
    )
  }
}
