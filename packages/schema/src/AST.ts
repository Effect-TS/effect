/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/core/Function"
import * as Number from "@fp-ts/core/Number"
import { isNumber } from "@fp-ts/core/Number"
import type { Option } from "@fp-ts/core/Option"
import * as O from "@fp-ts/core/Option"
import type { Predicate } from "@fp-ts/core/Predicate"
import * as RA from "@fp-ts/core/ReadonlyArray"
import { isString } from "@fp-ts/core/String"
import * as Order from "@fp-ts/core/typeclass/Order"
import { TitleId } from "@fp-ts/schema/annotation/AST"
import type { ParseResult } from "@fp-ts/schema/ParseResult"

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @category model
 * @since 1.0.0
 */
export type AST =
  | TypeAlias
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
  | Tuple
  | TypeLiteral
  | Union
  | Lazy
  | Refinement
  | Transform

/**
 * @since 1.0.0
 */
export interface Annotated {
  readonly annotations: Record<string | symbol, unknown>
}

/**
 * @since 1.0.0
 */
export const getAnnotation = <A>(key: PropertyKey) =>
  (annotated: Annotated): O.Option<A> =>
    Object.prototype.hasOwnProperty.call(annotated.annotations, key) ?
      O.some(annotated.annotations[key] as any) :
      O.none()

/**
 * @category model
 * @since 1.0.0
 */
export interface TypeAlias extends Annotated {
  readonly _tag: "TypeAlias"
  readonly typeParameters: ReadonlyArray<AST>
  readonly type: AST
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const createTypeAlias = (
  typeParameters: ReadonlyArray<AST>,
  type: AST,
  annotations: Annotated["annotations"] = {}
): TypeAlias => ({ _tag: "TypeAlias", typeParameters, type, annotations })

/**
 * @category guards
 * @since 1.0.0
 */
export const isTypeAlias = (ast: AST): ast is TypeAlias => ast._tag === "TypeAlias"

/**
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
  literal: LiteralValue
): Literal => ({ _tag: "Literal", literal, annotations: {} })

/**
 * @category guards
 * @since 1.0.0
 */
export const isLiteral = (ast: AST): ast is Literal => ast._tag === "Literal"

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
    [TitleId]: "undefined"
  }
}

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
    [TitleId]: "void"
  }
}

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
    [TitleId]: "never"
  }
}

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
    [TitleId]: "unknown"
  }
}

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
    [TitleId]: "any"
  }
}

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
    [TitleId]: "string"
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
    [TitleId]: "number"
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
    [TitleId]: "boolean"
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
    [TitleId]: "bigint"
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
    [TitleId]: "symbol"
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
    [TitleId]: "object"
  }
}

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
  enums: ReadonlyArray<readonly [string, string | number]>
): Enums => ({ _tag: "Enums", enums, annotations: {} })

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
  readonly spans: RA.NonEmptyReadonlyArray<TemplateLiteralSpan>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const createTemplateLiteral = (
  head: string,
  spans: ReadonlyArray<TemplateLiteralSpan>
): TemplateLiteral | Literal =>
  RA.isNonEmpty(spans) ?
    { _tag: "TemplateLiteral", head, spans, annotations: {} } :
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
  readonly rest: Option<RA.NonEmptyReadonlyArray<AST>>
  readonly isReadonly: boolean
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const createTuple = (
  elements: ReadonlyArray<Element>,
  rest: Option<RA.NonEmptyReadonlyArray<AST>>,
  isReadonly: boolean,
  annotations: Annotated["annotations"] = {}
): Tuple => ({
  _tag: "Tuple",
  elements,
  rest,
  isReadonly,
  annotations
})

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
export interface IndexSignature {
  readonly parameter: StringKeyword | SymbolKeyword | TemplateLiteral | Refinement
  readonly type: AST
  readonly isReadonly: boolean
}

/**
 * @since 1.0.0
 */
export const createIndexSignature = (
  parameter: StringKeyword | SymbolKeyword | TemplateLiteral | Refinement,
  type: AST,
  isReadonly: boolean
): IndexSignature => ({ parameter, type, isReadonly })

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
): TypeLiteral => ({
  _tag: "TypeLiteral",
  propertySignatures: sortByCardinalityAsc(propertySignatures),
  indexSignatures: sortByCardinalityAsc(indexSignatures),
  annotations
})

/**
 * @category guards
 * @since 1.0.0
 */
export const isTypeLiteral = (ast: AST): ast is TypeLiteral => ast._tag === "TypeLiteral"

/**
 * @category model
 * @since 1.0.0
 */
export interface Union extends Annotated {
  readonly _tag: "Union"
  readonly types: readonly [AST, AST, ...Array<AST>]
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const createUnion = (
  candidates: ReadonlyArray<AST>,
  annotations: Annotated["annotations"] = {}
): AST => {
  const types = unify(candidates)
  switch (types.length) {
    case 0:
      return neverKeyword
    case 1:
      return types[0]
    default: {
      return { _tag: "Union", types: sortByWeightDesc(types) as any, annotations }
    }
  }
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
export interface Lazy extends Annotated {
  readonly _tag: "Lazy"
  readonly f: () => AST
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const createLazy = (
  f: () => AST,
  annotations: Annotated["annotations"] = {}
): Lazy => ({ _tag: "Lazy", f, annotations })

/**
 * @category guards
 * @since 1.0.0
 */
export const isLazy = (ast: AST): ast is Lazy => ast._tag === "Lazy"

/**
 * @category model
 * @since 1.0.0
 */
export interface Refinement extends Annotated {
  readonly _tag: "Refinement"
  readonly from: AST
  readonly refinement: Predicate<any>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const createRefinement = (
  from: AST,
  refinement: Predicate<any>,
  annotations: Annotated["annotations"] = {}
): Refinement => ({ _tag: "Refinement", from, refinement, annotations })

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
  readonly isUnexpectedAllowed?: boolean
  readonly allErrors?: boolean
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Transform extends Annotated {
  readonly _tag: "Transform"
  readonly from: AST
  readonly to: AST
  readonly decode: (input: any, options?: ParseOptions) => ParseResult<any>
  readonly encode: (input: any, options?: ParseOptions) => ParseResult<any>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const createTransform = (
  from: AST,
  to: AST,
  decode: Transform["decode"],
  encode: Transform["encode"]
): Transform => ({ _tag: "Transform", from, to, decode, encode, annotations: {} })

/**
 * @category guards
 * @since 1.0.0
 */
export const isTransform = (ast: AST): ast is Transform => ast._tag === "Transform"

// -------------------------------------------------------------------------------------
// API
// -------------------------------------------------------------------------------------

/**
 * Adds a group of annotations, potentially overwriting existing annotations.
 *
 * @since 1.0.0
 */
export const mergeAnnotations = (ast: AST, annotations: Annotated["annotations"]) => ({
  ...ast,
  annotations: { ...ast.annotations, ...annotations }
})

/**
 * Adds an annotation, potentially overwriting the existing annotation with the specified id.
 *
 * @since 1.0.0
 */
export const setAnnotation = (ast: AST, id: PropertyKey, value: unknown) => ({
  ...ast,
  annotations: { ...ast.annotations, [id]: value }
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
  if (O.isSome(ast.rest)) {
    // example: `type A = [...string[], ...number[]]` is illegal
    throw new Error("A rest element cannot follow another rest element. ts(1265)")
  }
  return createTuple(ast.elements, O.some([restElement]), ast.isReadonly)
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
    O.match(
      () => createTuple([...ast.elements, newElement], O.none(), ast.isReadonly),
      (rest) => {
        if (newElement.isOptional) {
          throw new Error("An optional element cannot follow a rest element. ts(1266)")
        }
        return createTuple(ast.elements, O.some([...rest, newElement.type]), ast.isReadonly)
      }
    )
  )
}

/**
 * Equivalent at runtime to the TypeScript type-level `keyof` operator.
 *
 * @since 1.0.0
 */
export const keyof = (ast: AST): AST => createUnion(_keyof(ast))

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
      case "TypeAlias":
        go(key.type)
        break
      case "NeverKeyword":
        break
      case "StringKeyword":
      case "SymbolKeyword":
      case "TemplateLiteral":
      case "Refinement":
        indexSignatures.push(createIndexSignature(key, value, isReadonly))
        break
      case "Literal":
        if (isString(key.literal) || isNumber(key.literal)) {
          propertySignatures.push(createPropertySignature(key.literal, value, false, isReadonly))
        }
        break
      case "UniqueSymbol":
        propertySignatures.push(createPropertySignature(key.symbol, value, false, isReadonly))
        break
      case "Union":
        key.types.forEach(go)
        break
      default:
        throw new Error(`createRecord: Unsupported key ${key._tag}`)
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
export const pick = (ast: AST, keys: ReadonlyArray<PropertyKey>): TypeLiteral => {
  return createTypeLiteral(_getPropertySignatures(ast).filter((ps) => keys.includes(ps.name)), [])
}

/**
 * Equivalent at runtime to the built-in TypeScript utility type `Omit`.
 *
 * @since 1.0.0
 */
export const omit = (ast: AST, keys: ReadonlyArray<PropertyKey>): TypeLiteral => {
  return createTypeLiteral(_getPropertySignatures(ast).filter((ps) => !keys.includes(ps.name)), [])
}

/**
 * Equivalent at runtime to the built-in TypeScript utility type `Partial`.
 *
 * @since 1.0.0
 */
export const partial = (ast: AST): AST => {
  switch (ast._tag) {
    case "TypeAlias":
      return partial(ast.type)
    case "Tuple":
      return createTuple(
        ast.elements.map((e) => createElement(e.type, true)),
        pipe(
          ast.rest,
          O.map((rest) => [createUnion([...rest, undefinedKeyword])])
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
    case "Lazy":
      return createLazy(() => partial(ast.f()))
    case "Refinement":
      return partial(ast.from)
    case "Transform":
      return partial(ast.to)
    default:
      return ast
  }
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

// -------------------------------------------------------------------------------------
// internal
// -------------------------------------------------------------------------------------

/** @internal */
export const _getCardinality = (ast: AST): number => {
  switch (ast._tag) {
    case "TypeAlias":
      return _getCardinality(ast.type)
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
      return 4
    case "UnknownKeyword":
    case "AnyKeyword":
      return 6
    case "Refinement":
      return _getCardinality(ast.from)
    case "Transform":
      return _getCardinality(ast.to)
    default:
      return 5
  }
}

const sortByCardinalityAsc = RA.sort(
  pipe(Number.Order, Order.contramap(({ type }: { readonly type: AST }) => _getCardinality(type)))
)

/** @internal */
export const _getWeight = (ast: AST): number => {
  switch (ast._tag) {
    case "TypeAlias":
      return _getWeight(ast.type)
    case "Tuple":
      return ast.elements.length + (O.isSome(ast.rest) ? ast.rest.value.length : 0)
    case "TypeLiteral":
      return ast.propertySignatures.length + ast.indexSignatures.length
    case "Union":
      return ast.types.reduce((n, member) => n + _getWeight(member), 0)
    case "Lazy":
      return 10
    case "Refinement":
      return _getWeight(ast.from)
    case "Transform":
      return _getWeight(ast.to)
    default:
      return 0
  }
}

const sortByWeightDesc = RA.sort(
  Order.reverse(pipe(Number.Order, Order.contramap(_getWeight)))
)

const unify = (candidates: ReadonlyArray<AST>): ReadonlyArray<AST> => {
  let out = pipe(
    candidates,
    RA.flatMap((ast: AST): ReadonlyArray<AST> => {
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
  if (out.some(isStringKeyword)) {
    out = out.filter((m) => !(isLiteral(m) && typeof m.literal === "string"))
  }
  if (out.some(isNumberKeyword)) {
    out = out.filter((m) => !(isLiteral(m) && typeof m.literal === "number"))
  }
  if (out.some(isBooleanKeyword)) {
    out = out.filter((m) => !(isLiteral(m) && typeof m.literal === "boolean"))
  }
  if (out.some(isBigIntKeyword)) {
    out = out.filter((m) => !(isLiteral(m) && typeof m.literal === "bigint"))
  }
  if (out.some(isSymbolKeyword)) {
    out = out.filter((m) => !isUniqueSymbol(m))
  }
  return out
}

/** @internal */
export const _getParameter = (
  x: IndexSignature["parameter"]
): StringKeyword | SymbolKeyword | TemplateLiteral =>
  isRefinement(x) ? _getParameter(x.from as any) : x

const _keyof = (ast: AST): ReadonlyArray<AST> => {
  switch (ast._tag) {
    case "TypeAlias":
      return _keyof(ast.type)
    case "NeverKeyword":
    case "AnyKeyword":
      return [stringKeyword, numberKeyword, symbolKeyword]
    case "StringKeyword":
      return [createLiteral("length")]
    case "TypeLiteral":
      return ast.propertySignatures.map((p): AST =>
        typeof p.name === "symbol" ? createUniqueSymbol(p.name) : createLiteral(p.name)
      ).concat(ast.indexSignatures.map((is) => _getParameter(is.parameter)))
    case "Union": {
      return _getPropertySignatures(ast).map((p): AST =>
        typeof p.name === "symbol" ? createUniqueSymbol(p.name) : createLiteral(p.name)
      )
    }
    case "Lazy":
      return _keyof(ast.f())
    case "Refinement":
      return _keyof(ast.from)
    case "Transform":
      return _keyof(ast.to)
    default:
      return []
  }
}

/** @internal */
export const _getPropertySignatures = (
  ast: AST
): ReadonlyArray<PropertySignature> => {
  switch (ast._tag) {
    case "TypeAlias":
      return _getPropertySignatures(ast.type)
    case "Tuple":
      return ast.elements.map((element, i) =>
        createPropertySignature(i, element.type, element.isOptional, ast.isReadonly)
      )
    case "TypeLiteral":
      return ast.propertySignatures
    case "Union": {
      const propertySignatures = ast.types.map(_getPropertySignatures)
      return pipe(
        propertySignatures[0],
        RA.filterMap(({ name }) => {
          if (propertySignatures.every((ps) => ps.some((p) => p.name === name))) {
            const members = pipe(
              propertySignatures,
              RA.flatMap((ps) => ps.filter((p) => p.name === name))
            )
            return O.some(createPropertySignature(
              name,
              createUnion(members.map((p) => p.type)),
              members.some((p) => p.isOptional),
              members.some((p) => p.isReadonly)
            ))
          }
          return O.none()
        })
      )
    }
    case "Lazy":
      return _getPropertySignatures(ast.f())
    case "Refinement":
      return _getPropertySignatures(ast.from)
    case "Transform":
      return _getPropertySignatures(ast.to)
    default:
      return []
  }
}
