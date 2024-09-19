/**
 * @since 0.67.0
 */

import * as Arr from "effect/Array"
import type { Effect } from "effect/Effect"
import { dual, identity } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Number from "effect/Number"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import * as Predicate from "effect/Predicate"
import * as regexp from "effect/RegExp"
import type { Concurrency } from "effect/Types"
import * as errors_ from "./internal/errors.js"
import * as util_ from "./internal/util.js"
import type { ParseIssue } from "./ParseResult.js"

/**
 * @category model
 * @since 0.67.0
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
  | TupleType
  | TypeLiteral
  | Union
  | Suspend
  // transformations
  | Transformation

// -------------------------------------------------------------------------------------
// annotations
// -------------------------------------------------------------------------------------

/**
 * @category annotations
 * @since 0.67.0
 */
export type BrandAnnotation = Arr.NonEmptyReadonlyArray<string | symbol>

/**
 * @category annotations
 * @since 0.67.0
 */
export const BrandAnnotationId = Symbol.for("@effect/schema/annotation/Brand")

/**
 * @category annotations
 * @since 0.67.0
 */
export type TypeAnnotation = symbol

/**
 * @category annotations
 * @since 0.67.0
 */
export const TypeAnnotationId = Symbol.for("@effect/schema/annotation/Type")

/**
 * @category annotations
 * @since 0.67.0
 */
export type MessageAnnotation = (issue: ParseIssue) => string | Effect<string> | {
  readonly message: string | Effect<string>
  readonly override: boolean
}

/**
 * @category annotations
 * @since 0.67.0
 */
export const MessageAnnotationId = Symbol.for("@effect/schema/annotation/Message")

/**
 * @category annotations
 * @since 0.67.0
 */
export type MissingMessageAnnotation = () => string | Effect<string>

/**
 * @category annotations
 * @since 0.67.0
 */
export const MissingMessageAnnotationId = Symbol.for("@effect/schema/annotation/MissingMessage")

/**
 * @category annotations
 * @since 0.67.0
 */
export type IdentifierAnnotation = string

/**
 * @category annotations
 * @since 0.67.0
 */
export const IdentifierAnnotationId = Symbol.for("@effect/schema/annotation/Identifier")

/**
 * @category annotations
 * @since 0.67.0
 */
export type TitleAnnotation = string

/**
 * @category annotations
 * @since 0.67.0
 */
export const TitleAnnotationId = Symbol.for("@effect/schema/annotation/Title")

/**
 * @category annotations
 * @since 0.67.0
 */
export type DescriptionAnnotation = string

/**
 * @category annotations
 * @since 0.67.0
 */
export const DescriptionAnnotationId = Symbol.for("@effect/schema/annotation/Description")

/**
 * @category annotations
 * @since 0.67.0
 */
export type ExamplesAnnotation<A> = Arr.NonEmptyReadonlyArray<A>

/**
 * @category annotations
 * @since 0.67.0
 */
export const ExamplesAnnotationId = Symbol.for("@effect/schema/annotation/Examples")

/**
 * @category annotations
 * @since 0.67.0
 */
export type DefaultAnnotation<A> = A

/**
 * @category annotations
 * @since 0.67.0
 */
export const DefaultAnnotationId = Symbol.for("@effect/schema/annotation/Default")

/**
 * @category annotations
 * @since 0.67.0
 */
export type JSONSchemaAnnotation = object

/**
 * @category annotations
 * @since 0.67.0
 */
export const JSONSchemaAnnotationId = Symbol.for("@effect/schema/annotation/JSONSchema")

/**
 * @category annotations
 * @since 0.67.0
 */
export type DocumentationAnnotation = string

/**
 * @category annotations
 * @since 0.67.0
 */
export const DocumentationAnnotationId = Symbol.for("@effect/schema/annotation/Documentation")

/**
 * @category annotations
 * @since 0.67.0
 */
export type ConcurrencyAnnotation = Concurrency | undefined

/**
 * @category annotations
 * @since 0.67.0
 */
export const ConcurrencyAnnotationId = Symbol.for("@effect/schema/annotation/Concurrency")

/**
 * @category annotations
 * @since 0.67.0
 */
export type BatchingAnnotation = boolean | "inherit" | undefined

/**
 * @category annotations
 * @since 0.67.0
 */
export const BatchingAnnotationId = Symbol.for("@effect/schema/annotation/Batching")

/**
 * @category annotations
 * @since 0.67.0
 */
export type ParseIssueTitleAnnotation = (issue: ParseIssue) => string | undefined

/**
 * @category annotations
 * @since 0.67.0
 */
export const ParseIssueTitleAnnotationId = Symbol.for("@effect/schema/annotation/ParseIssueTitle")

/**
 * @category annotations
 * @since 0.68.3
 */
export const ParseOptionsAnnotationId = Symbol.for("@effect/schema/annotation/ParseOptions")

/**
 * @category annotations
 * @since 0.70.1
 */
export type DecodingFallbackAnnotation<A> = (issue: ParseIssue) => Effect<A, ParseIssue>

/**
 * @category annotations
 * @since 0.70.1
 */
export const DecodingFallbackAnnotationId = Symbol.for("@effect/schema/annotation/DecodingFallback")

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

/** @internal */
export const StableFilterAnnotationId = Symbol.for("@effect/schema/annotation/StableFilter")

/**
 * A stable filter consistently applies fixed validation rules, such as
 * 'minItems', 'maxItems', and 'itemsCount', to ensure array length complies
 * with set criteria regardless of the input data's content.
 *
 * @internal
 */
export type StableFilterAnnotation = boolean

/**
 * @category annotations
 * @since 0.67.0
 */
export interface Annotations {
  readonly [_: symbol]: unknown
}

/**
 * @category annotations
 * @since 0.67.0
 */
export interface Annotated {
  readonly annotations: Annotations
}

/**
 * @category annotations
 * @since 0.67.0
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
 * @since 0.67.0
 */
export const getBrandAnnotation = getAnnotation<BrandAnnotation>(BrandAnnotationId)

/**
 * @category annotations
 * @since 0.67.0
 */
export const getMessageAnnotation = getAnnotation<MessageAnnotation>(MessageAnnotationId)

/**
 * @category annotations
 * @since 0.67.0
 */
export const getMissingMessageAnnotation = getAnnotation<MissingMessageAnnotation>(MissingMessageAnnotationId)

/**
 * @category annotations
 * @since 0.67.0
 */
export const getTitleAnnotation = getAnnotation<TitleAnnotation>(TitleAnnotationId)

/**
 * @category annotations
 * @since 0.67.0
 */
export const getIdentifierAnnotation = getAnnotation<IdentifierAnnotation>(IdentifierAnnotationId)

/**
 * @category annotations
 * @since 0.67.0
 */
export const getDescriptionAnnotation = getAnnotation<DescriptionAnnotation>(DescriptionAnnotationId)

/**
 * @category annotations
 * @since 0.67.0
 */
export const getExamplesAnnotation = getAnnotation<ExamplesAnnotation<unknown>>(ExamplesAnnotationId)

/**
 * @category annotations
 * @since 0.67.0
 */
export const getDefaultAnnotation = getAnnotation<DefaultAnnotation<unknown>>(DefaultAnnotationId)

/**
 * @category annotations
 * @since 0.67.0
 */
export const getJSONSchemaAnnotation = getAnnotation<JSONSchemaAnnotation>(JSONSchemaAnnotationId)

/**
 * @category annotations
 * @since 0.67.0
 */
export const getDocumentationAnnotation = getAnnotation<DocumentationAnnotation>(DocumentationAnnotationId)

/**
 * @category annotations
 * @since 0.67.0
 */
export const getConcurrencyAnnotation = getAnnotation<ConcurrencyAnnotation>(ConcurrencyAnnotationId)

/**
 * @category annotations
 * @since 0.67.0
 */
export const getBatchingAnnotation = getAnnotation<BatchingAnnotation>(BatchingAnnotationId)

/**
 * @category annotations
 * @since 0.67.0
 */
export const getParseIssueTitleAnnotation = getAnnotation<ParseIssueTitleAnnotation>(ParseIssueTitleAnnotationId)

/**
 * @category annotations
 * @since 0.68.3
 */
export const getParseOptionsAnnotation = getAnnotation<ParseOptions>(ParseOptionsAnnotationId)

/**
 * @category annotations
 * @since 0.70.1
 */
export const getDecodingFallbackAnnotation = getAnnotation<DecodingFallbackAnnotation<unknown>>(
  DecodingFallbackAnnotationId
)

/** @internal */
export const getSurrogateAnnotation = getAnnotation<SurrogateAnnotation>(SurrogateAnnotationId)

const getStableFilterAnnotation = getAnnotation<StableFilterAnnotation>(StableFilterAnnotationId)

/** @internal */
export const hasStableFilter = (annotated: Annotated) =>
  Option.exists(getStableFilterAnnotation(annotated), (b) => b === true)

const JSONIdentifierAnnotationId = Symbol.for("@effect/schema/annotation/JSONIdentifier")

/** @internal */
export const getJSONIdentifierAnnotation = getAnnotation<IdentifierAnnotation>(JSONIdentifierAnnotationId)

/**
 * @category model
 * @since 0.67.0
 */
export class Declaration implements Annotated {
  /**
   * @since 0.67.0
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
   * @since 0.67.0
   */
  toString() {
    return Option.getOrElse(getExpected(this), () => "<declaration schema>")
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      _tag: this._tag,
      typeParameters: this.typeParameters.map((ast) => ast.toJSON()),
      annotations: toJSONAnnotations(this.annotations)
    }
  }
}

const createASTGuard = <T extends AST["_tag"]>(tag: T) => (ast: AST): ast is Extract<AST, { _tag: T }> =>
  ast._tag === tag

/**
 * @category guards
 * @since 0.67.0
 */
export const isDeclaration: (ast: AST) => ast is Declaration = createASTGuard("Declaration")

/**
 * @category model
 * @since 0.67.0
 */
export type LiteralValue = string | number | boolean | null | bigint

/**
 * @category model
 * @since 0.67.0
 */
export class Literal implements Annotated {
  /**
   * @since 0.67.0
   */
  readonly _tag = "Literal"
  constructor(readonly literal: LiteralValue, readonly annotations: Annotations = {}) {}
  /**
   * @since 0.67.0
   */
  toString() {
    return Option.getOrElse(getExpected(this), () => util_.formatUnknown(this.literal))
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      _tag: this._tag,
      literal: Predicate.isBigInt(this.literal) ? String(this.literal) : this.literal,
      annotations: toJSONAnnotations(this.annotations)
    }
  }
}

/**
 * @category guards
 * @since 0.67.0
 */
export const isLiteral: (ast: AST) => ast is Literal = createASTGuard("Literal")

const $null = new Literal(null)

export {
  /**
   * @category constructors
   * @since 0.67.0
   */
  $null as null
}

/**
 * @category model
 * @since 0.67.0
 */
export class UniqueSymbol implements Annotated {
  /**
   * @since 0.67.0
   */
  readonly _tag = "UniqueSymbol"
  constructor(readonly symbol: symbol, readonly annotations: Annotations = {}) {}
  /**
   * @since 0.67.0
   */
  toString() {
    return Option.getOrElse(getExpected(this), () => util_.formatUnknown(this.symbol))
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      _tag: this._tag,
      symbol: String(this.symbol),
      annotations: toJSONAnnotations(this.annotations)
    }
  }
}

/**
 * @category guards
 * @since 0.67.0
 */
export const isUniqueSymbol: (ast: AST) => ast is UniqueSymbol = createASTGuard("UniqueSymbol")

/**
 * @category model
 * @since 0.67.0
 */
export class UndefinedKeyword implements Annotated {
  /**
   * @since 0.67.0
   */
  readonly _tag = "UndefinedKeyword"
  constructor(readonly annotations: Annotations = {}) {}
  /**
   * @since 0.67.0
   */
  toString() {
    return formatKeyword(this)
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      _tag: this._tag,
      annotations: toJSONAnnotations(this.annotations)
    }
  }
}

/**
 * @category constructors
 * @since 0.67.0
 */
export const undefinedKeyword: UndefinedKeyword = new UndefinedKeyword({
  [TitleAnnotationId]: "undefined"
})

/**
 * @category guards
 * @since 0.67.0
 */
export const isUndefinedKeyword: (ast: AST) => ast is UndefinedKeyword = createASTGuard("UndefinedKeyword")

/**
 * @category model
 * @since 0.67.0
 */
export class VoidKeyword implements Annotated {
  /**
   * @since 0.67.0
   */
  readonly _tag = "VoidKeyword"
  constructor(readonly annotations: Annotations = {}) {}
  /**
   * @since 0.67.0
   */
  toString() {
    return formatKeyword(this)
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      _tag: this._tag,
      annotations: toJSONAnnotations(this.annotations)
    }
  }
}

/**
 * @category constructors
 * @since 0.67.0
 */
export const voidKeyword: VoidKeyword = new VoidKeyword({
  [TitleAnnotationId]: "void"
})

/**
 * @category guards
 * @since 0.67.0
 */
export const isVoidKeyword: (ast: AST) => ast is VoidKeyword = createASTGuard("VoidKeyword")

/**
 * @category model
 * @since 0.67.0
 */
export class NeverKeyword implements Annotated {
  /**
   * @since 0.67.0
   */
  readonly _tag = "NeverKeyword"
  constructor(readonly annotations: Annotations = {}) {}
  /**
   * @since 0.67.0
   */
  toString() {
    return formatKeyword(this)
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      _tag: this._tag,
      annotations: toJSONAnnotations(this.annotations)
    }
  }
}

/**
 * @category constructors
 * @since 0.67.0
 */
export const neverKeyword: NeverKeyword = new NeverKeyword({
  [TitleAnnotationId]: "never"
})

/**
 * @category guards
 * @since 0.67.0
 */
export const isNeverKeyword: (ast: AST) => ast is NeverKeyword = createASTGuard("NeverKeyword")

/**
 * @category model
 * @since 0.67.0
 */
export class UnknownKeyword implements Annotated {
  /**
   * @since 0.67.0
   */
  readonly _tag = "UnknownKeyword"
  constructor(readonly annotations: Annotations = {}) {}
  /**
   * @since 0.67.0
   */
  toString() {
    return formatKeyword(this)
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      _tag: this._tag,
      annotations: toJSONAnnotations(this.annotations)
    }
  }
}

/**
 * @category constructors
 * @since 0.67.0
 */
export const unknownKeyword: UnknownKeyword = new UnknownKeyword({
  [TitleAnnotationId]: "unknown"
})

/**
 * @category guards
 * @since 0.67.0
 */
export const isUnknownKeyword: (ast: AST) => ast is UnknownKeyword = createASTGuard("UnknownKeyword")

/**
 * @category model
 * @since 0.67.0
 */
export class AnyKeyword implements Annotated {
  /**
   * @since 0.67.0
   */
  readonly _tag = "AnyKeyword"
  constructor(readonly annotations: Annotations = {}) {}
  /**
   * @since 0.67.0
   */
  toString() {
    return formatKeyword(this)
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      _tag: this._tag,
      annotations: toJSONAnnotations(this.annotations)
    }
  }
}

/**
 * @category constructors
 * @since 0.67.0
 */
export const anyKeyword: AnyKeyword = new AnyKeyword({
  [TitleAnnotationId]: "any"
})

/**
 * @category guards
 * @since 0.67.0
 */
export const isAnyKeyword: (ast: AST) => ast is AnyKeyword = createASTGuard("AnyKeyword")

/**
 * @category model
 * @since 0.67.0
 */
export class StringKeyword implements Annotated {
  /**
   * @since 0.67.0
   */
  readonly _tag = "StringKeyword"
  constructor(readonly annotations: Annotations = {}) {}
  /**
   * @since 0.67.0
   */
  toString() {
    return formatKeyword(this)
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      _tag: this._tag,
      annotations: toJSONAnnotations(this.annotations)
    }
  }
}

/**
 * @category constructors
 * @since 0.67.0
 */
export const stringKeyword: StringKeyword = new StringKeyword({
  [TitleAnnotationId]: "string",
  [DescriptionAnnotationId]: "a string"
})

/**
 * @category guards
 * @since 0.67.0
 */
export const isStringKeyword: (ast: AST) => ast is StringKeyword = createASTGuard("StringKeyword")

/**
 * @category model
 * @since 0.67.0
 */
export class NumberKeyword implements Annotated {
  /**
   * @since 0.67.0
   */
  readonly _tag = "NumberKeyword"
  constructor(readonly annotations: Annotations = {}) {}
  /**
   * @since 0.67.0
   */
  toString() {
    return formatKeyword(this)
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      _tag: this._tag,
      annotations: toJSONAnnotations(this.annotations)
    }
  }
}

/**
 * @category constructors
 * @since 0.67.0
 */
export const numberKeyword: NumberKeyword = new NumberKeyword({
  [TitleAnnotationId]: "number",
  [DescriptionAnnotationId]: "a number"
})

/**
 * @category guards
 * @since 0.67.0
 */
export const isNumberKeyword: (ast: AST) => ast is NumberKeyword = createASTGuard("NumberKeyword")

/**
 * @category model
 * @since 0.67.0
 */
export class BooleanKeyword implements Annotated {
  /**
   * @since 0.67.0
   */
  readonly _tag = "BooleanKeyword"
  constructor(readonly annotations: Annotations = {}) {}
  /**
   * @since 0.67.0
   */
  toString() {
    return formatKeyword(this)
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      _tag: this._tag,
      annotations: toJSONAnnotations(this.annotations)
    }
  }
}

/**
 * @category constructors
 * @since 0.67.0
 */
export const booleanKeyword: BooleanKeyword = new BooleanKeyword({
  [TitleAnnotationId]: "boolean",
  [DescriptionAnnotationId]: "a boolean"
})

/**
 * @category guards
 * @since 0.67.0
 */
export const isBooleanKeyword: (ast: AST) => ast is BooleanKeyword = createASTGuard("BooleanKeyword")

/**
 * @category model
 * @since 0.67.0
 */
export class BigIntKeyword implements Annotated {
  /**
   * @since 0.67.0
   */
  readonly _tag = "BigIntKeyword"
  constructor(readonly annotations: Annotations = {}) {}
  /**
   * @since 0.67.0
   */
  toString() {
    return formatKeyword(this)
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      _tag: this._tag,
      annotations: toJSONAnnotations(this.annotations)
    }
  }
}

/**
 * @category constructors
 * @since 0.67.0
 */
export const bigIntKeyword: BigIntKeyword = new BigIntKeyword({
  [TitleAnnotationId]: "bigint",
  [DescriptionAnnotationId]: "a bigint"
})

/**
 * @category guards
 * @since 0.67.0
 */
export const isBigIntKeyword: (ast: AST) => ast is BigIntKeyword = createASTGuard("BigIntKeyword")

/**
 * @category model
 * @since 0.67.0
 */
export class SymbolKeyword implements Annotated {
  /**
   * @since 0.67.0
   */
  readonly _tag = "SymbolKeyword"
  constructor(readonly annotations: Annotations = {}) {}
  /**
   * @since 0.67.0
   */
  toString() {
    return formatKeyword(this)
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      _tag: this._tag,
      annotations: toJSONAnnotations(this.annotations)
    }
  }
}

/**
 * @category constructors
 * @since 0.67.0
 */
export const symbolKeyword: SymbolKeyword = new SymbolKeyword({
  [TitleAnnotationId]: "symbol",
  [DescriptionAnnotationId]: "a symbol"
})

/**
 * @category guards
 * @since 0.67.0
 */
export const isSymbolKeyword: (ast: AST) => ast is SymbolKeyword = createASTGuard("SymbolKeyword")

/**
 * @category model
 * @since 0.67.0
 */
export class ObjectKeyword implements Annotated {
  /**
   * @since 0.67.0
   */
  readonly _tag = "ObjectKeyword"
  constructor(readonly annotations: Annotations = {}) {}
  /**
   * @since 0.67.0
   */
  toString() {
    return formatKeyword(this)
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      _tag: this._tag,
      annotations: toJSONAnnotations(this.annotations)
    }
  }
}

/**
 * @category constructors
 * @since 0.67.0
 */
export const objectKeyword: ObjectKeyword = new ObjectKeyword({
  [TitleAnnotationId]: "object",
  [DescriptionAnnotationId]: "an object in the TypeScript meaning, i.e. the `object` type"
})

/**
 * @category guards
 * @since 0.67.0
 */
export const isObjectKeyword: (ast: AST) => ast is ObjectKeyword = createASTGuard("ObjectKeyword")

/**
 * @category model
 * @since 0.67.0
 */
export class Enums implements Annotated {
  /**
   * @since 0.67.0
   */
  readonly _tag = "Enums"
  constructor(
    readonly enums: ReadonlyArray<readonly [string, string | number]>,
    readonly annotations: Annotations = {}
  ) {}
  /**
   * @since 0.67.0
   */
  toString() {
    return Option.getOrElse(
      getExpected(this),
      () => `<enum ${this.enums.length} value(s): ${this.enums.map((_, value) => JSON.stringify(value)).join(" | ")}>`
    )
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      _tag: this._tag,
      enums: this.enums,
      annotations: toJSONAnnotations(this.annotations)
    }
  }
}

/**
 * @category guards
 * @since 0.67.0
 */
export const isEnums: (ast: AST) => ast is Enums = createASTGuard("Enums")

/**
 * @category model
 * @since 0.67.0
 */
export class TemplateLiteralSpan {
  constructor(readonly type: StringKeyword | NumberKeyword, readonly literal: string) {}
  /**
   * @since 0.67.0
   */
  toString() {
    const type = "${" + String(this.type) + "}"
    return type + this.literal
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      type: this.type.toJSON(),
      literal: this.literal
    }
  }
}

/**
 * @category model
 * @since 0.67.0
 */
export class TemplateLiteral implements Annotated {
  /**
   * @since 0.67.0
   */
  readonly _tag = "TemplateLiteral"
  constructor(
    readonly head: string,
    readonly spans: Arr.NonEmptyReadonlyArray<TemplateLiteralSpan>,
    readonly annotations: Annotations = {}
  ) {}
  /**
   * @since 0.67.0
   */
  toString() {
    return Option.getOrElse(getExpected(this), () => formatTemplateLiteral(this))
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      _tag: this._tag,
      head: this.head,
      spans: this.spans.map((span) => span.toJSON()),
      annotations: toJSONAnnotations(this.annotations)
    }
  }
}

const formatTemplateLiteral = (ast: TemplateLiteral): string =>
  "`" + ast.head + ast.spans.map((span) => String(span)).join("") +
  "`"

/**
 * @category guards
 * @since 0.67.0
 */
export const isTemplateLiteral: (ast: AST) => ast is TemplateLiteral = createASTGuard("TemplateLiteral")

/**
 * @category model
 * @since 0.68.0
 */
export class Type implements Annotated {
  constructor(
    readonly type: AST,
    readonly annotations: Annotations = {}
  ) {}
  /**
   * @since 0.68.0
   */
  toJSON(): object {
    return {
      type: this.type.toJSON(),
      annotations: toJSONAnnotations(this.annotations)
    }
  }
  /**
   * @since 0.68.0
   */
  toString() {
    return String(this.type)
  }
}

/**
 * @category model
 * @since 0.68.0
 */
export class OptionalType extends Type {
  constructor(
    type: AST,
    readonly isOptional: boolean,
    annotations: Annotations = {}
  ) {
    super(type, annotations)
  }
  /**
   * @since 0.68.0
   */
  toJSON(): object {
    return {
      type: this.type.toJSON(),
      isOptional: this.isOptional,
      annotations: toJSONAnnotations(this.annotations)
    }
  }
  /**
   * @since 0.68.0
   */
  toString() {
    return String(this.type) + (this.isOptional ? "?" : "")
  }
}

const getRestASTs = (rest: ReadonlyArray<Type>): ReadonlyArray<AST> => rest.map((annotatedAST) => annotatedAST.type)

/**
 * @category model
 * @since 0.67.0
 */
export class TupleType implements Annotated {
  /**
   * @since 0.67.0
   */
  readonly _tag = "TupleType"
  constructor(
    readonly elements: ReadonlyArray<OptionalType>,
    readonly rest: ReadonlyArray<Type>,
    readonly isReadonly: boolean,
    readonly annotations: Annotations = {}
  ) {
    let hasOptionalElement = false
    let hasIllegalRequiredElement = false
    for (const e of elements) {
      if (e.isOptional) {
        hasOptionalElement = true
      } else if (hasOptionalElement) {
        hasIllegalRequiredElement = true
        break
      }
    }
    if (hasIllegalRequiredElement || (hasOptionalElement && rest.length > 1)) {
      throw new Error(errors_.getASTRequiredElementFollowinAnOptionalElementErrorMessage)
    }
  }
  /**
   * @since 0.67.0
   */
  toString() {
    return Option.getOrElse(getExpected(this), () => formatTuple(this))
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      _tag: this._tag,
      elements: this.elements.map((e) => e.toJSON()),
      rest: this.rest.map((ast) => ast.toJSON()),
      isReadonly: this.isReadonly,
      annotations: toJSONAnnotations(this.annotations)
    }
  }
}

const formatTuple = (ast: TupleType): string => {
  const formattedElements = ast.elements.map(String)
    .join(", ")
  return Arr.matchLeft(ast.rest, {
    onEmpty: () => `readonly [${formattedElements}]`,
    onNonEmpty: (head, tail) => {
      const formattedHead = String(head)
      const wrappedHead = formattedHead.includes(" | ") ? `(${formattedHead})` : formattedHead

      if (tail.length > 0) {
        const formattedTail = tail.map(String).join(", ")
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
 * @since 0.67.0
 */
export const isTupleType: (ast: AST) => ast is TupleType = createASTGuard("TupleType")

/**
 * @category model
 * @since 0.67.0
 */
export class PropertySignature extends OptionalType {
  constructor(
    readonly name: PropertyKey,
    type: AST,
    isOptional: boolean,
    readonly isReadonly: boolean,
    annotations?: Annotations
  ) {
    super(type, isOptional, annotations)
  }
  /**
   * @since 0.68.18
   */
  toString(): string {
    return (this.isReadonly ? "readonly " : "") + String(this.name) + (this.isOptional ? "?" : "") + ": " +
      this.type
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      name: String(this.name),
      type: this.type.toJSON(),
      isOptional: this.isOptional,
      isReadonly: this.isReadonly,
      annotations: toJSONAnnotations(this.annotations)
    }
  }
}

/**
 * @since 0.67.0
 */
export type Parameter = StringKeyword | SymbolKeyword | TemplateLiteral | Refinement<Parameter>

/**
 * @since 0.67.0
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
 * @since 0.67.0
 */
export class IndexSignature {
  /**
   * @since 0.67.0
   */
  readonly parameter: Parameter
  constructor(
    parameter: AST,
    readonly type: AST,
    readonly isReadonly: boolean
  ) {
    if (isParameter(parameter)) {
      this.parameter = parameter
    } else {
      throw new Error(errors_.getASTIndexSignatureParameterErrorMessage)
    }
  }
  /**
   * @since 0.68.18
   */
  toString(): string {
    return (this.isReadonly ? "readonly " : "") + `[x: ${this.parameter}]: ${this.type}`
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      parameter: this.parameter.toJSON(),
      type: this.type.toJSON(),
      isReadonly: this.isReadonly
    }
  }
}

/**
 * @category model
 * @since 0.67.0
 */
export class TypeLiteral implements Annotated {
  /**
   * @since 0.67.0
   */
  readonly _tag = "TypeLiteral"
  /**
   * @since 0.67.0
   */
  readonly propertySignatures: ReadonlyArray<PropertySignature>
  /**
   * @since 0.67.0
   */
  readonly indexSignatures: ReadonlyArray<IndexSignature>
  constructor(
    propertySignatures: ReadonlyArray<PropertySignature>,
    indexSignatures: ReadonlyArray<IndexSignature>,
    readonly annotations: Annotations = {}
  ) {
    // check for duplicate property signatures
    const keys: Record<PropertyKey, null> = {}
    for (let i = 0; i < propertySignatures.length; i++) {
      const name = propertySignatures[i].name
      if (Object.prototype.hasOwnProperty.call(keys, name)) {
        throw new Error(errors_.getASTDuplicatePropertySignatureErrorMessage(name))
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
          throw new Error(errors_.getASTDuplicateIndexSignatureErrorMessage("string"))
        }
        parameters.string = true
      } else if (isSymbolKeyword(parameter)) {
        if (parameters.symbol) {
          throw new Error(errors_.getASTDuplicateIndexSignatureErrorMessage("symbol"))
        }
        parameters.symbol = true
      }
    }

    this.propertySignatures = sortPropertySignatures(propertySignatures)
    this.indexSignatures = sortIndexSignatures(indexSignatures)
  }
  /**
   * @since 0.67.0
   */
  toString() {
    return Option.getOrElse(getExpected(this), () => formatTypeLiteral(this))
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      _tag: this._tag,
      propertySignatures: this.propertySignatures.map((ps) => ps.toJSON()),
      indexSignatures: this.indexSignatures.map((ps) => ps.toJSON()),
      annotations: toJSONAnnotations(this.annotations)
    }
  }
}

const formatIndexSignatures = (iss: ReadonlyArray<IndexSignature>): string => iss.map(String).join("; ")

const formatTypeLiteral = (ast: TypeLiteral): string => {
  if (ast.propertySignatures.length > 0) {
    const pss = ast.propertySignatures.map(String).join("; ")
    if (ast.indexSignatures.length > 0) {
      return `{ ${pss}; ${formatIndexSignatures(ast.indexSignatures)} }`
    } else {
      return `{ ${pss} }`
    }
  } else {
    if (ast.indexSignatures.length > 0) {
      return `{ ${formatIndexSignatures(ast.indexSignatures)} }`
    } else {
      return "{}"
    }
  }
}

/**
 * @category guards
 * @since 0.67.0
 */
export const isTypeLiteral: (ast: AST) => ast is TypeLiteral = createASTGuard("TypeLiteral")

/**
 * @since 0.67.0
 */
export type Members<A> = readonly [A, A, ...Array<A>]

const sortCandidates = Arr.sort(
  Order.mapInput(Number.Order, (ast: AST) => {
    switch (ast._tag) {
      case "AnyKeyword":
        return 0
      case "UnknownKeyword":
        return 1
      case "ObjectKeyword":
        return 2
      case "StringKeyword":
      case "NumberKeyword":
      case "BooleanKeyword":
      case "BigIntKeyword":
      case "SymbolKeyword":
        return 3
    }
    return 4
  })
)

const literalMap = {
  string: "StringKeyword",
  number: "NumberKeyword",
  boolean: "BooleanKeyword",
  bigint: "BigIntKeyword"
} as const

/** @internal */
export const flatten = (candidates: ReadonlyArray<AST>): Array<AST> =>
  Arr.flatMap(candidates, (ast) => isUnion(ast) ? flatten(ast.types) : [ast])

/** @internal */
export const unify = (candidates: ReadonlyArray<AST>): Array<AST> => {
  const cs = sortCandidates(candidates)
  const out: Array<AST> = []
  const uniques: { [K in AST["_tag"] | "{}"]?: AST } = {}
  const literals: Array<LiteralValue | symbol> = []
  for (const ast of cs) {
    switch (ast._tag) {
      case "NeverKeyword":
        break
      case "AnyKeyword":
        return [anyKeyword]
      case "UnknownKeyword":
        return [unknownKeyword]
      // uniques
      case "ObjectKeyword":
      case "UndefinedKeyword":
      case "VoidKeyword":
      case "StringKeyword":
      case "NumberKeyword":
      case "BooleanKeyword":
      case "BigIntKeyword":
      case "SymbolKeyword": {
        if (!uniques[ast._tag]) {
          uniques[ast._tag] = ast
          out.push(ast)
        }
        break
      }
      case "Literal": {
        const type = typeof ast.literal
        switch (type) {
          case "string":
          case "number":
          case "bigint":
          case "boolean": {
            const _tag = literalMap[type]
            if (!uniques[_tag] && !literals.includes(ast.literal)) {
              literals.push(ast.literal)
              out.push(ast)
            }
            break
          }
          // null
          case "object": {
            if (!literals.includes(ast.literal)) {
              literals.push(ast.literal)
              out.push(ast)
            }
            break
          }
        }
        break
      }
      case "UniqueSymbol": {
        if (!uniques["SymbolKeyword"] && !literals.includes(ast.symbol)) {
          literals.push(ast.symbol)
          out.push(ast)
        }
        break
      }
      case "TupleType": {
        if (!uniques["ObjectKeyword"]) {
          out.push(ast)
        }
        break
      }
      case "TypeLiteral": {
        if (ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0) {
          if (!uniques["{}"]) {
            uniques["{}"] = ast
            out.push(ast)
          }
        } else if (!uniques["ObjectKeyword"]) {
          out.push(ast)
        }
        break
      }
      default:
        out.push(ast)
    }
  }
  return out
}

/**
 * @category model
 * @since 0.67.0
 */
export class Union implements Annotated {
  static make = (types: ReadonlyArray<AST>, annotations?: Annotations): AST => {
    return isMembers(types) ? new Union(types, annotations) : types.length === 1 ? types[0] : neverKeyword
  }
  /** @internal */
  static unify = (candidates: ReadonlyArray<AST>, annotations?: Annotations): AST => {
    return Union.make(unify(flatten(candidates)), annotations)
  }
  /**
   * @since 0.67.0
   */
  readonly _tag = "Union"
  private constructor(readonly types: Members<AST>, readonly annotations: Annotations = {}) {}
  /**
   * @since 0.67.0
   */
  toString() {
    return Option.getOrElse(
      getExpected(this),
      () => this.types.map(String).join(" | ")
    )
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      _tag: this._tag,
      types: this.types.map((ast) => ast.toJSON()),
      annotations: toJSONAnnotations(this.annotations)
    }
  }
}

/** @internal */
export const mapMembers = <A, B>(members: Members<A>, f: (a: A) => B): Members<B> => members.map(f) as any

/** @internal */
export const isMembers = <A>(as: ReadonlyArray<A>): as is Members<A> => as.length > 1

/**
 * @category guards
 * @since 0.67.0
 */
export const isUnion: (ast: AST) => ast is Union = createASTGuard("Union")

const toJSONMemoMap = globalValue(
  Symbol.for("@effect/schema/AST/toJSONMemoMap"),
  () => new WeakMap<AST, object>()
)

/**
 * @category model
 * @since 0.67.0
 */
export class Suspend implements Annotated {
  /**
   * @since 0.67.0
   */
  readonly _tag = "Suspend"
  constructor(readonly f: () => AST, readonly annotations: Annotations = {}) {
    this.f = util_.memoizeThunk(f)
  }
  /**
   * @since 0.67.0
   */
  toString() {
    return getExpected(this).pipe(
      Option.orElse(() =>
        Option.flatMap(
          Option.liftThrowable(this.f)(),
          (ast) => getExpected(ast)
        )
      ),
      Option.getOrElse(() => "<suspended schema>")
    )
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    const ast = this.f()
    let out = toJSONMemoMap.get(ast)
    if (out) {
      return out
    }
    toJSONMemoMap.set(ast, { _tag: this._tag })
    out = {
      _tag: this._tag,
      ast: ast.toJSON(),
      annotations: toJSONAnnotations(this.annotations)
    }
    toJSONMemoMap.set(ast, out)
    return out
  }
}

/**
 * @category guards
 * @since 0.67.0
 */
export const isSuspend: (ast: AST) => ast is Suspend = createASTGuard("Suspend")

/**
 * @category model
 * @since 0.67.0
 */
export class Refinement<From extends AST = AST> implements Annotated {
  /**
   * @since 0.67.0
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
   * @since 0.67.0
   */
  toString() {
    return Option.getOrElse(getExpected(this), () => `{ ${this.from} | filter }`)
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      _tag: this._tag,
      from: this.from.toJSON(),
      annotations: toJSONAnnotations(this.annotations)
    }
  }
}

/**
 * @category guards
 * @since 0.67.0
 */
export const isRefinement: (ast: AST) => ast is Refinement<AST> = createASTGuard("Refinement")

/**
 * @category model
 * @since 0.67.0
 */
export interface ParseOptions {
  /**
   * The `errors` option allows you to receive all parsing errors when
   * attempting to parse a value using a schema. By default only the first error
   * is returned, but by setting the `errors` option to `"all"`, you can receive
   * all errors that occurred during the parsing process. This can be useful for
   * debugging or for providing more comprehensive error messages to the user.
   *
   * default: "first"
   *
   * @since 0.67.0
   */
  readonly errors?: "first" | "all" | undefined
  /**
   * When using a `Schema` to parse a value, by default any properties that are
   * not specified in the `Schema` will be stripped out from the output. This is
   * because the `Schema` is expecting a specific shape for the parsed value,
   * and any excess properties do not conform to that shape.
   *
   * However, you can use the `onExcessProperty` option (default value:
   * `"ignore"`) to trigger a parsing error. This can be particularly useful in
   * cases where you need to detect and handle potential errors or unexpected
   * values.
   *
   * If you want to allow excess properties to remain, you can use
   * `onExcessProperty` set to `"preserve"`.
   *
   * default: "ignore"
   *
   * @since 0.67.0
   */
  readonly onExcessProperty?: "ignore" | "error" | "preserve" | undefined
  /**
   * The `propertyOrder` option provides control over the order of object fields
   * in the output. This feature is particularly useful when the sequence of
   * keys is important for the consuming processes or when maintaining the input
   * order enhances readability and usability.
   *
   * By default, the `propertyOrder` option is set to `"none"`. This means that
   * the internal system decides the order of keys to optimize parsing speed.
   * The order of keys in this mode should not be considered stable, and it's
   * recommended not to rely on key ordering as it may change in future updates
   * without notice.
   *
   * Setting `propertyOrder` to `"original"` ensures that the keys are ordered
   * as they appear in the input during the decoding/encoding process.
   *
   * default: "none"
   *
   * @since 0.67.20
   */
  readonly propertyOrder?: "none" | "original" | undefined
  /**
   * Handles missing properties in data structures. By default, missing
   * properties are treated as if present with an `undefined` value. To treat
   * missing properties as errors, set the `exact` option to `true`. This
   * setting is already enabled by default for `is` and `asserts` functions,
   * treating absent properties strictly unless overridden.
   *
   * default: false
   *
   * @since 0.67.24
   */
  readonly exact?: boolean | undefined
}

/**
 * @since 0.67.0
 */
export const defaultParseOption: ParseOptions = {}

/**
 * @category model
 * @since 0.67.0
 */
export class Transformation implements Annotated {
  /**
   * @since 0.67.0
   */
  readonly _tag = "Transformation"
  constructor(
    readonly from: AST,
    readonly to: AST,
    readonly transformation: TransformationKind,
    readonly annotations: Annotations = {}
  ) {}
  /**
   * @since 0.67.0
   */
  toString() {
    return Option.getOrElse(
      getExpected(this),
      () => `(${String(this.from)} <-> ${String(this.to)})`
    )
  }
  /**
   * @since 0.67.0
   */
  toJSON(): object {
    return {
      _tag: this._tag,
      from: this.from.toJSON(),
      to: this.to.toJSON(),
      annotations: toJSONAnnotations(this.annotations)
    }
  }
}

/**
 * @category guards
 * @since 0.67.0
 */
export const isTransformation: (ast: AST) => ast is Transformation = createASTGuard("Transformation")

/**
 * @category model
 * @since 0.67.0
 */
export type TransformationKind =
  | FinalTransformation
  | ComposeTransformation
  | TypeLiteralTransformation

/**
 * @category model
 * @since 0.67.0
 */
export class FinalTransformation {
  /**
   * @since 0.67.0
   */
  readonly _tag = "FinalTransformation"
  constructor(
    readonly decode: (
      fromA: any,
      options: ParseOptions,
      self: Transformation,
      fromI: any
    ) => Effect<any, ParseIssue, any>,
    readonly encode: (toI: any, options: ParseOptions, self: Transformation, toA: any) => Effect<any, ParseIssue, any>
  ) {}
}

const createTransformationGuard =
  <T extends TransformationKind["_tag"]>(tag: T) =>
  (ast: TransformationKind): ast is Extract<TransformationKind, { _tag: T }> => ast._tag === tag

/**
 * @category guards
 * @since 0.67.0
 */
export const isFinalTransformation: (ast: TransformationKind) => ast is FinalTransformation = createTransformationGuard(
  "FinalTransformation"
)

/**
 * @category model
 * @since 0.67.0
 */
export class ComposeTransformation {
  /**
   * @since 0.67.0
   */
  readonly _tag = "ComposeTransformation"
}

/**
 * @category constructors
 * @since 0.67.0
 */
export const composeTransformation: ComposeTransformation = new ComposeTransformation()

/**
 * @category guards
 * @since 0.67.0
 */
export const isComposeTransformation: (ast: TransformationKind) => ast is ComposeTransformation =
  createTransformationGuard(
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
 * @since 0.67.0
 */
export class PropertySignatureTransformation {
  constructor(
    readonly from: PropertyKey,
    readonly to: PropertyKey,
    readonly decode: (o: Option.Option<any>) => Option.Option<any>,
    readonly encode: (o: Option.Option<any>) => Option.Option<any>
  ) {}
}

const isRenamingPropertySignatureTransformation = (t: PropertySignatureTransformation) =>
  t.decode === identity && t.encode === identity

/**
 * @category model
 * @since 0.67.0
 */
export class TypeLiteralTransformation {
  /**
   * @since 0.67.0
   */
  readonly _tag = "TypeLiteralTransformation"
  constructor(
    readonly propertySignatureTransformations: ReadonlyArray<
      PropertySignatureTransformation
    >
  ) {
    // check for duplicate property signature transformations
    const fromKeys: Record<PropertyKey, true> = {}
    const toKeys: Record<PropertyKey, true> = {}
    for (const pst of propertySignatureTransformations) {
      const from = pst.from
      if (fromKeys[from]) {
        throw new Error(errors_.getASTDuplicatePropertySignatureTransformationErrorMessage(from))
      }
      fromKeys[from] = true
      const to = pst.to
      if (toKeys[to]) {
        throw new Error(errors_.getASTDuplicatePropertySignatureTransformationErrorMessage(to))
      }
      toKeys[to] = true
    }
  }
}

/**
 * @category guards
 * @since 0.67.0
 */
export const isTypeLiteralTransformation: (ast: TransformationKind) => ast is TypeLiteralTransformation =
  createTransformationGuard("TypeLiteralTransformation")

// -------------------------------------------------------------------------------------
// API
// -------------------------------------------------------------------------------------

/**
 * Merges a set of new annotations with existing ones, potentially overwriting
 * any duplicates.
 *
 * @since 0.67.0
 */
export const annotations = (ast: AST, annotations: Annotations): AST => {
  const d = Object.getOwnPropertyDescriptors(ast)
  d.annotations.value = { ...ast.annotations, ...annotations }
  return Object.create(Object.getPrototypeOf(ast), d)
}

/**
 * Equivalent at runtime to the TypeScript type-level `keyof` operator.
 *
 * @since 0.67.0
 */
export const keyof = (ast: AST): AST => Union.unify(_keyof(ast))

const STRING_KEYWORD_PATTERN = ".*"
const NUMBER_KEYWORD_PATTERN = "[+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?"

/**
 * @since 0.67.0
 */
export const getTemplateLiteralRegExp = (ast: TemplateLiteral): RegExp => {
  let pattern = `^${regexp.escape(ast.head)}`

  for (const span of ast.spans) {
    if (isStringKeyword(span.type)) {
      pattern += STRING_KEYWORD_PATTERN
    } else if (isNumberKeyword(span.type)) {
      pattern += NUMBER_KEYWORD_PATTERN
    }
    pattern += regexp.escape(span.literal)
  }

  pattern += "$"
  return new RegExp(pattern)
}

/**
 * @since 0.70.1
 */
export const getTemplateLiteralCapturingRegExp = (ast: TemplateLiteral): RegExp => {
  let pattern = `^`
  if (ast.head !== "") {
    pattern += `(${regexp.escape(ast.head)})`
  }

  for (const span of ast.spans) {
    if (isStringKeyword(span.type)) {
      pattern += `(${STRING_KEYWORD_PATTERN})`
    } else if (isNumberKeyword(span.type)) {
      pattern += `(${NUMBER_KEYWORD_PATTERN})`
    }
    if (span.literal !== "") {
      pattern += `(${regexp.escape(span.literal)})`
    }
  }

  pattern += "$"
  return new RegExp(pattern)
}

/**
 * @since 0.67.0
 */
export const getPropertySignatures = (ast: AST): Array<PropertySignature> => {
  switch (ast._tag) {
    case "Declaration": {
      const annotation = getSurrogateAnnotation(ast)
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
    case "TupleType": {
      let hasOptional = false
      let out: Array<AST> = []
      for (const e of ast.elements) {
        if (e.isOptional) {
          hasOptional = true
        }
        out.push(e.type)
      }
      if (hasOptional) {
        out.push(undefinedKeyword)
      }
      out = out.concat(getRestASTs(ast.rest))
      return Union.make(out)
    }
    case "Refinement":
      return getNumberIndexedAccess(ast.from)
    case "Union":
      return Union.make(ast.types.map(getNumberIndexedAccess))
    case "Suspend":
      return getNumberIndexedAccess(ast.f())
  }
  throw new Error(errors_.getASTUnsupportedSchema(ast))
}

/** @internal */
export const getPropertyKeyIndexedAccess = (ast: AST, name: PropertyKey): PropertySignature => {
  switch (ast._tag) {
    case "Declaration": {
      const annotation = getSurrogateAnnotation(ast)
      if (Option.isSome(annotation)) {
        return getPropertyKeyIndexedAccess(annotation.value, name)
      }
      break
    }
    case "TypeLiteral": {
      const ops = Arr.findFirst(ast.propertySignatures, (ps) => ps.name === name)
      if (Option.isSome(ops)) {
        return ops.value
      } else {
        if (Predicate.isString(name)) {
          for (const is of ast.indexSignatures) {
            const parameterBase = getParameterBase(is.parameter)
            switch (parameterBase._tag) {
              case "TemplateLiteral": {
                const regex = getTemplateLiteralRegExp(parameterBase)
                if (regex.test(name)) {
                  return new PropertySignature(name, is.type, false, true)
                }
                break
              }
              case "StringKeyword":
                return new PropertySignature(name, is.type, false, true)
            }
          }
        } else if (Predicate.isSymbol(name)) {
          for (const is of ast.indexSignatures) {
            const parameterBase = getParameterBase(is.parameter)
            if (isSymbolKeyword(parameterBase)) {
              return new PropertySignature(name, is.type, false, true)
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
      const annotation = getSurrogateAnnotation(ast)
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
        (out: Array<PropertyKey>, ast) => Arr.intersection(out, getPropertyKeys(ast)),
        getPropertyKeys(ast.types[0])
      )
    case "Transformation":
      return getPropertyKeys(ast.to)
  }
  return []
}

/** @internal */
export const record = (key: AST, value: AST): {
  propertySignatures: Array<PropertySignature>
  indexSignatures: Array<IndexSignature>
} => {
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
        indexSignatures.push(new IndexSignature(key, value, true))
        break
      case "Literal":
        if (Predicate.isString(key.literal) || Predicate.isNumber(key.literal)) {
          propertySignatures.push(new PropertySignature(key.literal, value, false, true))
        } else {
          throw new Error(errors_.getASTUnsupportedLiteral(key.literal))
        }
        break
      case "Enums": {
        for (const [_, name] of key.enums) {
          propertySignatures.push(new PropertySignature(name, value, false, true))
        }
        break
      }
      case "UniqueSymbol":
        propertySignatures.push(new PropertySignature(key.symbol, value, false, true))
        break
      case "Union":
        key.types.forEach(go)
        break
      default:
        throw new Error(errors_.getASTUnsupportedKeySchema(key))
    }
  }
  go(key)
  return { propertySignatures, indexSignatures }
}

/**
 * Equivalent at runtime to the built-in TypeScript utility type `Pick`.
 *
 * @since 0.67.0
 */
export const pick = (ast: AST, keys: ReadonlyArray<PropertyKey>): TypeLiteral | Transformation => {
  if (isTransformation(ast)) {
    switch (ast.transformation._tag) {
      case "ComposeTransformation":
        return new Transformation(
          pick(ast.from, keys),
          pick(ast.to, keys),
          composeTransformation
        )
      case "TypeLiteralTransformation": {
        const ts: Array<PropertySignatureTransformation> = []
        const fromKeys: Array<PropertyKey> = []
        for (const k of keys) {
          const t = ast.transformation.propertySignatureTransformations.find((t) => t.to === k)
          if (t) {
            ts.push(t)
            fromKeys.push(t.from)
          } else {
            fromKeys.push(k)
          }
        }
        return Arr.isNonEmptyReadonlyArray(ts) ?
          new Transformation(
            pick(ast.from, fromKeys),
            pick(ast.to, keys),
            new TypeLiteralTransformation(ts)
          ) :
          pick(ast.from, fromKeys)
      }
      case "FinalTransformation": {
        const annotation = getSurrogateAnnotation(ast)
        if (Option.isSome(annotation)) {
          return pick(annotation.value, keys)
        }
        throw new Error(errors_.getASTUnsupportedSchema(ast))
      }
    }
  }
  return new TypeLiteral(keys.map((key) => getPropertyKeyIndexedAccess(ast, key)), [])
}

/**
 * Equivalent at runtime to the built-in TypeScript utility type `Omit`.
 *
 * @since 0.67.0
 */
export const omit = (ast: AST, keys: ReadonlyArray<PropertyKey>): TypeLiteral | Transformation =>
  pick(ast, getPropertyKeys(ast).filter((name) => !keys.includes(name)))

/** @internal */
export const orUndefined = (ast: AST): AST => Union.make([ast, undefinedKeyword])

/**
 * Equivalent at runtime to the built-in TypeScript utility type `Partial`.
 *
 * @since 0.67.0
 */
export const partial = (ast: AST, options?: { readonly exact: true }): AST => {
  const exact = options?.exact === true
  switch (ast._tag) {
    case "TupleType":
      return new TupleType(
        ast.elements.map((e) => new OptionalType(exact ? e.type : orUndefined(e.type), true)),
        Arr.match(ast.rest, {
          onEmpty: () => ast.rest,
          onNonEmpty: (rest) => [new Type(Union.make([...getRestASTs(rest), undefinedKeyword]))]
        }),
        ast.isReadonly
      )
    case "TypeLiteral":
      return new TypeLiteral(
        ast.propertySignatures.map((ps) =>
          new PropertySignature(ps.name, exact ? ps.type : orUndefined(ps.type), true, ps.isReadonly, ps.annotations)
        ),
        ast.indexSignatures.map((is) => new IndexSignature(is.parameter, orUndefined(is.type), is.isReadonly))
      )
    case "Union":
      return Union.make(ast.types.map((member) => partial(member, options)))
    case "Suspend":
      return new Suspend(() => partial(ast.f(), options))
    case "Declaration":
      throw new Error(errors_.getASTUnsupportedSchema(ast))
    case "Refinement":
      throw new Error(errors_.getASTUnsupportedSchema(ast))
    case "Transformation": {
      if (
        isTypeLiteralTransformation(ast.transformation) &&
        ast.transformation.propertySignatureTransformations.every(isRenamingPropertySignatureTransformation)
      ) {
        return new Transformation(partial(ast.from, options), partial(ast.to, options), ast.transformation)
      }
      throw new Error(errors_.getASTUnsupportedSchema(ast))
    }
  }
  return ast
}

/**
 * Equivalent at runtime to the built-in TypeScript utility type `Required`.
 *
 * @since 0.67.0
 */
export const required = (ast: AST): AST => {
  switch (ast._tag) {
    case "TupleType":
      return new TupleType(
        ast.elements.map((e) => new OptionalType(e.type, false)),
        ast.rest,
        ast.isReadonly
      )
    case "TypeLiteral":
      return new TypeLiteral(
        ast.propertySignatures.map((f) => new PropertySignature(f.name, f.type, false, f.isReadonly, f.annotations)),
        ast.indexSignatures
      )
    case "Union":
      return Union.make(ast.types.map((member) => required(member)))
    case "Suspend":
      return new Suspend(() => required(ast.f()))
    case "Declaration":
      throw new Error(errors_.getASTUnsupportedSchema(ast))
    case "Refinement":
      throw new Error(errors_.getASTUnsupportedSchema(ast))
    case "Transformation": {
      if (
        isTypeLiteralTransformation(ast.transformation) &&
        ast.transformation.propertySignatureTransformations.every(isRenamingPropertySignatureTransformation)
      ) {
        return new Transformation(required(ast.from), required(ast.to), ast.transformation)
      }
      throw new Error(errors_.getASTUnsupportedSchema(ast))
    }
  }
  return ast
}

/**
 * Creates a new AST with shallow mutability applied to its properties.
 *
 * @param ast - The original AST to make properties mutable (shallowly).
 *
 * @since 0.67.0
 */
export const mutable = (ast: AST): AST => {
  switch (ast._tag) {
    case "TupleType":
      return ast.isReadonly === false ? ast : new TupleType(ast.elements, ast.rest, false, ast.annotations)
    case "TypeLiteral": {
      const propertySignatures = changeMap(
        ast.propertySignatures,
        (ps) =>
          ps.isReadonly === false ? ps : new PropertySignature(ps.name, ps.type, ps.isOptional, false, ps.annotations)
      )
      const indexSignatures = changeMap(
        ast.indexSignatures,
        (is) => is.isReadonly === false ? is : new IndexSignature(is.parameter, is.type, false)
      )
      return propertySignatures === ast.propertySignatures && indexSignatures === ast.indexSignatures ?
        ast :
        new TypeLiteral(propertySignatures, indexSignatures, ast.annotations)
    }
    case "Union": {
      const types = changeMap(ast.types, mutable)
      return types === ast.types ? ast : Union.make(types, ast.annotations)
    }
    case "Suspend":
      return new Suspend(() => mutable(ast.f()), ast.annotations)
    case "Refinement": {
      const from = mutable(ast.from)
      return from === ast.from ? ast : new Refinement(from, ast.filter, ast.annotations)
    }
    case "Transformation": {
      const from = mutable(ast.from)
      const to = mutable(ast.to)
      return from === ast.from && to === ast.to ?
        ast :
        new Transformation(from, to, ast.transformation, ast.annotations)
    }
  }
  return ast
}

// -------------------------------------------------------------------------------------
// compiler harness
// -------------------------------------------------------------------------------------

/**
 * @since 0.67.0
 */
export type Compiler<A> = (ast: AST, path: ReadonlyArray<PropertyKey>) => A

/**
 * @since 0.67.0
 */
export type Match<A> = {
  [K in AST["_tag"]]: (ast: Extract<AST, { _tag: K }>, compile: Compiler<A>, path: ReadonlyArray<PropertyKey>) => A
}

/**
 * @since 0.67.0
 */
export const getCompiler = <A>(match: Match<A>): Compiler<A> => {
  const compile = (ast: AST, path: ReadonlyArray<PropertyKey>): A => match[ast._tag](ast as any, compile, path)
  return compile
}

/**
 * @since 0.67.0
 */
export const typeAST = (ast: AST): AST => {
  switch (ast._tag) {
    case "Declaration": {
      const typeParameters = changeMap(ast.typeParameters, typeAST)
      return typeParameters === ast.typeParameters ?
        ast :
        new Declaration(typeParameters, ast.decodeUnknown, ast.encodeUnknown, ast.annotations)
    }
    case "TupleType": {
      const elements = changeMap(ast.elements, (e) => {
        const type = typeAST(e.type)
        return type === e.type ? e : new OptionalType(type, e.isOptional)
      })
      const restASTs = getRestASTs(ast.rest)
      const rest = changeMap(restASTs, typeAST)
      return elements === ast.elements && rest === restASTs ?
        ast :
        new TupleType(elements, rest.map((type) => new Type(type)), ast.isReadonly, ast.annotations)
    }
    case "TypeLiteral": {
      const propertySignatures = changeMap(ast.propertySignatures, (p) => {
        const type = typeAST(p.type)
        return type === p.type ? p : new PropertySignature(p.name, type, p.isOptional, p.isReadonly)
      })
      const indexSignatures = changeMap(ast.indexSignatures, (is) => {
        const type = typeAST(is.type)
        return type === is.type ? is : new IndexSignature(is.parameter, type, is.isReadonly)
      })
      return propertySignatures === ast.propertySignatures && indexSignatures === ast.indexSignatures ?
        ast :
        new TypeLiteral(propertySignatures, indexSignatures, ast.annotations)
    }
    case "Union": {
      const types = changeMap(ast.types, typeAST)
      return types === ast.types ? ast : Union.make(types, ast.annotations)
    }
    case "Suspend":
      return new Suspend(() => typeAST(ast.f()), ast.annotations)
    case "Refinement": {
      const from = typeAST(ast.from)
      return from === ast.from ?
        ast :
        new Refinement(from, ast.filter, ast.annotations)
    }
    case "Transformation":
      return typeAST(ast.to)
  }
  return ast
}

/** @internal */
export const whiteListAnnotations =
  (annotationIds: ReadonlyArray<symbol>) => (annotated: Annotated): Annotations | undefined => {
    let out: { [_: symbol]: unknown } | undefined = undefined
    for (const id of annotationIds) {
      if (Object.prototype.hasOwnProperty.call(annotated.annotations, id)) {
        if (out === undefined) {
          out = {}
        }
        out[id] = annotated.annotations[id]
      }
    }
    return out
  }

/** @internal */
export const blackListAnnotations =
  (annotationIds: ReadonlyArray<symbol>) => (annotated: Annotated): Annotations | undefined => {
    const out = { ...annotated.annotations }
    for (const id of annotationIds) {
      delete out[id]
    }
    return out
  }

/** @internal */
export const getJSONIdentifier = (annotated: Annotated) =>
  Option.orElse(getJSONIdentifierAnnotation(annotated), () => getIdentifierAnnotation(annotated))

// To generate a JSON Schema from a recursive schema, an `identifier` annotation
// is required. So, when we calculate the encodedAST, we need to preserve the
// annotation in the form of an internal custom annotation that acts as a
// surrogate for the identifier, which the JSON Schema compiler can then read.
const createJSONIdentifierAnnotation = (annotated: Annotated): Annotations | undefined =>
  Option.match(getJSONIdentifier(annotated), {
    onNone: () => undefined,
    onSome: (identifier) => ({ [JSONIdentifierAnnotationId]: identifier })
  })

function changeMap<A>(
  as: Arr.NonEmptyReadonlyArray<A>,
  f: (a: A) => A
): Arr.NonEmptyReadonlyArray<A>
function changeMap<A>(as: ReadonlyArray<A>, f: (a: A) => A): ReadonlyArray<A>
function changeMap<A>(as: ReadonlyArray<A>, f: (a: A) => A): ReadonlyArray<A> {
  let changed = false
  const out = Arr.allocate(as.length) as Array<A>
  for (let i = 0; i < as.length; i++) {
    const a = as[i]
    const fa = f(a)
    if (fa !== a) {
      changed = true
    }
    out[i] = fa
  }
  return changed ? out : as
}

const encodedAST_ = (ast: AST, isBound: boolean): AST => {
  switch (ast._tag) {
    case "Declaration": {
      const typeParameters = changeMap(ast.typeParameters, (ast) => encodedAST_(ast, isBound))
      return typeParameters === ast.typeParameters ?
        ast :
        new Declaration(typeParameters, ast.decodeUnknown, ast.encodeUnknown, ast.annotations)
    }
    case "TupleType": {
      const elements = changeMap(ast.elements, (e) => {
        const type = encodedAST_(e.type, isBound)
        return type === e.type ? e : new OptionalType(type, e.isOptional)
      })
      const restASTs = getRestASTs(ast.rest)
      const rest = changeMap(restASTs, (ast) => encodedAST_(ast, isBound))
      return elements === ast.elements && rest === restASTs ?
        ast :
        new TupleType(
          elements,
          rest.map((ast) => new Type(ast)),
          ast.isReadonly,
          createJSONIdentifierAnnotation(ast)
        )
    }
    case "TypeLiteral": {
      const propertySignatures = changeMap(ast.propertySignatures, (ps) => {
        const type = encodedAST_(ps.type, isBound)
        return type === ps.type
          ? ps
          : new PropertySignature(ps.name, type, ps.isOptional, ps.isReadonly)
      })
      const indexSignatures = changeMap(ast.indexSignatures, (is) => {
        const type = encodedAST_(is.type, isBound)
        return type === is.type ? is : new IndexSignature(is.parameter, type, is.isReadonly)
      })
      return propertySignatures === ast.propertySignatures && indexSignatures === ast.indexSignatures ?
        ast :
        new TypeLiteral(propertySignatures, indexSignatures, createJSONIdentifierAnnotation(ast))
    }
    case "Union": {
      const types = changeMap(ast.types, (ast) => encodedAST_(ast, isBound))
      return types === ast.types ? ast : Union.make(types, createJSONIdentifierAnnotation(ast))
    }
    case "Suspend":
      return new Suspend(() => encodedAST_(ast.f(), isBound), createJSONIdentifierAnnotation(ast))
    case "Refinement": {
      const from = encodedAST_(ast.from, isBound)
      if (isBound) {
        if (from === ast.from) {
          return ast
        }
        if (!isTransformation(ast.from) && hasStableFilter(ast)) {
          return new Refinement(from, ast.filter)
        }
      }
      return from
    }
    case "Transformation":
      return encodedAST_(ast.from, isBound)
  }
  return ast
}

/**
 * @since 0.67.0
 */
export const encodedAST = (ast: AST): AST => encodedAST_(ast, false)

/**
 * @since 0.67.0
 */
export const encodedBoundAST = (ast: AST): AST => encodedAST_(ast, true)

const toJSONAnnotations = (annotations: Annotations): object => {
  const out: Record<string, unknown> = {}
  for (const k of Object.getOwnPropertySymbols(annotations)) {
    out[String(k)] = annotations[k]
  }
  return out
}

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

const sortPropertySignatures = Arr.sort(
  Order.mapInput(Number.Order, (ps: PropertySignature) => getCardinality(ps.type))
)

const sortIndexSignatures = Arr.sort(
  Order.mapInput(Number.Order, (is: IndexSignature) => {
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
    case "TupleType": {
      return [2, ast.elements.length, ast.rest.length]
    }
    case "TypeLiteral": {
      const y = ast.propertySignatures.length
      const z = ast.indexSignatures.length
      return y + z === 0 ?
        [-4, 0, 0] :
        [4, y, z]
    }
    case "Declaration": {
      const annotation = getSurrogateAnnotation(ast)
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
    case "Transformation":
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

const equalsTemplateLiteralSpan = Arr.getEquivalence<TemplateLiteralSpan>((self, that) =>
  self.type._tag === that.type._tag && self.literal === that.literal
)

const equalsEnums = Arr.getEquivalence<readonly [string, string | number]>((self, that) =>
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
    case "TupleType":
    case "TypeLiteral":
    case "Union":
    case "Suspend":
    case "Transformation":
    case "Declaration":
      return self === that
  }
}

const intersection = Arr.intersectionWith(equals)

const _keyof = (ast: AST): Array<AST> => {
  switch (ast._tag) {
    case "Declaration": {
      const annotation = getSurrogateAnnotation(ast)
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
    case "Transformation":
      return _keyof(ast.to)
  }
  throw new Error(errors_.getASTUnsupportedSchema(ast))
}

/** @internal */
export const compose = (ab: AST, cd: AST): AST => new Transformation(ab, cd, composeTransformation)

/** @internal */
export const rename = (ast: AST, mapping: { readonly [K in PropertyKey]?: PropertyKey }): AST => {
  switch (ast._tag) {
    case "TypeLiteral": {
      const propertySignatureTransformations: Array<PropertySignatureTransformation> = []
      for (const key of util_.ownKeys(mapping)) {
        const name = mapping[key]
        if (name !== undefined) {
          propertySignatureTransformations.push(
            new PropertySignatureTransformation(
              key,
              name,
              identity,
              identity
            )
          )
        }
      }
      if (propertySignatureTransformations.length === 0) {
        return ast
      }
      return new Transformation(
        ast,
        new TypeLiteral(
          ast.propertySignatures.map((ps) => {
            const name = mapping[ps.name]
            return new PropertySignature(
              name === undefined ? ps.name : name,
              typeAST(ps.type),
              ps.isOptional,
              ps.isReadonly,
              ps.annotations
            )
          }),
          ast.indexSignatures
        ),
        new TypeLiteralTransformation(propertySignatureTransformations)
      )
    }
    case "Union":
      return Union.make(ast.types.map((ast) => rename(ast, mapping)))
    case "Suspend":
      return new Suspend(() => rename(ast.f(), mapping))
    case "Transformation":
      return compose(ast, rename(typeAST(ast), mapping))
  }
  throw new Error(errors_.getASTUnsupportedRenameSchema(ast))
}

const formatKeyword = (ast: AST): string => Option.getOrElse(getExpected(ast), () => ast._tag)

const getExpected = (ast: Annotated): Option.Option<string> => {
  return getIdentifierAnnotation(ast).pipe(
    Option.orElse(() => getTitleAnnotation(ast)),
    Option.orElse(() => getDescriptionAnnotation(ast))
  )
}
