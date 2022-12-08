/**
 * @since 1.0.0
 */

import * as Monoid from "@fp-ts/core/typeclass/Monoid"
import * as Semigroup from "@fp-ts/core/typeclass/Semigroup"
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import { flatMap, isNonEmpty } from "@fp-ts/data/ReadonlyArray"
import type { Provider } from "@fp-ts/schema/Provider"

/**
 * @since 1.0.0
 */
export type AST =
  | Declaration
  | LiteralType
  | UndefinedKeyword
  | NeverKeyword
  | UnknownKeyword
  | AnyKeyword
  | StringKeyword
  | NumberKeyword
  | BooleanKeyword
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
export const isDeclaration = (ast: AST): ast is Declaration => ast._tag === "Declaration"

/**
 * @since 1.0.0
 */
export type Literal = string | number | boolean | null | bigint

/**
 * @since 1.0.0
 */
export interface LiteralType {
  readonly _tag: "LiteralType"
  readonly literal: Literal
}

/**
 * @since 1.0.0
 */
export const literalType = (literal: Literal): LiteralType => ({
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
  readonly restElement: Option<AST>
  readonly readonly: boolean
}

/**
 * @since 1.0.0
 */
export const tuple = (
  components: ReadonlyArray<Component>,
  restElement: Option<AST>,
  readonly: boolean
): Tuple => ({ _tag: "Tuple", components, restElement, readonly })

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
export const union = (members: ReadonlyArray<AST>): Union | NeverKeyword => {
  if (members.length === 0) {
    return neverKeyword
  }
  // TODO: handle union flattening
  return { _tag: "Union", members }
}

/**
 * @since 1.0.0
 */
export const isUnion = (ast: AST): ast is Union => ast._tag === "Union"

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
      if (isNonEmpty(memberFields)) {
        const candidates = []
        const head = memberFields[0]
        const tail = memberFields.slice(1)
        for (const candidate of head) {
          if (
            tail.every((fields) => fields.some((field) => field.key === candidate.key))
          ) {
            const members = pipe(
              tail,
              flatMap((fields) =>
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
      pipe(ast.restElement, O.map(orUndefined)),
      ast.readonly
    )
  } else if (isUnion(ast)) {
    return union(ast.members.map(partial))
  }
  return ast
}
