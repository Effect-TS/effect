/**
 * @since 1.0.0
 */

import * as Monoid from "@fp-ts/core/typeclass/Monoid"
import * as Order from "@fp-ts/core/typeclass/Order"
import * as Semigroup from "@fp-ts/core/typeclass/Semigroup"
import { pipe } from "@fp-ts/data/Function"
import * as Number from "@fp-ts/data/Number"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import * as RA from "@fp-ts/data/ReadonlyArray"
import { isString } from "@fp-ts/data/String"
import type { Provider } from "@fp-ts/schema/Provider"

/**
 * @since 1.0.0
 */
export type AST =
  | Declaration
  | TypeAliasDeclaration
  | LiteralType
  | UndefinedKeyword
  | NeverKeyword
  | UnknownKeyword
  | AnyKeyword
  | StringKeyword
  | NumberKeyword
  | BooleanKeyword
  | BigIntKeyword
  | SymbolKeyword
  | Struct
  | Tuple
  | Union
  | Lazy

/**
 * @since 1.0.0
 */
export interface Declaration {
  readonly _tag: "Declaration"
  readonly id: symbol
  readonly config: Option<unknown>
  readonly provider: Provider
  readonly nodes: ReadonlyArray<AST>
}

/**
 * @since 1.0.0
 */
export const declare = (
  id: symbol,
  config: Option<unknown>,
  provider: Provider,
  nodes: ReadonlyArray<AST>
): Declaration => ({ _tag: "Declaration", id, config, provider, nodes })

/**
 * @since 1.0.0
 */
export interface TypeAliasDeclaration {
  readonly _tag: "TypeAliasDeclaration"
  readonly id: symbol
  readonly provider: Provider
  readonly typeParameters: ReadonlyArray<AST>
  readonly type: AST
}

/**
 * @since 1.0.0
 */
export const typeAliasDeclaration = (
  id: symbol,
  provider: Provider,
  typeParameters: ReadonlyArray<AST>,
  type: AST
): TypeAliasDeclaration => ({ _tag: "TypeAliasDeclaration", id, provider, typeParameters, type })

/**
 * @since 1.0.0
 */
export const isDeclaration = (ast: AST): ast is Declaration => ast._tag === "Declaration"

/**
 * @since 1.0.0
 */
export type Literal = string | number | boolean | null | bigint | symbol

/**
 * @since 1.0.0
 */
export interface LiteralType<L = Literal> {
  readonly _tag: "LiteralType"
  readonly literal: L
}

/**
 * @since 1.0.0
 */
export const literalType = <L extends Literal>(literal: L): LiteralType<L> => ({
  _tag: "LiteralType",
  literal
})

/**
 * @since 1.0.0
 */
export interface UndefinedKeyword {
  readonly _tag: "UndefinedKeyword"
}

/**
 * @since 1.0.0
 */
export const undefinedKeyword: UndefinedKeyword = {
  _tag: "UndefinedKeyword"
}

/**
 * @since 1.0.0
 */
export interface NeverKeyword {
  readonly _tag: "NeverKeyword"
}

/**
 * @since 1.0.0
 */
export const neverKeyword: NeverKeyword = {
  _tag: "NeverKeyword"
}

/**
 * @since 1.0.0
 */
export interface UnknownKeyword {
  readonly _tag: "UnknownKeyword"
}

/**
 * @since 1.0.0
 */
export const unknownKeyword: UnknownKeyword = {
  _tag: "UnknownKeyword"
}

/**
 * @since 1.0.0
 */
export interface AnyKeyword {
  readonly _tag: "AnyKeyword"
}

/**
 * @since 1.0.0
 */
export const anyKeyword: AnyKeyword = {
  _tag: "AnyKeyword"
}

/**
 * @since 1.0.0
 */
export interface StringKeyword {
  readonly _tag: "StringKeyword"
}

/**
 * @since 1.0.0
 */
export const stringKeyword: StringKeyword = {
  _tag: "StringKeyword"
}

/**
 * @since 1.0.0
 */
export interface NumberKeyword {
  readonly _tag: "NumberKeyword"
}

/**
 * @since 1.0.0
 */
export const numberKeyword: NumberKeyword = {
  _tag: "NumberKeyword"
}

/**
 * @since 1.0.0
 */
export interface BooleanKeyword {
  readonly _tag: "BooleanKeyword"
}

/**
 * @since 1.0.0
 */
export const booleanKeyword: BooleanKeyword = {
  _tag: "BooleanKeyword"
}

/**
 * @since 1.0.0
 */
export interface BigIntKeyword {
  readonly _tag: "BigIntKeyword"
}

/**
 * @since 1.0.0
 */
export const bigIntKeyword: BigIntKeyword = {
  _tag: "BigIntKeyword"
}

/**
 * @since 1.0.0
 */
export interface SymbolKeyword {
  readonly _tag: "SymbolKeyword"
}

/**
 * @since 1.0.0
 */
export const symbolKeyword: SymbolKeyword = {
  _tag: "SymbolKeyword"
}

/**
 * @since 1.0.0
 */
export interface Field {
  readonly key: PropertyKey
  readonly value: AST
  readonly optional: boolean
  readonly readonly: boolean
}

/**
 * @since 1.0.0
 */
export const field = (
  key: PropertyKey,
  value: AST,
  optional: boolean,
  readonly: boolean
): Field => ({ key, value, optional, readonly })

/**
 * @since 1.0.0
 */
export interface IndexSignature {
  readonly value: AST
  readonly readonly: boolean
}

/**
 * @since 1.0.0
 */
export const indexSignature = (
  value: AST,
  readonly: boolean
): IndexSignature => ({ value, readonly })

/**
 * @since 1.0.0
 */
export interface IndexSignatures {
  "string": Option<IndexSignature>
  "number": Option<IndexSignature>
  "symbol": Option<IndexSignature>
}

/**
 * @since 1.0.0
 */
export const indexSignatures = (
  string: Option<IndexSignature>,
  number: Option<IndexSignature>,
  symbol: Option<IndexSignature>
): IndexSignatures => ({ string, number, symbol })

/**
 * @since 1.0.0
 */
export interface Struct {
  readonly _tag: "Struct"
  readonly fields: ReadonlyArray<Field>
  readonly indexSignatures: IndexSignatures
}

/**
 * @since 1.0.0
 */
export const struct = (
  fields: ReadonlyArray<Field>,
  indexSignatures: IndexSignatures
): Struct => ({ _tag: "Struct", fields, indexSignatures })

/**
 * @since 1.0.0
 */
export const isStruct = (ast: AST): ast is Struct => ast._tag === "Struct"

/**
 * @since 1.0.0
 */
export const IndexSignaturesMonoid: Monoid.Monoid<IndexSignatures> = Monoid.struct({
  string: O.getMonoid(Semigroup.last()),
  number: O.getMonoid(Semigroup.last()),
  symbol: O.getMonoid(Semigroup.last())
})

/**
 * @since 1.0.0
 */
export const StructSemigroup: Semigroup.Semigroup<Struct> = Semigroup.fromCombine(
  (that) =>
    (self) =>
      struct(
        self.fields.concat(that.fields), // TODO: handle duplicated keys
        IndexSignaturesMonoid.combine(that.indexSignatures)(self.indexSignatures)
      )
)

/**
 * @since 1.0.0
 */
export interface Component {
  readonly value: AST
  readonly optional: boolean
}

/**
 * @since 1.0.0
 */
export const component = (value: AST, optional: boolean): Component => ({
  value,
  optional
})

/**
 * @since 1.0.0
 */
export interface Tuple {
  readonly _tag: "Tuple"
  readonly components: ReadonlyArray<Component>
  readonly rest: Option<AST>
  readonly readonly: boolean
}

/**
 * @since 1.0.0
 */
export const tuple = (
  components: ReadonlyArray<Component>,
  rest: Option<AST>,
  readonly: boolean
): Tuple => ({ _tag: "Tuple", components, rest, readonly })

/**
 * @since 1.0.0
 */
export const isTuple = (ast: AST): ast is Tuple => ast._tag === "Tuple"

/**
 * @since 1.0.0
 */
export interface Union {
  readonly _tag: "Union"
  readonly members: ReadonlyArray<AST>
}

/**
 * @since 1.0.0
 */
export const union = (members: ReadonlyArray<AST>): Union => {
  return {
    _tag: "Union",
    members: sortByWeight(
      pipe(
        members,
        RA.flatMap((ast: AST): ReadonlyArray<AST> => isUnion(ast) ? ast.members : [ast])
      )
    )
  }
}

/**
 * @since 1.0.0
 */
export const isUnion = (ast: AST): ast is Union => ast._tag === "Union"

const getWeight = (ast: AST): number => {
  switch (ast._tag) {
    case "Declaration":
      return 0 // TODO: read keyof.length
    case "TypeAliasDeclaration":
      return getWeight(ast.type)
    case "Tuple": {
      let n = ast.components.reduce((n, c) => n + (c.optional ? 2 : 200), 0)
      if (O.isSome(ast.rest)) {
        n += 1
      }
      return n
    }
    case "Struct": {
      let n = ast.fields.reduce((n, c) => n + (c.optional ? 4 : 400), 0)
      if (O.isSome(ast.indexSignatures.string)) {
        n += 1
      }
      if (O.isSome(ast.indexSignatures.number)) {
        n += 1
      }
      if (O.isSome(ast.indexSignatures.symbol)) {
        n += 1
      }
      return n
    }
    default:
      return 0
  }
}

const sortByWeight = RA.sort(Order.reverse(pipe(Number.Order, Order.contramap(getWeight))))

/**
 * @since 1.0.0
 */
export interface Lazy {
  readonly _tag: "Lazy"
  readonly f: () => AST
}

/**
 * @since 1.0.0
 */
export const lazy = (f: () => AST): Lazy => ({ _tag: "Lazy", f })

/**
 * @since 1.0.0
 */
export type KeyOf =
  | NeverKeyword
  | StringKeyword
  | NumberKeyword
  | SymbolKeyword
  | LiteralType<PropertyKey>

/**
 * @since 1.0.0
 */
export const keyof = (ast: AST): ReadonlyArray<KeyOf> => {
  switch (ast._tag) {
    case "Declaration":
      return [] // TODO: add keyof field to Declaration
    case "NeverKeyword":
    case "AnyKeyword":
      return [stringKeyword, numberKeyword, symbolKeyword]
    case "UnknownKeyword":
    case "NumberKeyword":
    case "BooleanKeyword":
    case "BigIntKeyword":
    case "SymbolKeyword":
    case "UndefinedKeyword":
      return []
    case "StringKeyword":
      return [numberKeyword]
    case "LiteralType":
      return isString(ast.literal) ? [numberKeyword] : []
    case "TypeAliasDeclaration":
      return keyof(ast.type)
    case "Tuple": {
      const members: Array<KeyOf> = ast.components.map((_, i) => literalType(String(i)))
      if (O.isSome(ast.rest)) {
        members.push(numberKeyword)
      }
      return members
    }
    case "Struct": {
      const members: Array<KeyOf> = []
      if (O.isSome(ast.indexSignatures.string)) {
        members.push(stringKeyword, numberKeyword)
      } else {
        if (O.isSome(ast.indexSignatures.number)) {
          members.push(numberKeyword)
        }
        if (O.isSome(ast.indexSignatures.symbol)) {
          members.push(symbolKeyword)
        }
        members.push(...ast.fields.map((field) => literalType(field.key)))
      }
      return members
    }
    case "Union": {
      let members: ReadonlyArray<KeyOf> = keyof(ast.members[0])
      for (let i = 1; i < ast.members.length; i++) {
        members = RA.intersection(keyof(ast.members[i]))(members)
      }
      return members
    }
    case "Lazy":
      return keyof(ast.f())
  }
}

// TODO: handle index signatures in unions
/**
 * @since 1.0.0
 */
export const getFields = (
  ast: AST
): ReadonlyArray<Field> => {
  switch (ast._tag) {
    case "Lazy":
      return getFields(ast.f())
    case "Struct":
      return ast.fields
    case "Union": {
      const memberFields = ast.members.map(getFields)
      if (RA.isNonEmpty(memberFields)) {
        const candidates = []
        const head = memberFields[0]
        const tail = memberFields.slice(1)
        for (const candidate of head) {
          if (
            tail.every((fields) => fields.some((field) => field.key === candidate.key))
          ) {
            const members = pipe(
              tail,
              RA.flatMap((fields) =>
                fields.filter((field) => field.key === candidate.key).map((field) => field.value)
              )
            )
            const optional = candidate.optional ||
              tail.some((fields) => fields.some((field) => field.optional))
            const readonly = candidate.readonly ||
              tail.some((fields) => fields.some((field) => field.readonly))
            candidates.push(field(
              candidate.key,
              union([candidate.value, ...members]),
              optional,
              readonly
            ))
          }
        }
        return candidates
      }
      return []
    }
    default:
      return []
  }
}

const orUndefined = (ast: AST): AST => union([undefinedKeyword, ast])

/**
 * @since 1.0.0
 */
export const partial = (ast: AST): AST => {
  if (isStruct(ast)) {
    return struct(
      ast.fields.map((f) => field(f.key, f.value, true, f.readonly)),
      ast.indexSignatures
    )
  } else if (isTuple(ast)) {
    return tuple(
      ast.components.map((c) => component(c.value, true)),
      pipe(ast.rest, O.map(orUndefined)),
      ast.readonly
    )
  } else if (isUnion(ast)) {
    return union(ast.members.map(partial))
  }
  return ast
}
