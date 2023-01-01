/**
 * @since 1.0.0
 */

import type { Left, Right } from "@fp-ts/data/Either"
import { pipe } from "@fp-ts/data/Function"
import type * as Json from "@fp-ts/data/Json"
import type { Option } from "@fp-ts/data/Option"
import type { Refinement } from "@fp-ts/data/Predicate"
import type { NonEmptyReadonlyArray } from "@fp-ts/data/ReadonlyArray"
import type { Both, These } from "@fp-ts/data/These"
import type { Annotated, Literal } from "@fp-ts/schema/AST"
import type { Class } from "@fp-ts/schema/data/refinement"
import type { DecodeError } from "@fp-ts/schema/DecodeError"
import type { Decoder } from "@fp-ts/schema/Decoder"
import { decoderFor } from "@fp-ts/schema/Decoder"
import type { Encoder } from "@fp-ts/schema/Encoder"
import { encoderFor } from "@fp-ts/schema/Encoder"
import type { Guard } from "@fp-ts/schema/Guard"
import { guardFor } from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"
import * as S from "@fp-ts/schema/Schema"

/**
 * @category model
 * @since 1.0.0
 */
export interface Codec<A> extends Schema<A>, Decoder<unknown, A>, Encoder<unknown, A>, Guard<A> {}

const make = <A>(schema: Schema<A>): Codec<A> => {
  const out = {
    ast: schema.ast,
    decode: decoderFor(schema).decode,
    encode: encoderFor(schema).encode,
    is: guardFor(schema).is
  }
  // @ts-expect-error
  return out
}

/**
 * @since 1.0.0
 */
export type Infer<S extends Schema<any>> = Parameters<S["A"]>[0]

// ---------------------------------------------
// constructors
// ---------------------------------------------

/**
 * @category constructors
 * @since 1.0.0
 */
export const success: <A>(a: A) => These<never, A> = I.success

/**
 * @category constructors
 * @since 1.0.0
 */
export const failure: (
  e: DecodeError
) => These<NonEmptyReadonlyArray<DecodeError>, never> = I.failure

/**
 * @category constructors
 * @since 1.0.0
 */
export const failures: (
  es: NonEmptyReadonlyArray<DecodeError>
) => These<NonEmptyReadonlyArray<DecodeError>, never> = I.failures

/**
 * @category constructors
 * @since 1.0.0
 */
export const warning: <A>(
  e: DecodeError,
  a: A
) => These<NonEmptyReadonlyArray<DecodeError>, A> = I.warning

/**
 * @category constructors
 * @since 1.0.0
 */
export const warnings: <A>(
  es: NonEmptyReadonlyArray<DecodeError>,
  a: A
) => These<NonEmptyReadonlyArray<DecodeError>, A> = I.warnings

/**
 * @category guards
 * @since 1.0.0
 */
export const isSuccess: <E, A>(self: These<E, A>) => self is Right<A> = I.isSuccess

/**
 * @category guards
 * @since 1.0.0
 */
export const isFailure: <E, A>(self: These<E, A>) => self is Left<E> = I.isFailure

/**
 * @category guards
 * @since 1.0.0
 */
export const isWarning: <E, A>(self: These<E, A>) => self is Both<E, A> = I.isWarning

/**
 * @since 1.0.0
 */
export const codecFor = <A>(schema: Schema<A>): Codec<A> => make(schema)

/**
 * @category constructors
 * @since 1.0.0
 */
export const literal = <A extends ReadonlyArray<Literal>>(
  ...a: A
): Codec<A[number]> => codecFor(S.literal(...a))

/**
 * @category constructors
 * @since 1.0.0
 */
export const uniqueSymbol = <S extends symbol>(
  symbol: S,
  annotations?: Annotated["annotations"]
): Codec<S> => codecFor(S.uniqueSymbol(symbol, annotations))

/**
 * @category constructors
 * @since 1.0.0
 */
export const enums = <A extends { [x: string]: string | number }>(
  nativeEnum: A,
  annotations?: Annotated["annotations"]
): Codec<A[keyof A]> => codecFor(S.enums(nativeEnum, annotations))

/**
 * @category constructors
 * @since 1.0.0
 */
export const instanceOf = <A extends typeof Class>(
  constructor: A
) => (self: Schema<object>): Codec<InstanceType<A>> => codecFor(S.instanceOf(constructor)(self))

/**
 * @category constructors
 * @since 1.0.0
 */
export const templateLiteral = <T extends [Schema<any>, ...Array<Schema<any>>]>(
  ...spans: T
): Codec<S.Join<{ [K in keyof T]: Infer<T[K]> }>> => codecFor(S.templateLiteral(...spans))

// ---------------------------------------------
// filters
// ---------------------------------------------

/**
 * @category filters
 * @since 1.0.0
 */
export const minLength = (minLength: number) =>
  <A extends string>(self: Schema<A>): Codec<A> => codecFor(S.minLength(minLength)(self))

/**
 * @category filters
 * @since 1.0.0
 */
export const maxLength = (maxLength: number) =>
  <A extends string>(self: Schema<A>): Codec<A> => codecFor(S.maxLength(maxLength)(self))

/**
 * @category filters
 * @since 1.0.0
 */
export const length = (length: number) =>
  <A extends string>(self: Schema<A>): Codec<A> => codecFor(S.length(length)(self))

/**
 * @category filters
 * @since 1.0.0
 */
export const nonEmpty = <A extends string>(self: Schema<A>): Codec<A> => codecFor(S.nonEmpty(self))

/**
 * @category filters
 * @since 1.0.0
 */
export const startsWith = (startsWith: string) =>
  <A extends string>(self: Schema<A>): Codec<A> => codecFor(S.startsWith(startsWith)(self))

/**
 * @category filters
 * @since 1.0.0
 */
export const endsWith = (endsWith: string) =>
  <A extends string>(self: Schema<A>): Codec<A> => codecFor(S.endsWith(endsWith)(self))

/**
 * @category filters
 * @since 1.0.0
 */
export const regex = (regex: RegExp) =>
  <A extends string>(self: Schema<A>): Codec<A> => codecFor(S.regex(regex)(self))

/**
 * @category filters
 * @since 1.0.0
 */
export const lessThan = (min: number) =>
  <A extends number>(self: Schema<A>): Codec<A> => codecFor(S.lessThan(min)(self))

/**
 * @category filters
 * @since 1.0.0
 */
export const lessThanOrEqualTo = (min: number) =>
  <A extends number>(self: Schema<A>): Codec<A> => codecFor(S.lessThanOrEqualTo(min)(self))

/**
 * @category filters
 * @since 1.0.0
 */
export const greaterThan = (max: number) =>
  <A extends number>(self: Schema<A>): Codec<A> => codecFor(S.greaterThan(max)(self))

/**
 * @category filters
 * @since 1.0.0
 */
export const greaterThanOrEqualTo = (max: number) =>
  <A extends number>(self: Schema<A>): Codec<A> => codecFor(S.greaterThanOrEqualTo(max)(self))

/**
 * @category filters
 * @since 1.0.0
 */
export const int = <A extends number>(self: Schema<A>): Codec<A> => codecFor(S.int(self))

/**
 * @category filters
 * @since 1.0.0
 */
export const nonNaN = <A extends number>(self: Schema<A>): Codec<A> => codecFor(S.nonNaN(self))

/**
 * @category filters
 * @since 1.0.0
 */
export const finite = <A extends number>(self: Schema<A>): Codec<A> => codecFor(S.finite(self))

// ---------------------------------------------
// combinators
// ---------------------------------------------

/**
 * @category unexpected keys / indexes
 * @since 1.0.0
 */
export const allowUnexpected = <A>(self: Schema<A>): Codec<A> => codecFor(S.allowUnexpected(self))

/**
 * @category unexpected keys / indexes
 * @since 1.0.0
 */
export const disallowUnexpected = <A>(self: Schema<A>): Schema<A> =>
  codecFor(S.disallowUnexpected(self))

/**
 * @category combinators
 * @since 1.0.0
 */
export const union = <Members extends ReadonlyArray<Schema<any>>>(
  ...members: Members
): Codec<Infer<Members[number]>> => codecFor(S.union(...members))

/**
 * @category combinators
 * @since 1.0.0
 */
export const nullable = <A>(self: Schema<A>): Codec<A | null> => codecFor(S.nullable(self))

/**
 * @category combinators
 * @since 1.0.0
 */
export const keyof = <A>(schema: Schema<A>): Codec<keyof A> => codecFor(S.keyof(schema))

/**
 * @category combinators
 * @since 1.0.0
 */
export const tuple = <Elements extends ReadonlyArray<Schema<any>>>(
  ...elements: Elements
): Codec<{ readonly [K in keyof Elements]: Infer<Elements[K]> }> =>
  codecFor(S.tuple<Elements>(...elements))

/**
 * @category combinators
 * @since 1.0.0
 */
export const rest = <R>(rest: Schema<R>) =>
  <A extends ReadonlyArray<any>>(self: Schema<A>): Codec<readonly [...A, ...Array<R>]> =>
    codecFor(S.rest(rest)(self))

/**
 * @category combinators
 * @since 1.0.0
 */
export const element = <E>(element: Schema<E>) =>
  <A extends ReadonlyArray<any>>(self: Schema<A>): Codec<readonly [...A, E]> =>
    codecFor(S.element(element)(self))

/**
 * @category combinators
 * @since 1.0.0
 */
export const optionalElement = <E>(element: Schema<E>) =>
  <A extends ReadonlyArray<any>>(self: Schema<A>): Codec<readonly [...A, E?]> =>
    codecFor(S.optionalElement(element)(self))

/**
 * @category combinators
 * @since 1.0.0
 */
export const array = <A>(item: Schema<A>): Codec<ReadonlyArray<A>> => codecFor(S.array(item))

/**
 * @category combinators
 * @since 1.0.0
 */
export const nonEmptyArray = <A>(
  item: Schema<A>
): Codec<readonly [A, ...Array<A>]> => codecFor(S.nonEmptyArray(item))

/**
 * @category combinators
 * @since 1.0.0
 */
export const optional: <A>(schema: Schema<A>) => S.OptionalSchema<A, true> = I.optional

/**
 * @category combinators
 * @since 1.0.0
 */
export const struct = <Fields extends Record<PropertyKey, Schema<any>>>(
  fields: Fields
): Codec<
  S.Spread<
    & { readonly [K in Exclude<keyof Fields, S.OptionalKeys<Fields>>]: Infer<Fields[K]> }
    & { readonly [K in S.OptionalKeys<Fields>]?: Infer<Fields[K]> }
  >
> => codecFor(S.struct(fields))

/**
 * @category combinators
 * @since 1.0.0
 */
export const field = <Key extends PropertyKey, A, isOptional extends boolean>(
  key: Key,
  value: Schema<A>,
  isOptional: isOptional,
  annotations?: Annotated["annotations"]
): Codec<isOptional extends true ? { readonly [K in Key]?: A } : { readonly [K in Key]: A }> =>
  codecFor(S.field(key, value, isOptional, annotations))

/**
 * @category combinators
 * @since 1.0.0
 */
export const pick = <A, Keys extends ReadonlyArray<keyof A>>(...keys: Keys) =>
  (self: Schema<A>): Codec<{ readonly [P in Keys[number]]: A[P] }> =>
    codecFor(pipe(self, S.pick(...keys)))

/**
 * @category combinators
 * @since 1.0.0
 */
export const omit = <A, Keys extends ReadonlyArray<keyof A>>(...keys: Keys) =>
  (self: Schema<A>): Codec<{ readonly [P in Exclude<keyof A, Keys[number]>]: A[P] }> =>
    codecFor(pipe(self, S.omit(...keys)))

/**
 * @category combinators
 * @since 1.0.0
 */
export const partial = <A>(self: Schema<A>): Codec<Partial<A>> => codecFor(S.partial(self))

/**
 * @category combinators
 * @since 1.0.0
 */
export const record = <K extends string | symbol, V>(
  key: Schema<K>,
  value: Schema<V>
): Codec<{ readonly [k in K]: V }> => codecFor(S.record(key, value))

/**
 * @category combinators
 * @since 1.0.0
 */
export const extend = <B>(
  that: Schema<B>
) => <A>(self: Schema<A>): Codec<S.Spread<A & B>> => codecFor(S.extend(that)(self))

/**
 * @category combinators
 * @since 1.0.0
 */
export const lazy = <A>(f: () => Schema<A>): Codec<A> => codecFor(S.lazy(f))

/**
 * @category combinators
 * @since 1.0.0
 */
export const filter = <A, B extends A>(
  refinement: Refinement<A, B>,
  meta: unknown,
  annotations: Annotated["annotations"] = {}
) => (self: Schema<A>): Codec<B> => codecFor(S.filter(refinement, meta, annotations)(self))

/**
 * @category combinators
 * @since 1.0.0
 */
export const parse = <A, B>(
  to: Schema<B>,
  decode: Decoder<A, B>["decode"],
  encode: Encoder<A, B>["encode"]
) => (self: Schema<A>): Codec<B> => codecFor(S.parse(to, decode, encode)(self))

// ---------------------------------------------
// data
// ---------------------------------------------

const _undefined: Codec<undefined> = codecFor(S.undefined)

const _void: Codec<void> = codecFor(S.void)

const _null: Codec<null> = codecFor(S.null)

export {
  /**
   * @category primitives
   * @since 1.0.0
   */
  _null as null,
  /**
   * @category primitives
   * @since 1.0.0
   */
  _undefined as undefined,
  /**
   * @category primitives
   * @since 1.0.0
   */
  _void as void
}

/**
 * @category primitives
 * @since 1.0.0
 */
export const string: Codec<string> = codecFor(S.string)

/**
 * @category primitives
 * @since 1.0.0
 */
export const number: Codec<number> = codecFor(S.number)

/**
 * @category primitives
 * @since 1.0.0
 */
export const boolean: Codec<boolean> = codecFor(S.boolean)

/**
 * @category primitives
 * @since 1.0.0
 */
export const bigint: Codec<bigint> = codecFor(S.bigint)

/**
 * @category primitives
 * @since 1.0.0
 */
export const symbol: Codec<symbol> = codecFor(S.symbol)

/**
 * @category primitives
 * @since 1.0.0
 */
export const object: Codec<object> = codecFor(S.object)

/**
 * @category primitives
 * @since 1.0.0
 */
export const unknown: Codec<unknown> = codecFor(S.unknown)

/**
 * @category primitives
 * @since 1.0.0
 */
export const any: Codec<any> = codecFor(S.any)

/**
 * @category primitives
 * @since 1.0.0
 */
export const never: Codec<never> = codecFor(S.never)

/**
 * @category data
 * @since 1.0.0
 */
export const json: Codec<Json.Json> = codecFor(S.json)

/**
 * @category data
 * @since 1.0.0
 */
export const option = <A>(value: Schema<A>): Codec<Option<A>> => codecFor(S.option(value))
