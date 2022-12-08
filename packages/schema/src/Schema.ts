/**
 * @since 1.0.0
 */

import type { Chunk } from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import type { Json, JsonArray, JsonObject } from "@fp-ts/data/Json"
import type { List } from "@fp-ts/data/List"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import * as AST from "@fp-ts/schema/AST"
import * as DataBigint from "@fp-ts/schema/data/Bigint"
import * as DataBoolean from "@fp-ts/schema/data/Boolean"
import * as DataChunk from "@fp-ts/schema/data/Chunk"
import * as DataFilter from "@fp-ts/schema/data/filter"
import * as DataGreaterThan from "@fp-ts/schema/data/filter/GreaterThan"
import * as DataGreaterThanOrEqualTo from "@fp-ts/schema/data/filter/GreaterThanOrEqualTo"
import * as DataInt from "@fp-ts/schema/data/filter/Int"
import * as DataLessThan from "@fp-ts/schema/data/filter/LessThan"
import * as DataLessThanOrEqualTo from "@fp-ts/schema/data/filter/LessThanOrEqualTo"
import * as DataMaxLength from "@fp-ts/schema/data/filter/MaxLength"
import * as DataMinLength from "@fp-ts/schema/data/filter/MinLength"
import * as DataFilterWith from "@fp-ts/schema/data/filterWith"
import * as DataJson from "@fp-ts/schema/data/Json"
import * as DataJsonArray from "@fp-ts/schema/data/JsonArray"
import * as DataJsonObject from "@fp-ts/schema/data/JsonObject"
import * as DataList from "@fp-ts/schema/data/List"
import * as DataNumber from "@fp-ts/schema/data/Number"
import * as DataOption from "@fp-ts/schema/data/Option"
import * as DataReadonlySet from "@fp-ts/schema/data/ReadonlySet"
import * as DataRefine from "@fp-ts/schema/data/refine"
import * as DataString from "@fp-ts/schema/data/String"
import * as DataSymbol from "@fp-ts/schema/data/Symbol"
import * as DataUnknownArray from "@fp-ts/schema/data/UnknownArray"
import type { UnknownArray } from "@fp-ts/schema/data/UnknownArray"
import type { UnknownObject } from "@fp-ts/schema/data/UnknownObject"
import * as DataUnknownObject from "@fp-ts/schema/data/UnknownObject"
import type { Decoder } from "@fp-ts/schema/Decoder"
import * as I from "@fp-ts/schema/internal/common"
import type { Provider } from "@fp-ts/schema/Provider"
import * as P from "@fp-ts/schema/Provider"

/**
 * @since 1.0.0
 */
export interface Schema<A> {
  readonly A: (_: A) => A
  readonly ast: AST.AST
}

/**
 * @since 1.0.0
 */
export type Infer<S extends Schema<any>> = Parameters<S["A"]>[0]

// ---------------------------------------------
// constructors
// ---------------------------------------------

/**
 * @since 1.0.0
 */
export const make: <A>(ast: AST.AST) => Schema<A> = I.makeSchema

/**
 * @since 1.0.0
 */
export const declare: <Schemas extends ReadonlyArray<Schema<any>>>(
  id: symbol,
  config: Option<unknown>,
  provider: Provider,
  ...schemas: Schemas
) => Schema<any> = I.declareSchema

/**
 * @since 1.0.0
 */
export const clone = (id: symbol, interpreters: Record<symbol, Function>) =>
  <A>(schema: Schema<A>): Schema<A> => {
    if (AST.isDeclaration(schema.ast)) {
      return I.declareSchema(
        id,
        schema.ast.config,
        P.Semigroup.combine(P.make(id, interpreters))(
          pipe(schema.ast.provider, P.replace(schema.ast.id, id))
        ),
        ...schema.ast.nodes.map(make)
      )
    }
    throw new Error("`clone` is not supported on this schema")
  }

/**
 * @since 1.0.0
 */
export const literal: <Literals extends ReadonlyArray<AST.Literal>>(
  ...literals: Literals
) => Schema<Literals[number]> = I.literal

const _undefined = I.undefinedKeyword

export {
  /**
   * @since 1.0.0
   */
  _undefined as undefined
}

/**
 * @since 1.0.0
 */
export const never: Schema<never> = I.neverKeyword

/**
 * @since 1.0.0
 */
export const unknown: Schema<unknown> = I.unknownKeyword

/**
 * @since 1.0.0
 */
export const any: Schema<any> = I.anyKeyword

/**
 * @since 1.0.0
 */
export const nativeEnum = <A extends { [_: string]: string | number }>(nativeEnum: A): Schema<A> =>
  make(AST.union(
    Object.keys(nativeEnum).filter(
      (key) => typeof nativeEnum[nativeEnum[key]] !== "number"
    ).map((key) => AST.literalType(nativeEnum[key]))
  ))

// ---------------------------------------------
// filters
// ---------------------------------------------

/**
 * @since 1.0.0
 */
export const minLength: (
  minLength: number
) => <A extends { length: number }>(self: Schema<A>) => Schema<A> = DataMinLength.schema

/**
 * @since 1.0.0
 */
export const maxLength: (
  maxLength: number
) => <A extends { length: number }>(self: Schema<A>) => Schema<A> = DataMaxLength.schema

/**
 * @since 1.0.0
 */
export const lessThan: (max: number) => <A extends number>(self: Schema<A>) => Schema<A> =
  DataLessThan.schema

/**
 * @since 1.0.0
 */
export const lessThanOrEqualTo: (max: number) => <A extends number>(self: Schema<A>) => Schema<A> =
  DataLessThanOrEqualTo.schema

/**
 * @since 1.0.0
 */
export const greaterThan: (
  min: number
) => <A extends number>(self: Schema<A>) => Schema<A> = DataGreaterThan.schema

/**
 * @since 1.0.0
 */
export const greaterThanOrEqualTo: (
  min: number
) => <A extends number>(self: Schema<A>) => Schema<A> = DataGreaterThanOrEqualTo.schema

/**
 * @since 1.0.0
 */
export const int: <A extends number>(self: Schema<A>) => Schema<A> = DataInt.schema

// ---------------------------------------------
// combinators
// ---------------------------------------------

/**
 * @since 1.0.0
 */
export const union: <Members extends ReadonlyArray<Schema<any>>>(
  ...members: Members
) => Schema<Infer<Members[number]>> = I.union

/**
 * @since 1.0.0
 */
export const keyof = <A>(schema: Schema<A>): Schema<keyof A> =>
  union(...AST.getFields(schema.ast).map((field) => literal(field.key as any))) // TODO: key may contain a symbol, using literal here is wrong

/**
 * @since 1.0.0
 */
export const tuple = <Components extends ReadonlyArray<Schema<any>>>(
  ...components: Components
): Schema<{ readonly [K in keyof Components]: Infer<Components[K]> }> =>
  make(AST.tuple(components.map((c) => AST.component(c.ast, false)), O.none, true))

/**
 * @since 1.0.0
 */
export const restElement = <R>(rest: Schema<R>) =>
  <A extends ReadonlyArray<any>>(self: Schema<A>): Schema<readonly [...A, ...Array<R>]> => {
    if (AST.isTuple(self.ast)) {
      const a = self.ast
      return make(pipe(
        a.restElement,
        O.match(
          () => AST.tuple(a.components, O.some(rest.ast), true),
          (value) =>
            // if `self` already contains a rest element merge them into a union
            AST.tuple(
              a.components,
              O.some(AST.union([value, rest.ast])),
              true
            )
        )
      ))
    }
    throw new Error("`restElement` is not supported on this schema")
  }

/**
 * @since 1.0.0
 */
export const array: <A>(item: Schema<A>) => Schema<ReadonlyArray<A>> = I.array

/**
 * @since 1.0.0
 */
export const nonEmptyArray = <A>(
  item: Schema<A>
): Schema<readonly [A, ...Array<A>]> => pipe(tuple(item), restElement(item))

/**
 * @since 1.0.0
 */
export type Spread<A> = {
  [K in keyof A]: A[K]
} extends infer B ? B : never

/**
 * @since 1.0.0
 */
export const struct: {
  <Required extends Record<PropertyKey, Schema<any>>>(
    required: Required
  ): Schema<{ readonly [K in keyof Required]: Infer<Required[K]> }>
  <
    Required extends Record<PropertyKey, Schema<any>>,
    Optional extends Record<PropertyKey, Schema<any>>
  >(
    required: Required,
    optional: Optional
  ): Schema<
    Spread<
      & { readonly [K in keyof Required]: Infer<Required[K]> }
      & { readonly [K in keyof Optional]?: Infer<Optional[K]> }
    >
  >
} = I.struct

/**
 * @since 1.0.0
 */
export const pick = <A, Keys extends ReadonlyArray<keyof A>>(...keys: Keys) =>
  (self: Schema<A>): Schema<{ readonly [P in Keys[number]]: A[P] }> => {
    return make(AST.struct(
      AST.getFields(self.ast).filter((f) => (keys as ReadonlyArray<PropertyKey>).includes(f.key)),
      AST.indexSignatures(O.none, O.none, O.none)
    ))
  }

/**
 * @since 1.0.0
 */
export const omit = <A, Keys extends ReadonlyArray<keyof A>>(...keys: Keys) =>
  (self: Schema<A>): Schema<{ readonly [P in Exclude<keyof A, Keys[number]>]: A[P] }> => {
    return make(AST.struct(
      AST.getFields(self.ast).filter((f) => !(keys as ReadonlyArray<PropertyKey>).includes(f.key)),
      AST.indexSignatures(O.none, O.none, O.none)
    ))
  }

/**
 * @since 1.0.0
 */
export const partial = <A>(self: Schema<A>): Schema<Partial<A>> => make(AST.partial(self.ast))

/**
 * @since 1.0.0
 */
export const stringIndexSignature = <A>(value: Schema<A>): Schema<{ readonly [_: string]: A }> =>
  make(
    AST.struct([], AST.indexSignatures(O.some(AST.indexSignature(value.ast, true)), O.none, O.none))
  )

/**
 * @since 1.0.0
 */
export const symbolIndexSignature = <A>(value: Schema<A>): Schema<{ readonly [_: symbol]: A }> =>
  make(
    AST.struct([], AST.indexSignatures(O.none, O.none, O.some(AST.indexSignature(value.ast, true))))
  )

/**
 * @since 1.0.0
 */
export const extend = <B>(
  that: Schema<B>
) =>
  <A>(self: Schema<A>): Schema<A & B> => {
    if (AST.isStruct(self.ast) && AST.isStruct(that.ast)) {
      return make(AST.StructSemigroup.combine(that.ast)(self.ast))
    }
    throw new Error("`extend` is not supported on this schema")
  }

/**
 * @since 1.0.0
 */
export const lazy: <A>(f: () => Schema<A>) => Schema<A> = I.lazy

/**
 * @since 1.0.0
 */
export const filter: <A>(
  id: symbol,
  decode: Decoder<A, A>["decode"]
) => (schema: Schema<A>) => Schema<A> = DataFilter.filter

/**
 * @since 1.0.0
 */
export const filterWith: <Config, A>(
  id: symbol,
  decode: (config: Config) => Decoder<A, A>["decode"]
) => (config: Config) => (schema: Schema<A>) => Schema<A> = DataFilterWith.filterWith

/**
 * @since 1.0.0
 */
export const refine: <A, B extends A>(
  id: symbol,
  decode: Decoder<A, B>["decode"]
) => (schema: Schema<A>) => Schema<B> = DataRefine.refine

// ---------------------------------------------
// data
// ---------------------------------------------

/**
 * @since 1.0.0
 */
export const string: Schema<string> = DataString.Schema

/**
 * @since 1.0.0
 */
export const number: Schema<number> = DataNumber.Schema

/**
 * @since 1.0.0
 */
export const boolean: Schema<boolean> = DataBoolean.Schema

/**
 * @since 1.0.0
 */
export const bigint: Schema<bigint> = DataBigint.Schema

/**
 * @since 1.0.0
 */
export const symbol: Schema<symbol> = DataSymbol.Schema

/**
 * @since 1.0.0
 */
export const unknownArray: Schema<UnknownArray> = DataUnknownArray.Schema

/**
 * @since 1.0.0
 */
export const unknownObject: Schema<UnknownObject> = DataUnknownObject.Schema

/**
 * @since 1.0.0
 */
export const json: Schema<Json> = DataJson.Schema

/**
 * @since 1.0.0
 */
export const jsonArray: Schema<JsonArray> = DataJsonArray.Schema

/**
 * @since 1.0.0
 */
export const jsonObject: Schema<JsonObject> = DataJsonObject.Schema

/**
 * @since 1.0.0
 */
export const option: <A>(value: Schema<A>) => Schema<Option<A>> = DataOption.schema

/**
 * @since 1.0.0
 */
export const chunk: <A>(item: Schema<A>) => Schema<Chunk<A>> = DataChunk.schema

/**
 * @since 1.0.0
 */
export const readonlySet: <A>(item: Schema<A>) => Schema<ReadonlySet<A>> = DataReadonlySet.schema

/**
 * @since 1.0.0
 */
export const list: <A>(item: Schema<A>) => Schema<List<A>> = DataList.schema
