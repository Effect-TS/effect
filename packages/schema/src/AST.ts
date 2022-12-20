/**
 * @since 1.0.0
 */

import * as Order from "@fp-ts/core/typeclass/Order"
import { pipe } from "@fp-ts/data/Function"
import * as Number from "@fp-ts/data/Number"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import * as RA from "@fp-ts/data/ReadonlyArray"
import type { Provider } from "@fp-ts/schema/Provider"

/**
 * @since 1.0.0
 */
export type AST =
  | TypeAliasDeclaration
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
  | Tuple
  | Struct
  | Union
  | Lazy
  | Enums

/**
 * @since 1.0.0
 */
export interface Annotated {
  readonly annotations: ReadonlyArray<unknown>
}

/**
 * @since 1.0.0
 */
export interface TypeAliasDeclaration extends Annotated {
  readonly _tag: "TypeAliasDeclaration"
  readonly id: unknown
  readonly config: Option<unknown>
  readonly provider: Provider
  readonly typeParameters: ReadonlyArray<AST>
  readonly type: AST
}

/**
 * @since 1.0.0
 */
export const typeAliasDeclaration = (
  id: unknown,
  config: Option<unknown>,
  provider: Provider,
  typeParameters: ReadonlyArray<AST>,
  type: AST,
  annotations: ReadonlyArray<unknown>
): TypeAliasDeclaration => ({
  _tag: "TypeAliasDeclaration",
  id,
  config,
  provider,
  typeParameters,
  type,
  annotations
})

/**
 * @since 1.0.0
 */
export const isTypeAliasDeclaration = (ast: AST): ast is TypeAliasDeclaration =>
  ast._tag === "TypeAliasDeclaration"

/**
 * @since 1.0.0
 */
export type Literal = string | number | boolean | null | bigint

/**
 * @since 1.0.0
 */
export interface LiteralType extends Annotated {
  readonly _tag: "LiteralType"
  readonly literal: Literal
}

/**
 * @since 1.0.0
 */
export const literalType = (
  literal: Literal,
  annotations: ReadonlyArray<unknown>
): LiteralType => ({
  _tag: "LiteralType",
  literal,
  annotations
})

/**
 * @since 1.0.0
 */
export const isLiteralType = (ast: AST): ast is LiteralType => ast._tag === "LiteralType"

export interface UniqueSymbol extends Annotated {
  readonly _tag: "UniqueSymbol"
  readonly symbol: symbol
}

/**
 * @since 1.0.0
 */
export const uniqueSymbol = (
  symbol: symbol,
  annotations: ReadonlyArray<unknown>
): UniqueSymbol => ({
  _tag: "UniqueSymbol",
  symbol,
  annotations
})

/**
 * @since 1.0.0
 */
export interface UndefinedKeyword extends Annotated {
  readonly _tag: "UndefinedKeyword"
}

/**
 * @since 1.0.0
 */
export const undefinedKeyword = (annotations: ReadonlyArray<unknown>): UndefinedKeyword => ({
  _tag: "UndefinedKeyword",
  annotations
})

/**
 * @since 1.0.0
 */
export interface VoidKeyword extends Annotated {
  readonly _tag: "VoidKeyword"
}

/**
 * @since 1.0.0
 */
export const voidKeyword = (annotations: ReadonlyArray<unknown>): VoidKeyword => ({
  _tag: "VoidKeyword",
  annotations
})

/**
 * @since 1.0.0
 */
export interface NeverKeyword extends Annotated {
  readonly _tag: "NeverKeyword"
}

/**
 * @since 1.0.0
 */
export const neverKeyword = (annotations: ReadonlyArray<unknown>): NeverKeyword => ({
  _tag: "NeverKeyword",
  annotations
})

/**
 * @since 1.0.0
 */
export interface UnknownKeyword extends Annotated {
  readonly _tag: "UnknownKeyword"
}

/**
 * @since 1.0.0
 */
export const unknownKeyword = (annotations: ReadonlyArray<unknown>): UnknownKeyword => ({
  _tag: "UnknownKeyword",
  annotations
})

/**
 * @since 1.0.0
 */
export interface AnyKeyword extends Annotated {
  readonly _tag: "AnyKeyword"
}

/**
 * @since 1.0.0
 */
export const anyKeyword = (annotations: ReadonlyArray<unknown>): AnyKeyword => ({
  _tag: "AnyKeyword",
  annotations
})

/**
 * @since 1.0.0
 */
export interface StringKeyword extends Annotated {
  readonly _tag: "StringKeyword"
}

/**
 * @since 1.0.0
 */
export const stringKeyword = (annotations: ReadonlyArray<unknown>): StringKeyword => ({
  _tag: "StringKeyword",
  annotations
})

/**
 * @since 1.0.0
 */
export interface NumberKeyword extends Annotated {
  readonly _tag: "NumberKeyword"
}

/**
 * @since 1.0.0
 */
export const numberKeyword = (annotations: ReadonlyArray<unknown>): NumberKeyword => ({
  _tag: "NumberKeyword",
  annotations
})

/**
 * @since 1.0.0
 */
export interface BooleanKeyword extends Annotated {
  readonly _tag: "BooleanKeyword"
}

/**
 * @since 1.0.0
 */
export const booleanKeyword = (annotations: ReadonlyArray<unknown>): BooleanKeyword => ({
  _tag: "BooleanKeyword",
  annotations
})

/**
 * @since 1.0.0
 */
export interface BigIntKeyword extends Annotated {
  readonly _tag: "BigIntKeyword"
}

/**
 * @since 1.0.0
 */
export const bigIntKeyword = (annotations: ReadonlyArray<unknown>): BigIntKeyword => ({
  _tag: "BigIntKeyword",
  annotations
})

/**
 * @since 1.0.0
 */
export interface SymbolKeyword extends Annotated {
  readonly _tag: "SymbolKeyword"
}

/**
 * @since 1.0.0
 */
export const symbolKeyword = (annotations: ReadonlyArray<unknown>): SymbolKeyword => ({
  _tag: "SymbolKeyword",
  annotations
})

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
  annotations: ReadonlyArray<unknown>
): Element => ({ type, isOptional, annotations })

/**
 * @since 1.0.0
 */
export interface Tuple extends Annotated {
  readonly _tag: "Tuple"
  readonly elements: ReadonlyArray<Element>
  readonly rest: Option<RA.NonEmptyReadonlyArray<AST>>
  readonly isReadonly: boolean
}

/**
 * @since 1.0.0
 */
export const tuple = (
  elements: ReadonlyArray<Element>,
  rest: Option<RA.NonEmptyReadonlyArray<AST>>,
  isReadonly: boolean,
  annotations: ReadonlyArray<unknown>
): Tuple => ({ _tag: "Tuple", elements, rest, isReadonly, annotations })

/**
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
  annotations: ReadonlyArray<unknown>
): Field => ({ key, value, isOptional, isReadonly, annotations })

/**
 * @since 1.0.0
 */
export interface IndexSignature extends Annotated {
  readonly key: "string" | "symbol"
  readonly value: AST
  readonly isReadonly: boolean
}

/**
 * @since 1.0.0
 */
export const indexSignature = (
  key: "string" | "symbol",
  value: AST,
  isReadonly: boolean,
  annotations: ReadonlyArray<unknown>
): IndexSignature => ({ key, value, isReadonly, annotations })

/**
 * @since 1.0.0
 */
export interface Struct extends Annotated {
  readonly _tag: "Struct"
  readonly fields: ReadonlyArray<Field>
  readonly indexSignatures: ReadonlyArray<IndexSignature>
}

const getCardinality = (ast: AST): number => {
  switch (ast._tag) {
    case "TypeAliasDeclaration":
      return getCardinality(ast.type)
    case "NeverKeyword":
      return 0
    case "LiteralType":
    case "UndefinedKeyword":
    case "UniqueSymbol":
      return 1
    case "BooleanKeyword":
      return 2
    case "StringKeyword":
    case "NumberKeyword":
    case "BigIntKeyword":
    case "SymbolKeyword":
      return 3
    case "UnknownKeyword":
    case "AnyKeyword":
      return 4
    default:
      return 5
  }
}

const sortByCardinalityAsc = RA.sort(
  pipe(Number.Order, Order.contramap(({ value }: { readonly value: AST }) => getCardinality(value)))
)

/**
 * @since 1.0.0
 */
export const struct = (
  fields: ReadonlyArray<Field>,
  indexSignatures: ReadonlyArray<IndexSignature>,
  annotations: ReadonlyArray<unknown>
): Struct => ({
  _tag: "Struct",
  fields: sortByCardinalityAsc(fields),
  indexSignatures: sortByCardinalityAsc(indexSignatures),
  annotations
})

/**
 * @since 1.0.0
 */
export const isStruct = (ast: AST): ast is Struct => ast._tag === "Struct"

/**
 * @since 1.0.0
 */
export interface Union extends Annotated {
  readonly _tag: "Union"
  readonly members: readonly [AST, AST, ...Array<AST>]
}

const getWeight = (ast: AST): number => {
  switch (ast._tag) {
    case "TypeAliasDeclaration":
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

/**
 * @since 1.0.0
 */
export const union = (candidates: ReadonlyArray<AST>, annotations: ReadonlyArray<unknown>): AST => {
  const uniq = RA.uniq(pipe(
    candidates,
    RA.flatMap((ast: AST): ReadonlyArray<AST> => isUnion(ast) ? ast.members : [ast])
  ))
  switch (uniq.length) {
    case 0:
      return neverKeyword(annotations)
    case 1:
      return uniq[0]
    default: {
      // @ts-expect-error (TypeScript doesn't know that `members` has >= 2 elements after sorting)
      return { _tag: "Union", members: sortByWeightDesc(uniq), annotations }
    }
  }
}

/**
 * @since 1.0.0
 */
export const isUnion = (ast: AST): ast is Union => ast._tag === "Union"

/**
 * @since 1.0.0
 */
export interface Lazy extends Annotated {
  readonly _tag: "Lazy"
  readonly f: () => AST
}

/**
 * @since 1.0.0
 */
export const lazy = (f: () => AST, annotations: ReadonlyArray<unknown>): Lazy => ({
  _tag: "Lazy",
  f,
  annotations
})

/**
 * @since 1.0.0
 */
export const isLazy = (ast: AST): ast is Lazy => ast._tag === "Lazy"

/**
 * @since 1.0.0
 */
export interface Enums extends Annotated {
  readonly _tag: "Enums"
  readonly enums: ReadonlyArray<readonly [string, string | number]>
}

/**
 * @since 1.0.0
 */
export const enums = (
  enums: ReadonlyArray<readonly [string, string | number]>,
  annotations: ReadonlyArray<unknown>
): Enums => ({
  _tag: "Enums",
  enums,
  annotations
})

/**
 * @since 1.0.0
 */
export const prependAnnotation = (ast: AST, annotation: unknown): AST => ({
  ...ast,
  annotations: pipe(ast.annotations, RA.prepend(annotation))
})

/**
 * @since 1.0.0
 */
export const appendRestElement = (
  ast: Tuple,
  restElement: AST,
  annotations: ReadonlyArray<unknown>
): Tuple => {
  const rest: RA.NonEmptyReadonlyArray<AST> = pipe(
    ast.rest,
    O.match(
      () => [restElement],
      // if `ast` already contains a rest element merge them into a union
      (rest) => [union([...rest, restElement], [])]
    )
  )
  return tuple(ast.elements, O.some(rest), ast.isReadonly, annotations)
}

/**
 * @since 1.0.0
 */
export const appendElement = (
  ast: Tuple,
  element: Element,
  annotations: ReadonlyArray<unknown>
): Tuple => {
  if (ast.elements.some((e) => e.isOptional) && !element.isOptional) {
    throw new Error("A required element cannot follow an optional element. ts(1257)")
  }
  return pipe(
    ast.rest,
    O.match(
      () => tuple([...ast.elements, element], O.none, ast.isReadonly, annotations),
      (rest) => {
        if (element.isOptional) {
          throw new Error("An optional element cannot follow a rest element. ts(1266)")
        }
        return tuple(ast.elements, O.some([...rest, element.type]), ast.isReadonly, annotations)
      }
    )
  )
}

/**
 * @since 1.0.0
 */
export const keyof = (ast: AST): ReadonlyArray<PropertyKey> => {
  switch (ast._tag) {
    case "TypeAliasDeclaration":
      return keyof(ast.type)
    case "Tuple":
      return ast.elements.map((_, i) => String(i))
    case "Struct":
      return ast.fields.map((field) => field.key)
    case "Union": {
      let out: ReadonlyArray<PropertyKey> = keyof(ast.members[0])
      for (let i = 1; i < ast.members.length; i++) {
        out = RA.intersection(keyof(ast.members[i]))(out)
      }
      return out
    }
    case "Lazy":
      return keyof(ast.f())
    default:
      return []
  }
}

/**
 * @since 1.0.0
 */
export const pick = (
  ast: AST,
  keys: ReadonlyArray<PropertyKey>,
  annotations: ReadonlyArray<unknown>
): Struct => {
  return struct(
    getFields(ast).filter((field) => keys.includes(field.key)),
    [],
    annotations
  )
}

/**
 * @since 1.0.0
 */
export const omit = (
  ast: AST,
  keys: ReadonlyArray<PropertyKey>,
  annotations: ReadonlyArray<unknown>
): Struct => {
  return struct(
    getFields(ast).filter((field) => !keys.includes(field.key)),
    [],
    annotations
  )
}

/**
 * @since 1.0.0
 */
export const getFields = (
  ast: AST
): ReadonlyArray<Field> => {
  switch (ast._tag) {
    case "TypeAliasDeclaration":
      return getFields(ast.type)
    case "Tuple":
      return ast.elements.map((element, i) =>
        field(i, element.type, element.isOptional, ast.isReadonly, [])
      )
    case "Struct":
      return ast.fields
    case "Union": {
      const fields = pipe(ast.members, RA.flatMap(getFields))
      return keyof(ast).map((key) => {
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
          }),
          []
        )
        return field(key, type, isOptional, isReadonly, [])
      })
    }
    case "Lazy":
      return getFields(ast.f())
    default:
      return []
  }
}

/**
 * @since 1.0.0
 */
export const partial = (ast: AST, annotations: ReadonlyArray<unknown>): AST => {
  switch (ast._tag) {
    case "TypeAliasDeclaration":
      return partial(ast.type, annotations)
    case "Tuple":
      return tuple(
        ast.elements.map((e) => element(e.type, true, [])),
        pipe(
          ast.rest,
          O.map((rest) => [union([...rest, undefinedKeyword([])], [])])
        ),
        ast.isReadonly,
        annotations
      )
    case "Struct":
      return struct(
        ast.fields.map((f) => field(f.key, f.value, true, f.isReadonly, f.annotations)),
        ast.indexSignatures,
        annotations
      )
    case "Union":
      return union(ast.members.map((member) => partial(member, [])), annotations)
    case "Lazy":
      return lazy(() => partial(ast.f(), []), annotations)
    default:
      return ast
  }
}
