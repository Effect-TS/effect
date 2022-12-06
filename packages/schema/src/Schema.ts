/**
 * @since 1.0.0
 */

import type { Chunk } from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import type { Json, JsonArray, JsonObject } from "@fp-ts/data/Json"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import * as AST from "@fp-ts/schema/AST"
import * as DataAny from "@fp-ts/schema/data/Any"
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
import * as DataNever from "@fp-ts/schema/data/Never"
import * as DataNumber from "@fp-ts/schema/data/Number"
import * as DataOption from "@fp-ts/schema/data/Option"
import * as DataReadonlySet from "@fp-ts/schema/data/ReadonlySet"
import * as DataRefine from "@fp-ts/schema/data/refine"
import * as DataString from "@fp-ts/schema/data/String"
import * as DataSymbol from "@fp-ts/schema/data/Symbol"
import * as DataUnknown from "@fp-ts/schema/data/Unknown"
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
export interface Schema<in out A> {
  readonly A: (_: A) => A
  readonly ast: AST.AST
}

/**
 * @since 1.0.0
 */
export type Infer<S extends Schema<any>> = I.Infer<S>

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
    throw new Error("cannot `clone` non-Declaration schemas")
  }

/**
 * @since 1.0.0
 */
export const of: <A>(value: A) => Schema<A> = I.of

/**
 * @since 1.0.0
 */
export const literal: <A extends ReadonlyArray<string | number | boolean | null | undefined>>(
  ...a: A
) => Schema<A[number]> = I.literal

/**
 * @since 1.0.0
 */
export const nativeEnum = <A extends { [_: string]: string | number }>(nativeEnum: A): Schema<A> =>
  make(AST.union(
    Object.keys(nativeEnum).filter(
      (key) => typeof nativeEnum[nativeEnum[key]] !== "number"
    ).map((key) => AST.of(nativeEnum[key]))
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
  union(...AST.getFields(schema.ast).map((field) => of(field.key as keyof A)))

/**
 * @since 1.0.0
 */
export const tuple = <Components extends ReadonlyArray<Schema<any>>>(
  ...components: Components
): Schema<{ readonly [K in keyof Components]: Infer<Components[K]> }> =>
  make(AST.tuple(components.map((c) => c.ast), O.none, true))

/**
 * @since 1.0.0
 */
export const withRest = <R>(rest: Schema<R>) =>
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
    throw new Error("cannot `withRest` non-Tuple schemas")
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
): Schema<readonly [A, ...Array<A>]> => make(AST.tuple([item.ast], O.some(item.ast), true))

/**
 * @since 1.0.0
 */
export type Spread<A> = I.Spread<A>

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
      O.none,
      O.none
    ))
  }

/**
 * @since 1.0.0
 */
export const omit = <A, Keys extends ReadonlyArray<keyof A>>(...keys: Keys) =>
  (self: Schema<A>): Schema<{ readonly [P in Exclude<keyof A, Keys[number]>]: A[P] }> => {
    return make(AST.struct(
      AST.getFields(self.ast).filter((f) => !(keys as ReadonlyArray<PropertyKey>).includes(f.key)),
      O.none,
      O.none
    ))
  }

/**
 * @since 1.0.0
 */
export const partial = <A>(self: Schema<A>): Schema<Partial<A>> => {
  if (AST.isStruct(self.ast)) {
    return make(
      AST.struct(
        self.ast.fields.map((f) => AST.field(f.key, f.value, true, f.readonly)),
        self.ast.stringIndexSignature,
        self.ast.symbolIndexSignature
      )
    )
  }
  throw new Error("cannot `partial` non-Struct schemas")
}

/**
 * @since 1.0.0
 */
export const stringIndexSignature = <A>(value: Schema<A>): Schema<{ readonly [_: string]: A }> =>
  make(AST.struct([], O.some(AST.indexSignature(value.ast, true)), O.none))

/**
 * @since 1.0.0
 */
export const symbolIndexSignature = <A>(value: Schema<A>): Schema<{ readonly [_: symbol]: A }> =>
  make(AST.struct([], O.none, O.some(AST.indexSignature(value.ast, true))))

/**
 * @since 1.0.0
 */
export const extend = <B>(
  that: Schema<B>
) =>
  <A>(self: Schema<A>): Schema<A & B> => {
    if (AST.isStruct(self.ast) && AST.isStruct(that.ast)) {
      const a = AST.getStringIndexSignature(self.ast)
      const b = AST.getSymbolIndexSignature(self.ast)
      const c = AST.getStringIndexSignature(that.ast)
      const d = AST.getSymbolIndexSignature(that.ast)
      if ((O.isSome(a) && O.isSome(b)) || O.isSome(c) && O.isSome(d)) {
        throw new Error("cannot `extend` double index signatures")
      }
      const struct = AST.struct(
        AST.getFields(self.ast).concat(AST.getFields(that.ast)),
        pipe(a, O.orElse(c)),
        pipe(b, O.orElse(d))
      )
      return make(struct)
    }
    throw new Error("cannot `extend` non-Struct schemas")
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
export const unknown: Schema<unknown> = DataUnknown.Schema

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
export const any: Schema<any> = DataAny.Schema

/**
 * @since 1.0.0
 */
export const never: Schema<never> = DataNever.Schema

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
