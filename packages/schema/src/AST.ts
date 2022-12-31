/**
 * @since 1.0.0
 */

import * as Order from "@fp-ts/core/typeclass/Order"
import { pipe } from "@fp-ts/data/Function"
import * as Number from "@fp-ts/data/Number"
import { isNumber } from "@fp-ts/data/Number"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import type { Predicate } from "@fp-ts/data/Predicate"
import * as RA from "@fp-ts/data/ReadonlyArray"
import { isString } from "@fp-ts/data/String"

/**
 * @category model
 * @since 1.0.0
 */
export type AST =
  | TypeAlias
  | LiteralType
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
  | Tuple
  | Struct
  | Union
  | Lazy
  | Enums
  | Refinement
  | TemplateLiteral

/**
 * @since 1.0.0
 */
export interface Annotated {
  readonly annotations: Record<string | symbol, unknown>
}

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
export const typeAlias = (
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
export type Literal = string | number | boolean | null | bigint

/**
 * @category model
 * @since 1.0.0
 */
export interface LiteralType extends Annotated {
  readonly _tag: "LiteralType"
  readonly literal: Literal
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const literalType = (
  literal: Literal,
  annotations: Annotated["annotations"] = {}
): LiteralType => ({ _tag: "LiteralType", literal, annotations })

/**
 * @category guards
 * @since 1.0.0
 */
export const isLiteralType = (ast: AST): ast is LiteralType => ast._tag === "LiteralType"

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
export const uniqueSymbol = (
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
export const undefinedKeyword: UndefinedKeyword = { _tag: "UndefinedKeyword", annotations: {} }

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
export const voidKeyword: VoidKeyword = { _tag: "VoidKeyword", annotations: {} }

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
export const neverKeyword: NeverKeyword = { _tag: "NeverKeyword", annotations: {} }

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
export const unknownKeyword: UnknownKeyword = { _tag: "UnknownKeyword", annotations: {} }

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
export const anyKeyword: AnyKeyword = { _tag: "AnyKeyword", annotations: {} }

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
export const stringKeyword: StringKeyword = { _tag: "StringKeyword", annotations: {} }

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
export const numberKeyword: NumberKeyword = { _tag: "NumberKeyword", annotations: {} }

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
export const booleanKeyword: BooleanKeyword = { _tag: "BooleanKeyword", annotations: {} }

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
export const bigIntKeyword: BigIntKeyword = { _tag: "BigIntKeyword", annotations: {} }

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
export const symbolKeyword: SymbolKeyword = { _tag: "SymbolKeyword", annotations: {} }

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
export const objectKeyword: ObjectKeyword = { _tag: "ObjectKeyword", annotations: {} }

/**
 * @since 1.0.0
 */
export interface Element extends Annotated {
  readonly type: AST
  readonly isOptional: boolean
}

/**
 * @since 1.0.0
 */
export const element = (
  type: AST,
  isOptional: boolean,
  annotations: Annotated["annotations"] = {}
): Element => ({ type, isOptional, annotations })

/**
 * @category model
 * @since 1.0.0
 */
export interface Tuple extends Annotated {
  readonly _tag: "Tuple"
  readonly elements: ReadonlyArray<Element>
  readonly rest: Option<RA.NonEmptyReadonlyArray<AST>>
  readonly isReadonly: boolean
  readonly allowUnexpected: boolean
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const tuple = (
  elements: ReadonlyArray<Element>,
  rest: Option<RA.NonEmptyReadonlyArray<AST>>,
  isReadonly: boolean,
  annotations: Annotated["annotations"] = {},
  allowUnexpected = false
): Tuple => ({ _tag: "Tuple", elements, rest, isReadonly, annotations, allowUnexpected })

/**
 * @category guards
 * @since 1.0.0
 */
export const isTuple = (ast: AST): ast is Tuple => ast._tag === "Tuple"

/**
 * @since 1.0.0
 */
export interface Field extends Annotated {
  readonly key: PropertyKey
  readonly value: AST
  readonly isOptional: boolean
  readonly isReadonly: boolean
}

/**
 * @since 1.0.0
 */
export const field = (
  key: PropertyKey,
  value: AST,
  isOptional: boolean,
  isReadonly: boolean,
  annotations: Annotated["annotations"] = {}
): Field => ({ key, value, isOptional, isReadonly, annotations })

/**
 * @since 1.0.0
 */
export interface IndexSignature extends Annotated {
  readonly key: "string" | "number" | "symbol"
  readonly value: AST
  readonly isReadonly: boolean
}

/**
 * @since 1.0.0
 */
export const indexSignature = (
  key: IndexSignature["key"],
  value: AST,
  isReadonly: boolean,
  annotations: Annotated["annotations"] = {}
): IndexSignature => ({ key, value, isReadonly, annotations })

/**
 * @category model
 * @since 1.0.0
 */
export interface Struct extends Annotated {
  readonly _tag: "Struct"
  readonly fields: ReadonlyArray<Field>
  readonly indexSignatures: ReadonlyArray<IndexSignature>
  readonly allowUnexpected: boolean
}

const getCardinality = (ast: AST): number => {
  switch (ast._tag) {
    case "TypeAlias":
      return getCardinality(ast.type)
    case "NeverKeyword":
      return 0
    case "LiteralType":
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
      return getCardinality(ast.from)
    default:
      return 5
  }
}

const sortByCardinalityAsc = RA.sort(
  pipe(Number.Order, Order.contramap(({ value }: { readonly value: AST }) => getCardinality(value)))
)

/**
 * @category constructors
 * @since 1.0.0
 */
export const struct = (
  fields: ReadonlyArray<Field>,
  indexSignatures: ReadonlyArray<IndexSignature>,
  annotations: Annotated["annotations"] = {},
  allowUnexpected = false
): Struct => ({
  _tag: "Struct",
  fields: sortByCardinalityAsc(fields),
  indexSignatures: sortByCardinalityAsc(indexSignatures),
  annotations,
  allowUnexpected
})

/**
 * @category guards
 * @since 1.0.0
 */
export const isStruct = (ast: AST): ast is Struct => ast._tag === "Struct"

/**
 * @category model
 * @since 1.0.0
 */
export interface Union extends Annotated {
  readonly _tag: "Union"
  readonly members: readonly [AST, AST, ...Array<AST>]
}

const getWeight = (ast: AST): number => {
  switch (ast._tag) {
    case "TypeAlias":
      return getWeight(ast.type)
    case "Tuple":
      return ast.elements.length + (O.isSome(ast.rest) ? 1 : 0)
    case "Struct":
      return ast.fields.length + ast.indexSignatures.length
    case "Union":
      return ast.members.reduce((n, member) => n + getWeight(member), 0)
    case "Lazy":
      return 10
    default:
      return 0
  }
}

const sortByWeightDesc = RA.sort(
  Order.reverse(pipe(Number.Order, Order.contramap(getWeight)))
)

const unify = (candidates: ReadonlyArray<AST>): ReadonlyArray<AST> => {
  let out = RA.uniq(pipe(
    candidates,
    RA.flatMap((ast: AST): ReadonlyArray<AST> => isUnion(ast) ? ast.members : [ast])
  ))
  if (out.some(isStringKeyword)) {
    out = out.filter((m) => !(isLiteralType(m) && typeof m.literal === "string"))
  }
  if (out.some(isNumberKeyword)) {
    out = out.filter((m) => !(isLiteralType(m) && typeof m.literal === "number"))
  }
  if (out.some(isSymbolKeyword)) {
    out = out.filter((m) => !isUniqueSymbol(m))
  }
  return out
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const union = (
  candidates: ReadonlyArray<AST>,
  annotations: Annotated["annotations"] = {}
): AST => {
  const members = unify(candidates)
  switch (members.length) {
    case 0:
      return neverKeyword
    case 1:
      return members[0]
    default: {
      // @ts-expect-error (TypeScript doesn't know that `members` has >= 2 elements after sorting)
      return { _tag: "Union", members: sortByWeightDesc(members), annotations }
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
export const lazy = (f: () => AST, annotations: Annotated["annotations"] = {}): Lazy => ({
  _tag: "Lazy",
  f,
  annotations
})

/**
 * @category guards
 * @since 1.0.0
 */
export const isLazy = (ast: AST): ast is Lazy => ast._tag === "Lazy"

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
export const enums = (
  enums: ReadonlyArray<readonly [string, string | number]>,
  annotations: Annotated["annotations"] = {}
): Enums => ({ _tag: "Enums", enums, annotations })

/**
 * @category model
 * @since 1.0.0
 */
export interface Refinement extends Annotated {
  readonly _tag: "Refinement"
  readonly from: AST
  readonly refinement: Predicate<any>
  readonly meta: unknown
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const refinement = (
  from: AST,
  refinement: Predicate<any>,
  meta: unknown,
  annotations: Annotated["annotations"] = {}
): Refinement => ({ _tag: "Refinement", from, refinement, meta, annotations })

/**
 * @since 1.0.0
 */
export interface TemplateLiteralSpan {
  readonly type: StringKeyword
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
export const templateLiteral = (
  head: string,
  spans: ReadonlyArray<TemplateLiteralSpan>,
  annotations: Annotated["annotations"] = {}
): TemplateLiteral | LiteralType =>
  RA.isNonEmpty(spans) ? { _tag: "TemplateLiteral", head, spans, annotations } : literalType(head)

/**
 * @since 1.0.0
 */
export const annotations = (ast: AST, annotations: Annotated["annotations"] = {}): AST => ({
  ...ast,
  annotations: { ...ast.annotations, ...annotations }
})

/**
 * @since 1.0.0
 */
export const appendRestElement = (
  ast: Tuple,
  restElement: AST,
  annotations: Annotated["annotations"] = {}
): Tuple => {
  if (O.isSome(ast.rest)) {
    // example: `type A = [...string[], ...number[]]` is illegal
    throw new Error("A rest element cannot follow another rest element. ts(1265)")
  }
  return tuple(ast.elements, O.some([restElement]), ast.isReadonly, annotations)
}

/**
 * @since 1.0.0
 */
export const appendElement = (
  ast: Tuple,
  newElement: Element,
  annotations: Annotated["annotations"] = {}
): Tuple => {
  if (ast.elements.some((e) => e.isOptional) && !newElement.isOptional) {
    throw new Error("A required element cannot follow an optional element. ts(1257)")
  }
  return pipe(
    ast.rest,
    O.match(
      () => tuple([...ast.elements, newElement], O.none, ast.isReadonly, annotations),
      (rest) => {
        if (newElement.isOptional) {
          throw new Error("An optional element cannot follow a rest element. ts(1266)")
        }
        return tuple(ast.elements, O.some([...rest, newElement.type]), ast.isReadonly, annotations)
      }
    )
  )
}

const getPropertyKeyKeyof = (key: PropertyKey): AST =>
  typeof key === "symbol" ? uniqueSymbol(key) : literalType(key)

const getIndexSignatureKeyof = (is: IndexSignature): AST => {
  if (is.key === "symbol") {
    return symbolKeyword
  } else if (is.key === "number") {
    return numberKeyword
  }
  // type A = { [x: string]: string }
  // type K = keyof A // string | number
  return union([stringKeyword, numberKeyword])
}

const _keyof = (ast: AST): ReadonlyArray<AST> => {
  switch (ast._tag) {
    case "TypeAlias":
      return _keyof(ast.type)
    case "NeverKeyword":
    case "AnyKeyword":
      return [stringKeyword, numberKeyword, symbolKeyword]
    case "Struct": {
      return [
        ...ast.fields.map((
          f
        ) => getPropertyKeyKeyof(f.key)),
        ...ast.indexSignatures.map(getIndexSignatureKeyof)
      ]
    }
    case "Union": {
      let out: ReadonlyArray<AST> = _keyof(ast.members[0])
      for (let i = 1; i < ast.members.length; i++) {
        out = RA.intersection(_keyof(ast.members[i]))(out)
      }
      return out
    }
    case "Lazy":
      return _keyof(ast.f())
    case "Refinement":
      return _keyof(ast.from)
    case "LiteralType":
    case "StringKeyword":
    case "Tuple":
      throw new Error("cannot compute `keyof` on this AST")
    default:
      return [neverKeyword]
  }
}

/**
 * @since 1.0.0
 */
export const keyof = (ast: AST): AST => union(_keyof(ast))

/**
 * @since 1.0.0
 */
export const record = (key: AST, value: AST, isReadonly: boolean): Struct => {
  const fields: Array<Field> = []
  const indexSignatures: Array<IndexSignature> = []
  const go = (key: AST): void => {
    switch (key._tag) {
      case "NeverKeyword":
        break
      case "StringKeyword": {
        indexSignatures.push(indexSignature("string", value, isReadonly))
        break
      }
      case "NumberKeyword": {
        indexSignatures.push(indexSignature("number", value, isReadonly))
        break
      }
      case "SymbolKeyword": {
        indexSignatures.push(indexSignature("symbol", value, isReadonly))
        break
      }
      case "LiteralType":
        if (isString(key.literal) || isNumber(key.literal)) {
          fields.push(field(key.literal, value, false, isReadonly))
        }
        break
      case "UniqueSymbol":
        fields.push(field(key.symbol, value, false, isReadonly))
        break
      case "Union":
        key.members.forEach(go)
        break
      case "Refinement":
        throw new Error("cannot handle refinements in `record`")
      default:
        throw new Error(
          `Type '${key._tag}' does not satisfy the constraint 'string | number | symbol'. ts(2344)`
        )
    }
  }
  go(key)
  return struct(fields, indexSignatures)
}

/**
 * @since 1.0.0
 */
export const propertyKeys = (ast: AST): ReadonlyArray<PropertyKey> => {
  switch (ast._tag) {
    case "TypeAlias":
      return propertyKeys(ast.type)
    case "Tuple":
      return ast.elements.map((_, i) => String(i))
    case "Struct":
      return ast.fields.map((field) => field.key)
    case "Union": {
      let out: ReadonlyArray<PropertyKey> = propertyKeys(ast.members[0])
      for (let i = 1; i < ast.members.length; i++) {
        out = RA.intersection(propertyKeys(ast.members[i]))(out)
      }
      return out
    }
    case "Lazy":
      return propertyKeys(ast.f())
    default:
      return []
  }
}

/**
 * @since 1.0.0
 */
export const pick = (ast: AST, keys: ReadonlyArray<PropertyKey>): Struct => {
  return struct(getFields(ast).filter((field) => keys.includes(field.key)), [])
}

/**
 * @since 1.0.0
 */
export const omit = (ast: AST, keys: ReadonlyArray<PropertyKey>): Struct => {
  return struct(getFields(ast).filter((field) => !keys.includes(field.key)), [])
}

/**
 * @since 1.0.0
 */
export const getFields = (
  ast: AST
): ReadonlyArray<Field> => {
  switch (ast._tag) {
    case "TypeAlias":
      return getFields(ast.type)
    case "Tuple":
      return ast.elements.map((element, i) =>
        field(i, element.type, element.isOptional, ast.isReadonly)
      )
    case "Struct":
      return ast.fields
    case "Union": {
      const fields = pipe(ast.members, RA.flatMap(getFields))
      return propertyKeys(ast).map((key) => {
        let isOptional = false
        let isReadonly = false
        const type = union(
          fields.filter((field) => field.key === key).map((field) => {
            if (field.isReadonly) {
              isReadonly = true
            }
            if (field.isOptional) {
              isOptional = true
            }
            return field.value
          })
        )
        return field(key, type, isOptional, isReadonly)
      })
    }
    case "Lazy":
      return getFields(ast.f())
    case "Refinement":
      return getFields(ast.from)
    default:
      return []
  }
}

/**
 * @since 1.0.0
 */
export const partial = (ast: AST): AST => {
  switch (ast._tag) {
    case "TypeAlias":
      return partial(ast.type)
    case "Tuple":
      return tuple(
        ast.elements.map((e) => element(e.type, true)),
        pipe(
          ast.rest,
          O.map((rest) => [union([...rest, undefinedKeyword])])
        ),
        ast.isReadonly
      )
    case "Struct":
      return struct(
        ast.fields.map((f) => field(f.key, f.value, true, f.isReadonly, f.annotations)),
        ast.indexSignatures
      )
    case "Union":
      return union(ast.members.map((member) => partial(member)))
    case "Lazy":
      return lazy(() => partial(ast.f()))
    case "Refinement":
      return partial(ast.from)
    default:
      return ast
  }
}
