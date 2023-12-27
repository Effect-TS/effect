/**
 * @since 1.0.0
 */

import { dual, identity, pipe } from "effect/Function"
import * as Number from "effect/Number"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import * as Predicate from "effect/Predicate"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as Internal from "./internal/ast.js"
import type * as ParseResult from "./ParseResult.js"

// -------------------------------------------------------------------------------------
// annotations
// -------------------------------------------------------------------------------------

/**
 * @category annotations
 * @since 1.0.0
 */
export type BrandAnnotation = ReadonlyArray<string>

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
export type MessageAnnotation<A> = (a: A) => string

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
export type ExamplesAnnotation = ReadonlyArray<unknown>

/**
 * @category annotations
 * @since 1.0.0
 */
export const ExamplesAnnotationId = Symbol.for("@effect/schema/annotation/Examples")

/**
 * @category annotations
 * @since 1.0.0
 */
export type DefaultAnnotation = unknown

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
export const getMessageAnnotation = getAnnotation<MessageAnnotation<unknown>>(
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
export const getExamplesAnnotation = getAnnotation<ExamplesAnnotation>(
  ExamplesAnnotationId
)

/**
 * @category annotations
 * @since 1.0.0
 */
export const getDefaultAnnotation = getAnnotation<DefaultAnnotation>(
  DefaultAnnotationId
)

/**
 * @category annotations
 * @since 1.0.0
 */
export const getJSONSchemaAnnotation = getAnnotation<JSONSchemaAnnotation>(
  JSONSchemaAnnotationId
)

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

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

/**
 * @category model
 * @since 1.0.0
 */
export interface Declaration extends Annotated {
  readonly _tag: "Declaration"
  readonly typeParameters: ReadonlyArray<AST>
  readonly type: AST
  readonly decode: (
    isDecoding: boolean,
    ...typeParameters: ReadonlyArray<AST>
  ) => (input: any, options: ParseOptions, self: AST) => ParseResult.ParseResult<any>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const createDeclaration = (
  typeParameters: ReadonlyArray<AST>,
  type: AST,
  decode: Declaration["decode"],
  annotations: Annotated["annotations"] = {}
): Declaration => ({ _tag: "Declaration", typeParameters, type, decode, annotations })

/**
 * @category guards
 * @since 1.0.0
 */
export const isDeclaration = (ast: AST): ast is Declaration => ast._tag === "Declaration"

/**
 * @category model
 * @since 1.0.0
 */
export type LiteralValue = string | number | boolean | null | bigint

/**
 * @category model
 * @since 1.0.0
 */
export interface Literal extends Annotated {
  readonly _tag: "Literal"
  readonly literal: LiteralValue
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const createLiteral = (
  literal: LiteralValue,
  annotations: Annotated["annotations"] = {}
): Literal => ({ _tag: "Literal", literal, annotations })

/**
 * @category guards
 * @since 1.0.0
 */
export const isLiteral = (ast: AST): ast is Literal => ast._tag === "Literal"

/** @internal */
export const _null = createLiteral(null)

/**
 * @category model
 * @since 1.0.0
 */
export interface UniqueSymbol extends Annotated {
  readonly _tag: "UniqueSymbol"
  readonly symbol: symbol
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const createUniqueSymbol = (
  symbol: symbol,
  annotations: Annotated["annotations"] = {}
): UniqueSymbol => ({ _tag: "UniqueSymbol", symbol, annotations })

/**
 * @category guards
 * @since 1.0.0
 */
export const isUniqueSymbol = (ast: AST): ast is UniqueSymbol => ast._tag === "UniqueSymbol"

/**
 * @category model
 * @since 1.0.0
 */
export interface UndefinedKeyword extends Annotated {
  readonly _tag: "UndefinedKeyword"
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const undefinedKeyword: UndefinedKeyword = {
  _tag: "UndefinedKeyword",
  annotations: {
    [TitleAnnotationId]: "undefined"
  }
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isUndefinedKeyword = (ast: AST): ast is UndefinedKeyword =>
  ast._tag === "UndefinedKeyword"

/**
 * @category model
 * @since 1.0.0
 */
export interface VoidKeyword extends Annotated {
  readonly _tag: "VoidKeyword"
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const voidKeyword: VoidKeyword = {
  _tag: "VoidKeyword",
  annotations: {
    [TitleAnnotationId]: "void"
  }
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isVoidKeyword = (ast: AST): ast is VoidKeyword => ast._tag === "VoidKeyword"

/**
 * @category model
 * @since 1.0.0
 */
export interface NeverKeyword extends Annotated {
  readonly _tag: "NeverKeyword"
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const neverKeyword: NeverKeyword = {
  _tag: "NeverKeyword",
  annotations: {
    [TitleAnnotationId]: "never"
  }
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isNeverKeyword = (ast: AST): ast is NeverKeyword => ast._tag === "NeverKeyword"

/**
 * @category model
 * @since 1.0.0
 */
export interface UnknownKeyword extends Annotated {
  readonly _tag: "UnknownKeyword"
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const unknownKeyword: UnknownKeyword = {
  _tag: "UnknownKeyword",
  annotations: {
    [TitleAnnotationId]: "unknown"
  }
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isUnknownKeyword = (ast: AST): ast is UnknownKeyword => ast._tag === "UnknownKeyword"

/**
 * @category model
 * @since 1.0.0
 */
export interface AnyKeyword extends Annotated {
  readonly _tag: "AnyKeyword"
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const anyKeyword: AnyKeyword = {
  _tag: "AnyKeyword",
  annotations: {
    [TitleAnnotationId]: "any"
  }
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isAnyKeyword = (ast: AST): ast is AnyKeyword => ast._tag === "AnyKeyword"

/**
 * @category model
 * @since 1.0.0
 */
export interface StringKeyword extends Annotated {
  readonly _tag: "StringKeyword"
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const stringKeyword: StringKeyword = {
  _tag: "StringKeyword",
  annotations: {
    [TitleAnnotationId]: "string",
    [DescriptionAnnotationId]: "a string"
  }
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isStringKeyword = (ast: AST): ast is StringKeyword => ast._tag === "StringKeyword"

/**
 * @category model
 * @since 1.0.0
 */
export interface NumberKeyword extends Annotated {
  readonly _tag: "NumberKeyword"
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const numberKeyword: NumberKeyword = {
  _tag: "NumberKeyword",
  annotations: {
    [TitleAnnotationId]: "number",
    [DescriptionAnnotationId]: "a number"
  }
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isNumberKeyword = (ast: AST): ast is NumberKeyword => ast._tag === "NumberKeyword"

/**
 * @category model
 * @since 1.0.0
 */
export interface BooleanKeyword extends Annotated {
  readonly _tag: "BooleanKeyword"
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const booleanKeyword: BooleanKeyword = {
  _tag: "BooleanKeyword",
  annotations: {
    [TitleAnnotationId]: "boolean",
    [DescriptionAnnotationId]: "a boolean"
  }
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isBooleanKeyword = (ast: AST): ast is BooleanKeyword => ast._tag === "BooleanKeyword"

/**
 * @category model
 * @since 1.0.0
 */
export interface BigIntKeyword extends Annotated {
  readonly _tag: "BigIntKeyword"
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const bigIntKeyword: BigIntKeyword = {
  _tag: "BigIntKeyword",
  annotations: {
    [TitleAnnotationId]: "bigint",
    [DescriptionAnnotationId]: "a bigint"
  }
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isBigIntKeyword = (ast: AST): ast is BigIntKeyword => ast._tag === "BigIntKeyword"

/**
 * @category model
 * @since 1.0.0
 */
export interface SymbolKeyword extends Annotated {
  readonly _tag: "SymbolKeyword"
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const symbolKeyword: SymbolKeyword = {
  _tag: "SymbolKeyword",
  annotations: {
    [TitleAnnotationId]: "symbol",
    [DescriptionAnnotationId]: "a symbol"
  }
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isSymbolKeyword = (ast: AST): ast is SymbolKeyword => ast._tag === "SymbolKeyword"

/**
 * @category model
 * @since 1.0.0
 */
export interface ObjectKeyword extends Annotated {
  readonly _tag: "ObjectKeyword"
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const objectKeyword: ObjectKeyword = {
  _tag: "ObjectKeyword",
  annotations: {
    [TitleAnnotationId]: "object",
    [DescriptionAnnotationId]: "an object"
  }
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isObjectKeyword = (ast: AST): ast is ObjectKeyword => ast._tag === "ObjectKeyword"

/**
 * @category model
 * @since 1.0.0
 */
export interface Enums extends Annotated {
  readonly _tag: "Enums"
  readonly enums: ReadonlyArray<readonly [string, string | number]>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const createEnums = (
  enums: ReadonlyArray<readonly [string, string | number]>,
  annotations: Annotated["annotations"] = {}
): Enums => ({ _tag: "Enums", enums, annotations })

/**
 * @category guards
 * @since 1.0.0
 */
export const isEnums = (ast: AST): ast is Enums => ast._tag === "Enums"

/**
 * @since 1.0.0
 */
export interface TemplateLiteralSpan {
  readonly type: StringKeyword | NumberKeyword
  readonly literal: string
}

/**
 * @category model
 * @since 1.0.0
 */
export interface TemplateLiteral extends Annotated {
  readonly _tag: "TemplateLiteral"
  readonly head: string
  readonly spans: ReadonlyArray.NonEmptyReadonlyArray<TemplateLiteralSpan>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const createTemplateLiteral = (
  head: string,
  spans: ReadonlyArray<TemplateLiteralSpan>,
  annotations: Annotated["annotations"] = {}
): TemplateLiteral | Literal =>
  ReadonlyArray.isNonEmptyReadonlyArray(spans) ?
    { _tag: "TemplateLiteral", head, spans, annotations } :
    createLiteral(head)

/**
 * @category guards
 * @since 1.0.0
 */
export const isTemplateLiteral = (ast: AST): ast is TemplateLiteral =>
  ast._tag === "TemplateLiteral"

/**
 * @since 1.0.0
 */
export interface Element {
  readonly type: AST
  readonly isOptional: boolean
}

/**
 * @since 1.0.0
 */
export const createElement = (
  type: AST,
  isOptional: boolean
): Element => ({ type, isOptional })

/**
 * @category model
 * @since 1.0.0
 */
export interface Tuple extends Annotated {
  readonly _tag: "Tuple"
  readonly elements: ReadonlyArray<Element>
  readonly rest: Option.Option<ReadonlyArray.NonEmptyReadonlyArray<AST>>
  readonly isReadonly: boolean
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const createTuple = (
  elements: ReadonlyArray<Element>,
  rest: Option.Option<ReadonlyArray.NonEmptyReadonlyArray<AST>>,
  isReadonly: boolean,
  annotations: Annotated["annotations"] = {}
): Tuple => ({ _tag: "Tuple", elements, rest, isReadonly, annotations })

/**
 * @category guards
 * @since 1.0.0
 */
export const isTuple = (ast: AST): ast is Tuple => ast._tag === "Tuple"

/**
 * @since 1.0.0
 */
export interface PropertySignature extends Annotated {
  readonly name: PropertyKey
  readonly type: AST
  readonly isOptional: boolean
  readonly isReadonly: boolean
}

/**
 * @since 1.0.0
 */
export const createPropertySignature = (
  name: PropertyKey,
  type: AST,
  isOptional: boolean,
  isReadonly: boolean,
  annotations: Annotated["annotations"] = {}
): PropertySignature => ({ name, type, isOptional, isReadonly, annotations })

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
    default:
      return false
  }
}

/**
 * @since 1.0.0
 */
export interface IndexSignature {
  readonly parameter: Parameter
  readonly type: AST
  readonly isReadonly: boolean
}

/**
 * @since 1.0.0
 */
export const createIndexSignature = (
  parameter: AST,
  type: AST,
  isReadonly: boolean
): IndexSignature => {
  if (isParameter(parameter)) {
    return ({ parameter, type, isReadonly })
  }
  throw new Error(
    "An index signature parameter type must be 'string', 'symbol', a template literal type or a refinement of the previous types"
  )
}

/**
 * @category model
 * @since 1.0.0
 */
export interface TypeLiteral extends Annotated {
  readonly _tag: "TypeLiteral"
  readonly propertySignatures: ReadonlyArray<PropertySignature>
  readonly indexSignatures: ReadonlyArray<IndexSignature>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const createTypeLiteral = (
  propertySignatures: ReadonlyArray<PropertySignature>,
  indexSignatures: ReadonlyArray<IndexSignature>,
  annotations: Annotated["annotations"] = {}
): TypeLiteral => {
  // check for duplicate property signatures
  const keys: Record<PropertyKey, null> = {}
  for (let i = 0; i < propertySignatures.length; i++) {
    const name = propertySignatures[i].name
    if (Object.prototype.hasOwnProperty.call(keys, name)) {
      throw new Error(`Duplicate property signature ${String(name)}`)
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
  return {
    _tag: "TypeLiteral",
    propertySignatures: sortPropertySignatures(propertySignatures),
    indexSignatures,
    annotations
  }
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isTypeLiteral = (ast: AST): ast is TypeLiteral => ast._tag === "TypeLiteral"

/**
 * @since 1.0.0
 */
export type Members<A> = readonly [A, A, ...Array<A>]

/**
 * @category model
 * @since 1.0.0
 */
export interface Union extends Annotated {
  readonly _tag: "Union"
  readonly types: Members<AST>
}

const isMembers = <A>(as: ReadonlyArray<A>): as is readonly [A, A, ...Array<A>] => as.length > 1

/**
 * @category constructors
 * @since 1.0.0
 */
export const createUnion = (
  candidates: ReadonlyArray<AST>,
  annotations: Annotated["annotations"] = {}
): AST => {
  const types = unify(candidates)
  if (isMembers(types)) {
    return {
      _tag: "Union",
      types: sortUnionMembers(types),
      annotations
    }
  }
  if (ReadonlyArray.isNonEmptyReadonlyArray(types)) {
    return types[0]
  }
  return neverKeyword
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isUnion = (ast: AST): ast is Union => ast._tag === "Union"

/**
 * @category model
 * @since 1.0.0
 */
export interface Suspend extends Annotated {
  readonly _tag: "Suspend"
  readonly f: () => AST
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const createSuspend = (
  f: () => AST,
  annotations: Annotated["annotations"] = {}
): Suspend => ({
  _tag: "Suspend",
  f: Internal.memoizeThunk(f),
  annotations
})

/**
 * @category guards
 * @since 1.0.0
 */
export const isSuspend = (ast: AST): ast is Suspend => ast._tag === "Suspend"

/**
 * @category model
 * @since 1.0.0
 */
export interface Refinement<From = AST> extends Annotated {
  readonly _tag: "Refinement"
  readonly from: From
  readonly filter: (
    input: any,
    options: ParseOptions,
    self: AST
  ) => Option.Option<ParseResult.ParseError>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const createRefinement = <From extends AST>(
  from: From,
  filter: Refinement["filter"],
  annotations: Annotated["annotations"] = {}
): Refinement<From> | Transform => {
  if (isTransform(from)) {
    // recurse right
    return createTransform(
      from.from,
      createRefinement(from.to, filter, annotations),
      from.transformation,
      from.annotations
    )
  }
  return { _tag: "Refinement", from, filter, annotations }
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isRefinement = (ast: AST): ast is Refinement => ast._tag === "Refinement"

/**
 * @category model
 * @since 1.0.0
 */
export interface ParseOptions {
  /** default "first" */
  readonly errors?: "first" | "all"
  /** default "ignore" */
  readonly onExcessProperty?: "ignore" | "error"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Transform extends Annotated {
  readonly _tag: "Transform"
  readonly from: AST
  readonly to: AST
  readonly transformation: Transformation
}

/**
 * @category model
 * @since 1.0.0
 */
export const createTransform = (
  from: AST,
  to: AST,
  transformation: Transformation,
  annotations: Annotated["annotations"] = {}
): Transform => ({ _tag: "Transform", from, to, transformation, annotations })

/**
 * @category guards
 * @since 1.0.0
 */
export const isTransform = (ast: AST): ast is Transform => ast._tag === "Transform"

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
export interface FinalTransformation {
  readonly _tag: "FinalTransformation"
  readonly decode: (input: any, options: ParseOptions, self: AST) => ParseResult.ParseResult<any>
  readonly encode: (input: any, options: ParseOptions, self: AST) => ParseResult.ParseResult<any>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const createFinalTransformation = (
  decode: FinalTransformation["decode"],
  encode: FinalTransformation["encode"]
): FinalTransformation => ({ _tag: "FinalTransformation", decode, encode })

/**
 * @category guard
 * @since 1.0.0
 */
export const isFinalTransformation = (ast: Transformation): ast is FinalTransformation =>
  ast._tag === "FinalTransformation"

/**
 * @category model
 * @since 1.0.0
 */
export interface ComposeTransformation {
  readonly _tag: "ComposeTransformation"
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const composeTransformation: ComposeTransformation = { _tag: "ComposeTransformation" }

/**
 * @category guard
 * @since 1.0.0
 */
export const isComposeTransformation = (ast: Transformation): ast is ComposeTransformation =>
  ast._tag === "ComposeTransformation"

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
export interface FinalPropertySignatureTransformation {
  readonly _tag: "FinalPropertySignatureTransformation"
  readonly decode: (o: Option.Option<any>) => Option.Option<any>
  readonly encode: (o: Option.Option<any>) => Option.Option<any>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const createFinalPropertySignatureTransformation = (
  decode: FinalPropertySignatureTransformation["decode"],
  encode: FinalPropertySignatureTransformation["encode"]
): FinalPropertySignatureTransformation => ({
  _tag: "FinalPropertySignatureTransformation",
  decode,
  encode
})

/**
 * @category guard
 * @since 1.0.0
 */
export const isFinalPropertySignatureTransformation = (
  ast: PropertySignatureTransformation
): ast is FinalPropertySignatureTransformation =>
  ast._tag === "FinalPropertySignatureTransformation"

/**
 * @category model
 * @since 1.0.0
 */
export type PropertySignatureTransformation = FinalPropertySignatureTransformation

/**
 * @category model
 * @since 1.0.0
 */
export interface PropertySignatureTransform {
  readonly from: PropertyKey
  readonly to: PropertyKey
  readonly propertySignatureTransformation: PropertySignatureTransformation
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const createPropertySignatureTransform = (
  from: PropertyKey,
  to: PropertyKey,
  propertySignatureTransformation: PropertySignatureTransformation
): PropertySignatureTransform => ({ from, to, propertySignatureTransformation })

/**
 * @category model
 * @since 1.0.0
 */
export interface TypeLiteralTransformation {
  readonly _tag: "TypeLiteralTransformation"
  readonly propertySignatureTransformations: ReadonlyArray<
    PropertySignatureTransform
  >
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const createTypeLiteralTransformation = (
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

  return {
    _tag: "TypeLiteralTransformation",
    propertySignatureTransformations
  }
}

/**
 * @category guard
 * @since 1.0.0
 */
export const isTypeLiteralTransformation = (
  ast: Transformation
): ast is TypeLiteralTransformation => ast._tag === "TypeLiteralTransformation"

// -------------------------------------------------------------------------------------
// API
// -------------------------------------------------------------------------------------

/**
 * Adds a group of annotations, potentially overwriting existing annotations.
 *
 * @since 1.0.0
 */
export const mergeAnnotations = (ast: AST, annotations: Annotated["annotations"]): AST => ({
  ...ast,
  annotations: { ...ast.annotations, ...annotations }
})

/**
 * Adds an annotation, potentially overwriting the existing annotation with the specified id.
 *
 * @since 1.0.0
 */
export const setAnnotation = (ast: AST, sym: symbol, value: unknown): AST => ({
  ...ast,
  annotations: { ...ast.annotations, [sym]: value }
})

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
  return createTuple(ast.elements, Option.some([restElement]), ast.isReadonly)
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
      onNone: () => createTuple([...ast.elements, newElement], Option.none(), ast.isReadonly),
      onSome: (rest) => {
        if (newElement.isOptional) {
          throw new Error("An optional element cannot follow a rest element. ts(1266)")
        }
        return createTuple(ast.elements, Option.some([...rest, newElement.type]), ast.isReadonly)
      }
    })
  )
}

/**
 * Equivalent at runtime to the TypeScript type-level `keyof` operator.
 *
 * @since 1.0.0
 */
export const keyof = (ast: AST): AST => createUnion(_keyof(ast))

/**
 * @since 1.0.0
 */
export const getPropertySignatures = (
  ast: AST
): ReadonlyArray<PropertySignature> => {
  switch (ast._tag) {
    case "TypeLiteral":
      return ast.propertySignatures
    case "Suspend":
      return getPropertySignatures(ast.f())
  }
  throw new Error(`getPropertySignatures: unsupported schema (${ast._tag})`)
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
        indexSignatures.push(createIndexSignature(key, value, isReadonly))
        break
      case "Literal":
        if (Predicate.isString(key.literal) || Predicate.isNumber(key.literal)) {
          propertySignatures.push(createPropertySignature(key.literal, value, false, isReadonly))
        } else {
          throw new Error(`createRecord: unsupported literal ${String(key.literal)}`)
        }
        break
      case "UniqueSymbol":
        propertySignatures.push(createPropertySignature(key.symbol, value, false, isReadonly))
        break
      case "Union":
        key.types.forEach(go)
        break
      default:
        throw new Error(`createRecord: unsupported key schema (${key._tag})`)
    }
  }
  go(key)
  return createTypeLiteral(propertySignatures, indexSignatures)
}

/**
 * Equivalent at runtime to the built-in TypeScript utility type `Pick`.
 *
 * @since 1.0.0
 */
export const pick = (ast: AST, keys: ReadonlyArray<PropertyKey>): TypeLiteral =>
  createTypeLiteral(getPropertySignatures(ast).filter((ps) => keys.includes(ps.name)), [])

/**
 * Equivalent at runtime to the built-in TypeScript utility type `Omit`.
 *
 * @since 1.0.0
 */
export const omit = (ast: AST, keys: ReadonlyArray<PropertyKey>): TypeLiteral =>
  createTypeLiteral(getPropertySignatures(ast).filter((ps) => !keys.includes(ps.name)), [])

/**
 * Equivalent at runtime to the built-in TypeScript utility type `Partial`.
 *
 * @since 1.0.0
 */
export const partial = (ast: AST): AST => {
  switch (ast._tag) {
    case "Tuple":
      return createTuple(
        ast.elements.map((e) => createElement(e.type, true)),
        pipe(
          ast.rest,
          Option.map((rest) => [createUnion([...rest, undefinedKeyword])])
        ),
        ast.isReadonly
      )
    case "TypeLiteral":
      return createTypeLiteral(
        ast.propertySignatures.map((f) =>
          createPropertySignature(f.name, f.type, true, f.isReadonly, f.annotations)
        ),
        ast.indexSignatures
      )
    case "Union":
      return createUnion(ast.types.map((member) => partial(member)))
    case "Suspend":
      return createSuspend(() => partial(ast.f()))
    case "Declaration":
      throw new Error("`partial` cannot handle declarations")
    case "Refinement":
      throw new Error("`partial` cannot handle refinements")
    case "Transform":
      throw new Error("`partial` cannot handle transformations")
    default:
      return ast
  }
}

/**
 * Equivalent at runtime to the built-in TypeScript utility type `Required`.
 *
 * @since 1.0.0
 */
export const required = (ast: AST): AST => {
  switch (ast._tag) {
    case "Tuple":
      return createTuple(
        ast.elements.map((e) => createElement(e.type, false)),
        pipe(
          ast.rest,
          Option.map((rest) => {
            const u = createUnion([...rest])
            return ReadonlyArray.map(rest, () => u)
          })
        ),
        ast.isReadonly
      )
    case "TypeLiteral":
      return createTypeLiteral(
        ast.propertySignatures.map((f) =>
          createPropertySignature(f.name, f.type, false, f.isReadonly, f.annotations)
        ),
        ast.indexSignatures
      )
    case "Union":
      return createUnion(ast.types.map((member) => required(member)))
    case "Suspend":
      return createSuspend(() => required(ast.f()))
    case "Declaration":
      throw new Error("`required` cannot handle declarations")
    case "Refinement":
      throw new Error("`required` cannot handle refinements")
    case "Transform":
      throw new Error("`required` cannot handle transformations")
    default:
      return ast
  }
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
      return createTuple(ast.elements, ast.rest, false, ast.annotations)
    case "TypeLiteral":
      return createTypeLiteral(
        ast.propertySignatures.map((ps) =>
          createPropertySignature(ps.name, ps.type, ps.isOptional, false, ps.annotations)
        ),
        ast.indexSignatures.map((is) => createIndexSignature(is.parameter, is.type, false)),
        ast.annotations
      )
    case "Union":
      return createUnion(ast.types.map(mutable), ast.annotations)
    case "Suspend":
      return createSuspend(() => mutable(ast.f()), ast.annotations)
    case "Refinement":
      return createRefinement(mutable(ast.from), ast.filter, ast.annotations)
    case "Transform":
      return createTransform(
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
export const getToPropertySignatures = (
  ps: ReadonlyArray<PropertySignature>
): Array<PropertySignature> =>
  ps.map((p) =>
    createPropertySignature(p.name, to(p.type), p.isOptional, p.isReadonly, p.annotations)
  )

/** @internal */
export const getToIndexSignatures = (
  ps: ReadonlyArray<IndexSignature>
): Array<IndexSignature> =>
  ps.map((is) => createIndexSignature(is.parameter, to(is.type), is.isReadonly))

/**
 * @since 1.0.0
 */
export const to = (ast: AST): AST => {
  switch (ast._tag) {
    case "Declaration":
      return createDeclaration(
        ast.typeParameters.map(to),
        to(ast.type),
        ast.decode,
        ast.annotations
      )
    case "Tuple":
      return createTuple(
        ast.elements.map((e) => createElement(to(e.type), e.isOptional)),
        Option.map(ast.rest, ReadonlyArray.map(to)),
        ast.isReadonly,
        ast.annotations
      )
    case "TypeLiteral":
      return createTypeLiteral(
        getToPropertySignatures(ast.propertySignatures),
        getToIndexSignatures(ast.indexSignatures),
        ast.annotations
      )
    case "Union":
      return createUnion(ast.types.map(to), ast.annotations)
    case "Suspend":
      return createSuspend(() => to(ast.f()), ast.annotations)
    case "Refinement":
      return createRefinement(to(ast.from), ast.filter, ast.annotations)
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
      return createDeclaration(
        ast.typeParameters.map(from),
        from(ast.type),
        ast.decode,
        ast.annotations
      )
    case "Tuple":
      return createTuple(
        ast.elements.map((e) => createElement(from(e.type), e.isOptional)),
        Option.map(ast.rest, ReadonlyArray.map(from)),
        ast.isReadonly,
        preserveIdentifierAnnotation(ast)
      )
    case "TypeLiteral":
      return createTypeLiteral(
        ast.propertySignatures.map((p) =>
          createPropertySignature(p.name, from(p.type), p.isOptional, p.isReadonly)
        ),
        ast.indexSignatures.map((is) =>
          createIndexSignature(is.parameter, from(is.type), is.isReadonly)
        ),
        preserveIdentifierAnnotation(ast)
      )
    case "Union":
      return createUnion(ast.types.map(from), preserveIdentifierAnnotation(ast))
    case "Suspend":
      return createSuspend(() => from(ast.f()), preserveIdentifierAnnotation(ast))
    case "Refinement":
    case "Transform":
      return from(ast.from)
  }
  return ast
}

/** @internal */
export const getCardinality = (ast: AST): number => {
  switch (ast._tag) {
    case "Declaration":
      return getCardinality(ast.type)
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

type Weight = readonly [number, number, number]

const WeightOrder: Order.Order<Weight> = Order.tuple<
  readonly [Order.Order<number>, Order.Order<number>, Order.Order<number>]
>(Number.Order, Number.Order, Number.Order)

const maxWeight = Order.max<Weight>(WeightOrder)

const emptyWeight: Weight = [0, 0, 0]

const maxWeightAll = (weights: ReadonlyArray<Weight>): Weight =>
  weights.reduce(maxWeight, emptyWeight)

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
      const [_, y, z] = getWeight(ast.type)
      return [6, y, z]
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

const unify = (candidates: ReadonlyArray<AST>): ReadonlyArray<AST> => {
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
    out = out.filter((m, j) =>
      j === i || (!isStringKeyword(m) && !(isLiteral(m) && typeof m.literal === "string"))
    )
  }
  if ((i = out.findIndex(isNumberKeyword)) !== -1) {
    out = out.filter((m, j) =>
      j === i || (!isNumberKeyword(m) && !(isLiteral(m) && typeof m.literal === "number"))
    )
  }
  if ((i = out.findIndex(isBooleanKeyword)) !== -1) {
    out = out.filter((m, j) =>
      j === i || (!isBooleanKeyword(m) && !(isLiteral(m) && typeof m.literal === "boolean"))
    )
  }
  if ((i = out.findIndex(isBigIntKeyword)) !== -1) {
    out = out.filter((m, j) =>
      j === i || (!isBigIntKeyword(m) && !(isLiteral(m) && typeof m.literal === "bigint"))
    )
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

const _keyof = (ast: AST): ReadonlyArray<AST> => {
  switch (ast._tag) {
    case "Declaration":
      return _keyof(ast.type)
    case "TypeLiteral":
      return ast.propertySignatures.map((p): AST =>
        Predicate.isSymbol(p.name) ? createUniqueSymbol(p.name) : createLiteral(p.name)
      ).concat(ast.indexSignatures.map((is) => getParameterBase(is.parameter)))
    case "Suspend":
      return _keyof(ast.f())
    default:
      throw new Error(`keyof: unsupported schema (${ast._tag})`)
  }
}

/** @internal */
export const compose = (ab: AST, cd: AST): AST => createTransform(ab, cd, composeTransformation)

/** @internal */
export const rename = (ast: AST, mapping: { readonly [K in PropertyKey]?: PropertyKey }): AST => {
  switch (ast._tag) {
    case "TypeLiteral": {
      const propertySignatureTransforms: Array<PropertySignatureTransform> = []
      for (const key of Internal.ownKeys(mapping)) {
        const name = mapping[key]
        if (name !== undefined) {
          propertySignatureTransforms.push(createPropertySignatureTransform(
            key,
            name,
            createFinalPropertySignatureTransformation(
              identity,
              identity
            )
          ))
        }
      }
      if (propertySignatureTransforms.length === 0) {
        return ast
      }
      return createTransform(
        ast,
        createTypeLiteral(
          ast.propertySignatures.map((ps) => {
            const name = mapping[ps.name]
            return createPropertySignature(
              name === undefined ? ps.name : name,
              to(ps.type),
              ps.isOptional,
              ps.isReadonly,
              ps.annotations
            )
          }),
          ast.indexSignatures
        ),
        createTypeLiteralTransformation(propertySignatureTransforms)
      )
    }
    case "Suspend":
      return createSuspend(() => rename(ast.f(), mapping))
    case "Transform":
      return compose(ast, rename(to(ast), mapping))
  }
  throw new Error(`cannot rename ${ast._tag}`)
}
