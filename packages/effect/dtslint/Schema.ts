import { Brand, Context, Effect, Number as N, Option, String as Str } from "effect"
import { hole, identity, pipe } from "effect/Function"
import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import type * as AST from "effect/SchemaAST"
import type { Simplify } from "effect/Types"

declare const anyNever: S.Schema<any, never>
declare const neverAny: S.Schema<never, any>
declare const anyNeverPropertySignature: S.PropertySignature<"?:", any, never, "?:", never, false, never>
declare const neverAnyPropertySignature: S.PropertySignature<"?:", never, never, "?:", any, false, never>

declare const aContext: S.Schema<string, string, "a">
declare const bContext: S.Schema<number, number, "b">
declare const cContext: S.Schema<boolean, boolean, "c">

class A extends S.Class<A>("A")({ a: S.NonEmptyString }) {}

const ServiceA = Context.GenericTag<"ServiceA", string>("ServiceA")

// ---------------------------------------------
// SchemaClass
// ---------------------------------------------

// @ts-expect-error
export const instance: S.String = {}

// @ts-expect-error
new S.String()

// ---------------------------------------------
// Schema.Encoded
// ---------------------------------------------

// $ExpectType never
hole<S.Schema.Encoded<typeof S.Never>>()

// $ExpectType string
hole<S.Schema.Encoded<typeof S.NumberFromString>>()

// ---------------------------------------------
// Schema.Type
// ---------------------------------------------

// $ExpectType never
hole<S.Schema.Type<typeof S.Never>>()

// $ExpectType number
hole<S.Schema.Type<typeof S.NumberFromString>>()

// ---------------------------------------------
// Schema.Context
// ---------------------------------------------

// $ExpectType never
hole<S.Schema.Context<typeof S.Never>>()

// $ExpectType "ctx"
hole<S.Schema.Context<S.Schema<number, string, "ctx">>>()

// ---------------------------------------------
// S.annotations
// ---------------------------------------------

// should allow to add custom string annotations to a schema
// $ExpectType SchemaClass<string, string, never>
S.String.annotations({ a: 1 })

// should allow to add custom symbol annotations to a schema
// $ExpectType SchemaClass<string, string, never>
S.String.annotations({ [Symbol.for("a")]: 1 })

/**
 * @category api interface
 * @since 1.0.0
 */
export interface AnnotatedString extends S.Annotable<AnnotatedString, string> {}

declare const AnnotatedString: AnnotatedString

// $ExpectType Schema<string, string, never>
hole<S.Schema<string>>().pipe(S.annotations({}))

// $ExpectType AnnotatedString
AnnotatedString.pipe(S.annotations({}))

// $ExpectType brand<filter<Schema<number, number, never>>, "Int">
S.Number.pipe(S.int(), S.brand("Int"), S.annotations({}))

// $ExpectType Struct<{ a: AnnotatedString; }>
S.Struct({ a: AnnotatedString }).pipe(S.annotations({}))

// $ExpectType SchemaClass<A, { readonly a: string; }, never>
A.pipe(S.annotations({}))

// $ExpectType number & Brand<"Int">
S.Number.pipe(S.int(), S.brand("Int")).make(1)

// ---------------------------------------------
// Primitives
// ---------------------------------------------

// $ExpectType Schema<void, void, never>
S.asSchema(S.Void)

// $ExpectType typeof Void
S.Void

// $ExpectType Schema<undefined, undefined, never>
S.asSchema(S.Undefined)

// $ExpectType typeof Undefined
S.Undefined

// $ExpectType Schema<string, string, never>
S.asSchema(S.String)

// $ExpectType typeof String$
S.String

// $ExpectType Schema<number, number, never>
S.asSchema(S.Number)

// $ExpectType typeof Number$
S.Number

// $ExpectType Schema<boolean, boolean, never>
S.asSchema(S.Boolean)

// $ExpectType typeof Boolean$
S.Boolean

// $ExpectType Schema<bigint, bigint, never>
S.asSchema(S.BigIntFromSelf)

// $ExpectType typeof BigIntFromSelf
S.BigIntFromSelf

// $ExpectType Schema<bigint, string, never>
S.asSchema(S.BigInt)

// $ExpectType typeof BigInt$
S.BigInt

// $ExpectType Schema<symbol, symbol, never>
S.asSchema(S.SymbolFromSelf)

// $ExpectType typeof SymbolFromSelf
S.SymbolFromSelf

// $ExpectType Schema<symbol, string, never>
S.asSchema(S.Symbol)

// $ExpectType typeof Symbol$
S.Symbol

// $ExpectType Schema<unknown, unknown, never>
S.asSchema(S.Unknown)

// $ExpectType typeof Unknown
S.Unknown

// $ExpectType Schema<any, any, never>
S.asSchema(S.Any)

// $ExpectType typeof Any
S.Any

// $ExpectType Schema<object, object, never>
S.asSchema(S.Object)

// $ExpectType typeof Object$
S.Object

// ---------------------------------------------
// literals
// ---------------------------------------------

// $ExpectType Schema<null, null, never>
S.asSchema(S.Null)

// $ExpectType typeof Null
S.Null

// $ExpectType Never
S.Literal()

// $ExpectType Schema<"a", "a", never>
S.asSchema(S.Literal("a"))

// $ExpectType Literal<["a"]>
S.Literal("a")

// $ExpectType Schema<"a" | "b" | "c", "a" | "b" | "c", never>
S.asSchema(S.Literal("a", "b", "c"))

// $ExpectType Literal<["a", "b", "c"]>
S.Literal("a", "b", "c")

const literals: Array<"a" | "b" | "c"> = ["a", "b", "c"]

// $ExpectType Schema<"a" | "b" | "c", "a" | "b" | "c", never>
S.Literal(...literals)

// $ExpectType Literal<[1]>
S.Literal(1)

// $ExpectType Literal<[2n]>
S.Literal(2n) // bigint literal

// $ExpectType Literal<[true]>
S.Literal(true)

// $ExpectType Literal<["A", "B"]>
S.Literal("A", "B")

// $ExpectType readonly ["A", "B"]
S.Literal("A", "B").literals

// $ExpectType Literal<["A", "B"]>
S.Literal("A", "B").annotations({})

// ---------------------------------------------
// strings
// ---------------------------------------------

// $ExpectType filter<Schema<string, string, never>>
pipe(S.String, S.maxLength(5))

// $ExpectType filter<Schema<string, string, never>>
pipe(S.String, S.minLength(5))

// $ExpectType filter<Schema<string, string, never>>
pipe(S.String, S.length(5))

// $ExpectType filter<Schema<string, string, never>>
pipe(S.String, S.pattern(/a/))

// $ExpectType filter<Schema<string, string, never>>
pipe(S.String, S.startsWith("a"))

// $ExpectType filter<Schema<string, string, never>>
pipe(S.String, S.endsWith("a"))

// $ExpectType filter<Schema<string, string, never>>
pipe(S.String, S.includes("a"))

// $ExpectType filter<Schema<number, number, never>>
pipe(S.Number, S.greaterThan(5))

// $ExpectType filter<Schema<number, number, never>>
pipe(S.Number, S.greaterThanOrEqualTo(5))

// $ExpectType filter<Schema<number, number, never>>
pipe(S.Number, S.lessThan(5))

// $ExpectType filter<Schema<number, number, never>>
pipe(S.Number, S.lessThanOrEqualTo(5))

// $ExpectType filter<Schema<number, number, never>>
pipe(S.Number, S.int())

// $ExpectType filter<Schema<number, number, never>>
pipe(S.Number, S.nonNaN()) // not NaN

// $ExpectType filter<Schema<number, number, never>>
pipe(S.Number, S.finite()) // value must be finite, not Infinity or -Infinity

// ---------------------------------------------
// enums
// ---------------------------------------------

enum Fruits {
  Apple,
  Banana
}

// $ExpectType Schema<Fruits, Fruits, never>
S.asSchema(S.Enums(Fruits))

// $ExpectType Enums<typeof Fruits>
S.Enums(Fruits)

// $ExpectType typeof Fruits
S.Enums(Fruits).enums

// $ExpectType Fruits.Apple
S.Enums(Fruits).enums.Apple

// $ExpectType Fruits.Banana
S.Enums(Fruits).enums.Banana

// ---------------------------------------------
// NullOr
// ---------------------------------------------

// $ExpectType Schema<string | null, string | null, never>
S.asSchema(S.NullOr(S.String))

// $ExpectType NullOr<typeof String$>
S.NullOr(S.String)

// $ExpectType Schema<number | null, string | null, never>
S.asSchema(S.NullOr(S.NumberFromString))

// $ExpectType NullOr<typeof NumberFromString>
S.NullOr(S.NumberFromString)

// ---------------------------------------------
// Union
// ---------------------------------------------

// $ExpectType Union<[typeof String$, typeof Never]>
S.Union(S.String, S.Never)

// $ExpectType Union<[typeof String$, typeof Number$]>
S.Union(S.String, S.Number).annotations({})

// $ExpectType Schema<string | number, string | number, never>
S.asSchema(S.Union(S.String, S.Number))

// $ExpectType Union<[typeof String$, typeof Number$]>
S.Union(S.String, S.Number)

// $ExpectType Schema<number | boolean, string | boolean, never>
S.asSchema(S.Union(S.Boolean, S.NumberFromString))

// $ExpectType Union<[typeof Boolean$, typeof NumberFromString]>
S.Union(S.Boolean, S.NumberFromString)

// $ExpectType readonly [typeof String$, typeof Number$]
S.Union(S.String, S.Number).members

// ---------------------------------------------
// KeyOf
// ---------------------------------------------

// $ExpectType SchemaClass<"a" | "b", "a" | "b", never>
S.keyof(S.Struct({ a: S.String, b: S.NumberFromString }))

// ---------------------------------------------
// tuple
// ---------------------------------------------

// $ExpectType Schema<readonly [string, number], readonly [string, number], never>
S.asSchema(S.Tuple(S.String, S.Number))

// $ExpectType Tuple<[typeof String$, typeof Number$]>
S.Tuple(S.String, S.Number)

// $ExpectType Schema<readonly [string, number], readonly [string, string], never>
S.asSchema(S.Tuple(S.String, S.NumberFromString))

// $ExpectType Tuple<[typeof String$, typeof NumberFromString]>
S.Tuple(S.String, S.NumberFromString)

// $ExpectType readonly [typeof String$, typeof Number$]
S.Tuple(S.String, S.Number).elements

// $ExpectType readonly []
S.Tuple(S.String, S.Number).rest

// ---------------------------------------------
// tuple overloading / array overloading
// ---------------------------------------------

// $ExpectType Schema<readonly [string, ...number[], boolean], readonly [string, ...number[], boolean], never>
S.asSchema(S.Tuple([S.String], S.Number, S.Boolean))

// $ExpectType TupleType<readonly [typeof String$], [typeof Number$, typeof Boolean$]>
S.Tuple([S.String], S.Number, S.Boolean)

// $ExpectType readonly [typeof String$]
S.Tuple([S.String], S.Number).elements

// $ExpectType readonly [typeof Number$]
S.Tuple([S.String], S.Number).rest

// $ExpectType readonly [typeof Number$, typeof Boolean$]
S.Tuple([S.String], S.Number, S.Boolean).rest

// ---------------------------------------------
// optionalElement
// ---------------------------------------------

// $ExpectType Schema<readonly [string, number, boolean?], readonly [string, number, boolean?], never>
S.asSchema(S.Tuple(S.String, S.Number, S.optionalElement(S.Boolean)))

// $ExpectType Tuple<[typeof String$, typeof Number$, Element<typeof Boolean$, "?">]>
S.Tuple(S.String, S.Number, S.optionalElement(S.Boolean))

// $ExpectType Schema<readonly [string, number, number?], readonly [string, string, string?], never>
S.asSchema(S.Tuple(S.String, S.NumberFromString, S.optionalElement(S.NumberFromString)))

// $ExpectType Tuple<[typeof String$, typeof NumberFromString, Element<typeof NumberFromString, "?">]>
S.Tuple(S.String, S.NumberFromString, S.optionalElement(S.NumberFromString))

// ---------------------------------------------
// array
// ---------------------------------------------

// $ExpectType Schema<readonly number[], readonly number[], never>
S.asSchema(S.Array(S.Number))

// $ExpectType Array$<typeof Number$>
S.Array(S.Number)

// $ExpectType Array$<typeof Number$>
S.Number.pipe(S.Array)

// $ExpectType Schema<readonly number[], readonly string[], never>
S.asSchema(S.Array(S.NumberFromString))

// $ExpectType Array$<typeof NumberFromString>
S.Array(S.NumberFromString)

// $ExpectType typeof String$
S.Array(S.String).value

// $ExpectType readonly []
S.Array(S.String).elements

// $ExpectType readonly [typeof String$]
S.Array(S.String).rest

// ---------------------------------------------
// NonEmptyArray
// ---------------------------------------------

// $ExpectType Schema<readonly [number, ...number[]], readonly [number, ...number[]], never>
S.asSchema(S.NonEmptyArray(S.Number))

// $ExpectType NonEmptyArray<typeof Number$>
S.NonEmptyArray(S.Number)

// $ExpectType NonEmptyArray<typeof Number$>
S.Number.pipe(S.NonEmptyArray)

// $ExpectType Schema<readonly [number, ...number[]], readonly [string, ...string[]], never>
S.asSchema(S.NonEmptyArray(S.NumberFromString))

// $ExpectType NonEmptyArray<typeof NumberFromString>
S.NonEmptyArray(S.NumberFromString)

// $ExpectType typeof String$
S.NonEmptyArray(S.String).value

// $ExpectType readonly [typeof String$]
S.NonEmptyArray(S.String).elements

// $ExpectType readonly [typeof String$]
S.NonEmptyArray(S.String).rest

// ---------------------------------------------
// Struct
// ---------------------------------------------

// $ExpectType { readonly a: typeof String$; readonly b: typeof Number$; }
S.Struct({ a: S.String, b: S.Number }).fields

// $ExpectType readonly []
S.Struct({ a: S.String, b: S.Number }).records

// $ExpectType { readonly a: typeof String$; readonly b: typeof Number$; }
S.Struct({ a: S.String, b: S.Number }).annotations({}).fields

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
S.asSchema(S.Struct({ a: S.String, b: S.Number }))

// $ExpectType Struct<{ a: typeof String$; b: typeof Number$; }>
S.Struct({ a: S.String, b: S.Number })

// $ExpectType Struct<{ a: typeof String$; b: typeof NumberFromString; }>
const MyModel = S.Struct({ a: S.String, b: S.NumberFromString })

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: string; }, never>
S.asSchema(MyModel)

// $ExpectType { readonly a: string; readonly b: number; }
export type MyModelType = S.Schema.Type<typeof MyModel>

// $ExpectType { readonly a: string; readonly b: string; }
export type MyModelEncoded = S.Schema.Encoded<typeof MyModel>

// $ExpectType Schema<{ readonly a: never; }, { readonly a: never; }, never>
S.asSchema(S.Struct({ a: S.Never }))

// $ExpectType Struct<{ a: typeof Never; }>
S.Struct({ a: S.Never })

// $ExpectType Schema<{ readonly [x: string]: number; readonly a: number; }, { readonly [x: string]: string; readonly a: string; }, never>
S.asSchema(S.Struct({ a: S.NumberFromString }, { key: S.String, value: S.NumberFromString }))

// $ExpectType TypeLiteral<{ a: typeof NumberFromString; }, readonly [{ readonly key: typeof String$; readonly value: typeof NumberFromString; }]>
S.Struct({ a: S.NumberFromString }, { key: S.String, value: S.NumberFromString })

// $ExpectType readonly [{ readonly key: typeof String$; readonly value: typeof Number$; }]
S.Struct({ a: S.Number }, { key: S.String, value: S.Number }).records

// $ExpectType readonly [{ readonly key: typeof String$; readonly value: typeof Number$; }, { readonly key: typeof Symbol$; readonly value: typeof Number$; }]
S.Struct({ a: S.Number }, { key: S.String, value: S.Number }, { key: S.Symbol, value: S.Number }).records

// $ExpectType Schema<{ readonly a: any; }, { readonly a: never; }, never>
S.asSchema(S.Struct({ a: anyNever }))

// $ExpectType Schema<{ readonly a: never; }, { readonly a: any; }, never>
S.asSchema(S.Struct({ a: neverAny }))

// $ExpectType Schema<{ readonly a?: any; }, { readonly a?: never; }, never>
S.asSchema(S.Struct({ a: anyNeverPropertySignature }))

// $ExpectType Schema<{ readonly a?: never; }, { readonly a?: any; }, never>
S.asSchema(S.Struct({ a: neverAnyPropertySignature }))

// ---------------------------------------------
// optional
// ---------------------------------------------

// $ExpectType optional<typeof Never>
S.optional(S.Never)

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: boolean | undefined; }, { readonly a: string; readonly b: number; readonly c?: boolean | undefined; }, never>
S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optional(S.Boolean) }))

// $ExpectType Struct<{ a: typeof String$; b: typeof Number$; c: optional<typeof Boolean$>; }>
S.Struct({ a: S.String, b: S.Number, c: S.optional(S.Boolean) })

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: number | undefined; }, { readonly a: string; readonly b: number; readonly c?: string | undefined; }, never>
S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optional(S.NumberFromString) }))

// $ExpectType Struct<{ a: typeof String$; b: typeof Number$; c: optional<typeof NumberFromString>; }>
S.Struct({ a: S.String, b: S.Number, c: S.optional(S.NumberFromString) })

// $ExpectType Schema<{ readonly a?: string | undefined; }, { readonly a?: string | undefined; }, never>
S.asSchema(S.Struct({ a: S.String.pipe(S.optional) }))

// $ExpectType Struct<{ a: optional<typeof String$>; }>
S.Struct({ a: S.String.pipe(S.optional) })

// ---------------------------------------------
// optionalWith { exact: true }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a?: never; }, { readonly a?: never; }, never>
S.asSchema(S.Struct({ a: S.optionalWith(S.Never, { exact: true }) }))

// $ExpectType Struct<{ a: optionalWith<typeof Never, { exact: true; }>; }>
S.Struct({ a: S.optionalWith(S.Never, { exact: true }) })

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: boolean; }, { readonly a: string; readonly b: number; readonly c?: boolean; }, never>
S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.Boolean, { exact: true }) }))

// $ExpectType Struct<{ a: typeof String$; b: typeof Number$; c: optionalWith<typeof Boolean$, { exact: true; }>; }>
S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.Boolean, { exact: true }) })

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: number; }, { readonly a: string; readonly b: number; readonly c?: string; }, never>
S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.NumberFromString, { exact: true }) }))

// $ExpectType Struct<{ a: typeof String$; b: typeof Number$; c: optionalWith<typeof NumberFromString, { exact: true; }>; }>
S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.NumberFromString, { exact: true }) })

// $ExpectType Schema<{ readonly a?: never; }, { readonly a?: never; }, never>
S.asSchema(S.Struct({ a: S.optionalWith(S.Never, { exact: true }) }))

// $ExpectType Struct<{ a: optionalWith<typeof Never, { exact: true; }>; }>
S.Struct({ a: S.optionalWith(S.Never, { exact: true }) })

// $ExpectType Schema<{ readonly a?: string; }, { readonly a?: string; }, never>
S.asSchema(S.Struct({ a: S.String.pipe(S.optionalWith({ exact: true })) }))

// $ExpectType Struct<{ a: optionalWith<typeof String$, { exact: true; }>; }>
S.Struct({ a: S.String.pipe(S.optionalWith({ exact: true })) })

// ---------------------------------------------
// optionalWith - Errors
// ---------------------------------------------

// @ts-expect-error
S.optionalWith(S.String, { as: "Option", default: () => "" })

// @ts-expect-error
S.optionalWith(S.String, { as: "Option", exact: true, onNoneEncoding: () => Option.some(null) })

// @ts-expect-error
S.String.pipe(S.optionalWith({ as: "Option", exact: true, onNoneEncoding: () => Option.some(null) }))

// @ts-expect-error
S.optionalWith(S.String, { as: "Option", exact: true, nullable: true, onNoneEncoding: () => Option.some(1) })

// @ts-expect-error
S.optionalWith(S.String, { as: "Option", onNoneEncoding: () => Option.some(null) })

// @ts-expect-error
S.String.pipe(S.optionalWith({ as: "Option", onNoneEncoding: () => Option.some(null) }))

// @ts-expect-error
S.String.pipe(S.optionalWith({ as: "Option", exact: true, nullable: true, onNoneEncoding: () => Option.some(1) }))

// @ts-expect-error
S.optionalWith(S.String, { as: "Option", nullable: true, onNoneEncoding: () => Option.some(1) })

// @ts-expect-error
S.String.pipe(S.optionalWith({ as: "Option", nullable: true, onNoneEncoding: () => Option.some(1) }))

// @ts-expect-error
S.optionalWith(S.String, { as: null })

// @ts-expect-error
S.optionalWith(S.String, { default: null })

// ---------------------------------------------
// optionalWith used in a generic context
// ---------------------------------------------

type TypeWithValue<Value extends S.Schema.Any> = { value: S.optionalWith<Value, { nullable: true }> }

const makeTypeWithValue = <Value extends S.Schema.Any>(value: Value): TypeWithValue<Value> => ({
  value: S.optionalWith(value, { nullable: true })
})

// $ExpectType TypeWithValue<typeof String$>
makeTypeWithValue(S.String)

// ---------------------------------------------
// optionalWith { exact: true, default: () => A }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: boolean; }, { readonly a: string; readonly b: number; readonly c?: boolean; }, never>
S.asSchema(S.Struct({
  a: S.String,
  b: S.Number,
  c: S.optionalWith(S.Boolean, { exact: true, default: () => false })
}))

// $ExpectType Struct<{ a: typeof String$; b: typeof Number$; c: optionalWith<typeof Boolean$, { exact: true; default: () => false; }>; }>
S.Struct({
  a: S.String,
  b: S.Number,
  c: S.optionalWith(S.Boolean, { exact: true, default: () => false })
})

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: number; }, { readonly a: string; readonly b: number; readonly c?: string; }, never>
S.asSchema(S.Struct({
  a: S.String,
  b: S.Number,
  c: S.optionalWith(S.NumberFromString, { exact: true, default: () => 0 })
}))

// $ExpectType Struct<{ a: typeof String$; b: typeof Number$; c: optionalWith<typeof NumberFromString, { exact: true; default: () => number; }>; }>
S.Struct({
  a: S.String,
  b: S.Number,
  c: S.optionalWith(S.NumberFromString, { exact: true, default: () => 0 })
})

// $ExpectType Struct<{ a: optionalWith<Literal<["a", "b"]>, { default: () => "a"; exact: true; }>; }>
S.Struct({ a: S.optionalWith(S.Literal("a", "b"), { default: () => "a", exact: true }) })

// $ExpectType Schema<{ readonly a: "a" | "b"; }, { readonly a?: "a" | "b"; }, never>
S.asSchema(S.Struct({ a: S.Literal("a", "b").pipe(S.optionalWith({ default: () => "a", exact: true })) }))

// $ExpectType Struct<{ a: optionalWith<Literal<["a", "b"]>, { default: () => "a"; exact: true; }>; }>
S.Struct({ a: S.Literal("a", "b").pipe(S.optionalWith({ default: () => "a", exact: true })) })

// ---------------------------------------------
// optionalWith { default: () => A }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: boolean; }, { readonly a: string; readonly b: number; readonly c?: boolean | undefined; }, never>
S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.Boolean, { default: () => false }) }))

// $ExpectType Struct<{ a: typeof String$; b: typeof Number$; c: optionalWith<typeof Boolean$, { default: () => false; }>; }>
S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.Boolean, { default: () => false }) })

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: number; }, { readonly a: string; readonly b: number; readonly c?: string | undefined; }, never>
S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.NumberFromString, { default: () => 0 }) }))

// $ExpectType Struct<{ a: typeof String$; b: typeof Number$; c: optionalWith<typeof NumberFromString, { default: () => number; }>; }>
S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.NumberFromString, { default: () => 0 }) })

// $ExpectType Struct<{ a: optionalWith<Literal<["a", "b"]>, { default: () => "a"; }>; }>
S.Struct({ a: S.optionalWith(S.Literal("a", "b"), { default: () => "a" }) })

// $ExpectType Schema<{ readonly a: "a" | "b"; }, { readonly a?: "a" | "b" | undefined; }, never>
S.asSchema(S.Struct({ a: S.Literal("a", "b").pipe(S.optionalWith({ default: () => "a" })) }))

// $ExpectType Struct<{ a: optionalWith<Literal<["a", "b"]>, { default: () => "a"; }>; }>
S.Struct({ a: S.Literal("a", "b").pipe(S.optionalWith({ default: () => "a" })) })

// ---------------------------------------------
// optionalWith { exact: true, nullable: true, default: () => A }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: number; }, { readonly a?: string | null; }, never>
S.asSchema(S.Struct({ a: S.optionalWith(S.NumberFromString, { exact: true, nullable: true, default: () => 0 }) }))

// $ExpectType Struct<{ a: optionalWith<typeof NumberFromString, { exact: true; nullable: true; default: () => number; }>; }>
S.Struct({ a: S.optionalWith(S.NumberFromString, { exact: true, nullable: true, default: () => 0 }) })

// ---------------------------------------------
// optionalWith { nullable: true, default: () => A }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: number; }, { readonly a?: string | null | undefined; }, never>
S.asSchema(S.Struct({ a: S.optionalWith(S.NumberFromString, { nullable: true, default: () => 0 }) }))

// $ExpectType Struct<{ a: optionalWith<typeof NumberFromString, { nullable: true; default: () => number; }>; }>
S.Struct({ a: S.optionalWith(S.NumberFromString, { nullable: true, default: () => 0 }) })

// $ExpectType Schema<{ readonly a: number; }, { readonly a?: string | null; }, never>
S.asSchema(S.Struct({ a: S.optionalWith(S.NumberFromString, { exact: true, nullable: true, default: () => 0 }) }))

// $ExpectType Struct<{ a: optionalWith<typeof NumberFromString, { exact: true; nullable: true; default: () => number; }>; }>
S.Struct({ a: S.optionalWith(S.NumberFromString, { exact: true, nullable: true, default: () => 0 }) })

// $ExpectType Struct<{ a: optionalWith<Literal<["a", "b"]>, { default: () => "a"; nullable: true; }>; }>
S.Struct({ a: S.optionalWith(S.Literal("a", "b"), { default: () => "a", nullable: true }) })

// $ExpectType Schema<{ readonly a: "a" | "b"; }, { readonly a?: "a" | "b" | null | undefined; }, never>
S.asSchema(S.Struct({ a: S.Literal("a", "b").pipe(S.optionalWith({ default: () => "a", nullable: true })) }))

// $ExpectType Struct<{ a: optionalWith<Literal<["a", "b"]>, { default: () => "a"; nullable: true; }>; }>
S.Struct({ a: S.Literal("a", "b").pipe(S.optionalWith({ default: () => "a", nullable: true })) })

// ---------------------------------------------
// optionalWith { exact: true, as: "Option" }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: Option<boolean>; }, { readonly a: string; readonly b: number; readonly c?: boolean; }, never>
S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.Boolean, { exact: true, as: "Option" }) }))

// $ExpectType Struct<{ a: typeof String$; b: typeof Number$; c: optionalWith<typeof Boolean$, { exact: true; as: "Option"; }>; }>
S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.Boolean, { exact: true, as: "Option" }) })

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: Option<number>; }, { readonly a: string; readonly b: number; readonly c?: string; }, never>
S.asSchema(S.Struct({
  a: S.String,
  b: S.Number,
  c: S.optionalWith(S.NumberFromString, { exact: true, as: "Option" })
}))

// $ExpectType Struct<{ a: typeof String$; b: typeof Number$; c: optionalWith<typeof NumberFromString, { exact: true; as: "Option"; }>; }>
S.Struct({
  a: S.String,
  b: S.Number,
  c: S.optionalWith(S.NumberFromString, { exact: true, as: "Option" })
})

// $ExpectType Schema<{ readonly a: Option<string>; }, { readonly a?: string; }, never>
S.asSchema(S.Struct({ a: S.String.pipe(S.optionalWith({ exact: true, as: "Option" })) }))

// $ExpectType Struct<{ a: optionalWith<typeof String$, { exact: true; as: "Option"; }>; }>
S.Struct({ a: S.String.pipe(S.optionalWith({ exact: true, as: "Option" })) })

// ---------------------------------------------
// optionalWith { as: "Option" }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: Option<boolean>; }, { readonly a: string; readonly b: number; readonly c?: boolean | undefined; }, never>
S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.Boolean, { as: "Option" }) }))

// $ExpectType Struct<{ a: typeof String$; b: typeof Number$; c: optionalWith<typeof Boolean$, { as: "Option"; }>; }>
S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.Boolean, { as: "Option" }) })

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: Option<number>; }, { readonly a: string; readonly b: number; readonly c?: string | undefined; }, never>
S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.NumberFromString, { as: "Option" }) }))

// $ExpectType Struct<{ a: typeof String$; b: typeof Number$; c: optionalWith<typeof NumberFromString, { as: "Option"; }>; }>
S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.NumberFromString, { as: "Option" }) })

// $ExpectType Schema<{ readonly a: Option<string>; }, { readonly a?: string | undefined; }, never>
S.asSchema(S.Struct({ a: S.String.pipe(S.optionalWith({ as: "Option" })) }))

// $ExpectType Struct<{ a: optionalWith<typeof String$, { as: "Option"; }>; }>
S.Struct({ a: S.String.pipe(S.optionalWith({ as: "Option" })) })

// ---------------------------------------------
// optionalWith { nullable: true, as: "Option" }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: Option<number>; }, { readonly a?: string | null | undefined; }, never>
S.asSchema(S.Struct({ a: S.optionalWith(S.NumberFromString, { nullable: true, as: "Option" }) }))

// $ExpectType Struct<{ a: optionalWith<typeof NumberFromString, { nullable: true; as: "Option"; }>; }>
S.Struct({ a: S.optionalWith(S.NumberFromString, { nullable: true, as: "Option" }) })

// $ExpectType Schema<{ readonly a: Option<string>; }, { readonly a?: string | null | undefined; }, never>
S.asSchema(S.Struct({ a: S.String.pipe(S.optionalWith({ nullable: true, as: "Option" })) }))

// $ExpectType Struct<{ a: optionalWith<typeof String$, { nullable: true; as: "Option"; }>; }>
S.Struct({ a: S.String.pipe(S.optionalWith({ nullable: true, as: "Option" })) })

// ---------------------------------------------
// optionalWith { exact: true, nullable: true, as: "Option" }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: Option<number>; }, { readonly a?: string | null; }, never>
S.asSchema(S.Struct({ a: S.optionalWith(S.NumberFromString, { exact: true, nullable: true, as: "Option" }) }))

// $ExpectType Struct<{ a: optionalWith<typeof NumberFromString, { exact: true; nullable: true; as: "Option"; }>; }>
S.Struct({ a: S.optionalWith(S.NumberFromString, { exact: true, nullable: true, as: "Option" }) })

// $ExpectType Schema<{ readonly a: Option<string>; }, { readonly a?: string | null; }, never>
S.asSchema(S.Struct({ a: S.String.pipe(S.optionalWith({ exact: true, nullable: true, as: "Option" })) }))

// $ExpectType Struct<{ a: optionalWith<typeof String$, { exact: true; nullable: true; as: "Option"; }>; }>
S.Struct({ a: S.String.pipe(S.optionalWith({ exact: true, nullable: true, as: "Option" })) })

// ---------------------------------------------
// pick
// ---------------------------------------------

// @ts-expect-error
pipe(S.Struct({ a: S.propertySignature(S.Number).pipe(S.fromKey("c")) }), S.pick("a"))

// $ExpectType SchemaClass<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
pipe(S.Struct({ a: S.String, b: S.Number, c: S.Boolean }), S.pick("a", "b"))

// $ExpectType SchemaClass<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: string; }, never>
pipe(S.Struct({ a: S.String, b: S.NumberFromString, c: S.Boolean }), S.pick("a", "b"))

// ---------------------------------------------
// pick - optionalWith
// ---------------------------------------------

// $ExpectType SchemaClass<{ readonly a?: string; readonly b: number; }, { readonly a?: string; readonly b: number; }, never>
pipe(
  S.Struct({ a: S.optionalWith(S.String, { exact: true }), b: S.Number, c: S.Boolean }),
  S.pick("a", "b")
)

// $ExpectType SchemaClass<{ readonly a?: string; readonly b: number; }, { readonly a?: string; readonly b: string; }, never>
pipe(
  S.Struct({ a: S.optionalWith(S.String, { exact: true }), b: S.NumberFromString, c: S.Boolean }),
  S.pick("a", "b")
)

// $ExpectType SchemaClass<{ readonly a: string; readonly b: number; }, { readonly a?: string; readonly b: string; }, never>
pipe(
  S.Struct({
    a: S.optionalWith(S.String, { exact: true, default: () => "" }),
    b: S.NumberFromString,
    c: S.Boolean
  }),
  S.pick("a", "b")
)

// ---------------------------------------------
// Struct.pick
// ---------------------------------------------

// @ts-expect-error
S.Struct({ a: S.String }).pick("c")

// @ts-expect-error
S.Struct({ a: S.propertySignature(S.String).pipe(S.fromKey("c")) }).pick("c")

// $ExpectType Struct<{ a: typeof String$; b: typeof Number$; }>
S.Struct({ a: S.String, b: S.Number, c: S.Boolean }).pick("a", "b")

// ---------------------------------------------
// omit
// ---------------------------------------------

// @ts-expect-error
pipe(S.Struct({ a: S.propertySignature(S.Number).pipe(S.fromKey("c")) }), S.omit("a"))

// $ExpectType SchemaClass<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
pipe(S.Struct({ a: S.String, b: S.Number, c: S.Boolean }), S.omit("c"))

// $ExpectType SchemaClass<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: string; }, never>
pipe(S.Struct({ a: S.String, b: S.NumberFromString, c: S.Boolean }), S.omit("c"))

// ---------------------------------------------
// omit - optionalWith
// ---------------------------------------------

// $ExpectType SchemaClass<{ readonly a?: string; readonly b: number; }, { readonly a?: string; readonly b: number; }, never>
pipe(S.Struct({ a: S.optionalWith(S.String, { exact: true }), b: S.Number, c: S.Boolean }), S.omit("c"))

// $ExpectType SchemaClass<{ readonly a?: string; readonly b: number; }, { readonly a?: string; readonly b: string; }, never>
pipe(
  S.Struct({ a: S.optionalWith(S.String, { exact: true }), b: S.NumberFromString, c: S.Boolean }),
  S.omit("c")
)

// $ExpectType SchemaClass<{ readonly a: string; readonly b: number; }, { readonly a?: string; readonly b: string; }, never>
pipe(
  S.Struct({
    a: S.optionalWith(S.String, { exact: true, default: () => "" }),
    b: S.NumberFromString,
    c: S.Boolean
  }),
  S.omit("c")
)

// ---------------------------------------------
// Struct.omit
// ---------------------------------------------

// @ts-expect-error
S.Struct({ a: S.String }).omit("c")

// @ts-expect-error
S.Struct({ a: S.propertySignature(S.String).pipe(S.fromKey("c")) }).omit("c")

// $ExpectType Struct<{ a: typeof String$; b: typeof Number$; }>
S.Struct({ a: S.String, b: S.Number, c: S.Boolean }).omit("c")

// $ExpectType Struct<{ a: typeof Number$; }>
S.Struct({ a: S.Number, b: S.Number.pipe(S.propertySignature, S.fromKey("c")) }).omit("b")

// ---------------------------------------------
// brand
// ---------------------------------------------

// $ExpectType Schema<number & Brand<"Int">, number, never>
S.asSchema(pipe(S.Number, S.int(), S.brand("Int")))

// $ExpectType Schema<number & Brand<"Int">, number, never>
S.asSchema(pipe(S.Number, S.int(), S.brand("Int"))).annotations({})

// $ExpectType brand<filter<Schema<number, number, never>>, "Int">
pipe(S.Number, S.int(), S.brand("Int"))

// $ExpectType Schema<number & Brand<"Int">, string, never>
S.asSchema(pipe(S.NumberFromString, S.int(), S.brand("Int")))

// $ExpectType brand<filter<Schema<number, string, never>>, "Int">
pipe(S.NumberFromString, S.int(), S.brand("Int"))

// ---------------------------------------------
// partial
// ---------------------------------------------

// $ExpectType SchemaClass<{ readonly a?: string | undefined; readonly b?: number | undefined; }, { readonly a?: string | undefined; readonly b?: number | undefined; }, never>
S.partial(S.Struct({ a: S.String, b: S.Number }))

// $ExpectType SchemaClass<{ readonly a?: string | undefined; readonly b?: number | undefined; }, { readonly a?: string | undefined; readonly b?: string | undefined; }, never>
S.partial(S.Struct({ a: S.String, b: S.NumberFromString }))

// $ExpectType SchemaClass<{ readonly a?: string | undefined; readonly b?: number | undefined; }, { readonly a?: string | undefined; readonly b?: number | undefined; }, never>
S.Struct({ a: S.String, b: S.Number }).pipe(S.partial)

// ---------------------------------------------
// partialWith
// ---------------------------------------------

// $ExpectType SchemaClass<{ readonly a?: string; readonly b?: number; }, { readonly a?: string; readonly b?: number; }, never>
S.partialWith(S.Struct({ a: S.String, b: S.Number }), { exact: true })

// $ExpectType SchemaClass<{ readonly a?: string; readonly b?: number; }, { readonly a?: string; readonly b?: string; }, never>
S.partialWith(S.Struct({ a: S.String, b: S.NumberFromString }), { exact: true })

// $ExpectType SchemaClass<{ readonly a?: string; readonly b?: number; }, { readonly a?: string; readonly b?: number; }, never>
S.Struct({ a: S.String, b: S.Number }).pipe(S.partialWith({ exact: true }))

// ---------------------------------------------
// Required + optionalWith
// ---------------------------------------------

// $ExpectType SchemaClass<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
S.required(
  S.Struct({ a: S.optionalWith(S.String, { exact: true }), b: S.optionalWith(S.Number, { exact: true }) })
)

// $ExpectType SchemaClass<{ readonly a: string; readonly b: number; readonly c: number; }, { readonly b: string; readonly a: string; readonly c: string; }, never>
S.required(
  S.Struct({
    a: S.optionalWith(S.String, { exact: true }),
    b: S.NumberFromString,
    c: S.optionalWith(S.NumberFromString, { exact: true })
  })
)

// ---------------------------------------------
// Records
// ---------------------------------------------

// $ExpectType Schema<string, string, never>
S.asSchema(S.Record({ key: S.String, value: S.String }).key)

// $ExpectType typeof String$
S.Record({ key: S.String, value: S.String }).key

// $ExpectType Schema<string, string, never>
S.asSchema(S.Record({ key: S.String, value: S.String }).value)

// $ExpectType typeof String$
S.Record({ key: S.String, value: S.String }).value

// $ExpectType Schema<{ readonly [x: string]: string; }, { readonly [x: string]: string; }, never>
S.asSchema(S.Record({ key: S.String, value: S.String }))

// $ExpectType Record$<typeof String$, typeof String$>
S.Record({ key: S.String, value: S.String })

// $ExpectType Schema<{ readonly [x: string]: number; }, { readonly [x: string]: string; }, never>
S.asSchema(S.Record({ key: S.String, value: S.NumberFromString }))

// $ExpectType Record$<typeof String$, typeof NumberFromString>
S.Record({ key: S.String, value: S.NumberFromString })

// $ExpectType Schema<{ readonly [x: string]: string; }, { readonly [x: string]: string; }, never>
S.asSchema(S.Record({ key: pipe(S.String, S.minLength(2)), value: S.String }))

// $ExpectType Record$<filter<Schema<string, string, never>>, typeof String$>
S.Record({ key: pipe(S.String, S.minLength(2)), value: S.String })

// $ExpectType Schema<{ readonly a: string; readonly b: string; }, { readonly a: string; readonly b: string; }, never>
S.asSchema(S.Record({ key: S.Union(S.Literal("a"), S.Literal("b")), value: S.String }))

// $ExpectType Record$<Union<[Literal<["a"]>, Literal<["b"]>]>, typeof String$>
S.Record({ key: S.Union(S.Literal("a"), S.Literal("b")), value: S.String })

// $ExpectType Schema<{ readonly [x: symbol]: string; }, { readonly [x: symbol]: string; }, never>
S.asSchema(S.Record({ key: S.SymbolFromSelf, value: S.String }))

// $ExpectType Record$<typeof SymbolFromSelf, typeof String$>
S.Record(S.Record({ key: S.SymbolFromSelf, value: S.String }))

// $ExpectType Schema<{ readonly [x: `a${string}`]: string; }, { readonly [x: `a${string}`]: string; }, never>
S.asSchema(S.Record({ key: S.TemplateLiteral(S.Literal("a"), S.String), value: S.String }))

// $ExpectType Record$<TemplateLiteral<`a${string}`>, typeof String$>
S.Record({ key: S.TemplateLiteral(S.Literal("a"), S.String), value: S.String })

// $ExpectType Schema<{ readonly [x: string & Brand<"UserId">]: string; }, { readonly [x: string]: string; }, never>
S.asSchema(S.Record({ key: S.String.pipe(S.brand("UserId")), value: S.String }))

// $ExpectType Record$<brand<typeof String$, "UserId">, typeof String$>
S.Record({ key: S.String.pipe(S.brand("UserId")), value: S.String })

// $ExpectType Schema<{ readonly [x: string & Brand<symbol>]: string; }, { readonly [x: string]: string; }, never>
S.asSchema(S.Record({ key: S.String.pipe(S.brand(Symbol.for("UserId"))), value: S.String }))

// $ExpectType Record$<brand<typeof String$, symbol>, typeof String$>
S.Record({ key: S.String.pipe(S.brand(Symbol.for("UserId"))), value: S.String })

// ---------------------------------------------
// extend
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: string; } & { readonly c: string; }, { readonly a: string; readonly b: string; } & { readonly c: string; }, never>
S.asSchema(pipe(
  S.Struct({ a: S.String, b: S.String }),
  S.extend(S.Struct({ c: S.String }))
))

// $ExpectType extend<Struct<{ a: typeof String$; b: typeof String$; }>, Struct<{ c: typeof String$; }>>
pipe(
  S.Struct({ a: S.String, b: S.String }),
  S.extend(S.Struct({ c: S.String }))
)

// $ExpectType Schema<{ readonly a: string; readonly b: string; } & { readonly c: string; }, { readonly a: string; readonly b: string; } & { readonly c: string; }, never>
S.asSchema(S.extend(S.Struct({ a: S.String, b: S.String }), S.Struct({ c: S.String })))

// $ExpectType extend<Struct<{ a: typeof String$; b: typeof String$; }>, Struct<{ c: typeof String$; }>>
S.extend(S.Struct({ a: S.String, b: S.String }), S.Struct({ c: S.String }))

// $ExpectType Schema<{ readonly a: string; } & ({ readonly b: number; } | { readonly c: boolean; }), { readonly a: string; } & ({ readonly b: number; } | { readonly c: boolean; }), never>
S.asSchema(S.extend(S.Struct({ a: S.String }), S.Union(S.Struct({ b: S.Number }), S.Struct({ c: S.Boolean }))))

// $ExpectType extend<Struct<{ a: typeof String$; }>, Union<[Struct<{ b: typeof Number$; }>, Struct<{ c: typeof Boolean$; }>]>>
S.extend(S.Struct({ a: S.String }), S.Union(S.Struct({ b: S.Number }), S.Struct({ c: S.Boolean })))

// $ExpectType Schema<{ readonly a: string; readonly b: string; } & { readonly c: string; } & { readonly [x: string]: string; }, { readonly a: string; readonly b: string; } & { readonly c: string; } & { readonly [x: string]: string; }, never>
S.asSchema(pipe(
  S.Struct({ a: S.String, b: S.String }),
  S.extend(S.Struct({ c: S.String })),
  S.extend(S.Record({ key: S.String, value: S.String }))
))

// $ExpectType extend<extend<Struct<{ a: typeof String$; b: typeof String$; }>, Struct<{ c: typeof String$; }>>, Record$<typeof String$, typeof String$>>
pipe(
  S.Struct({ a: S.String, b: S.String }),
  S.extend(S.Struct({ c: S.String })),
  S.extend(S.Record({ key: S.String, value: S.String }))
)

// ---------------------------------------------
// suspend
// ---------------------------------------------

interface SuspendIEqualA {
  readonly a: number
  readonly as: ReadonlyArray<SuspendIEqualA>
}

const SuspendIEqualA = S.Struct({
  a: S.Number,
  as: S.Array(S.suspend((): S.Schema<SuspendIEqualA> => SuspendIEqualA))
})

// $ExpectType { readonly a: typeof Number$; readonly as: Array$<suspend<SuspendIEqualA, SuspendIEqualA, never>>; }
SuspendIEqualA.fields

interface SuspendINotEqualA_A {
  readonly a: string
  readonly as: ReadonlyArray<SuspendINotEqualA_A>
}

interface SuspendINotEqualA_I {
  readonly a: number
  readonly as: ReadonlyArray<SuspendINotEqualA_I>
}

const SuspendINotEqualA = S.Struct({
  a: S.NumberFromString,
  as: S.Array(S.suspend((): S.Schema<SuspendINotEqualA_I, SuspendINotEqualA_A> => SuspendINotEqualA))
})

// $ExpectType { readonly a: typeof NumberFromString; readonly as: Array$<suspend<SuspendINotEqualA_I, SuspendINotEqualA_A, never>>; }
SuspendINotEqualA.fields

// ---------------------------------------------
// rename
// ---------------------------------------------

// $ExpectType SchemaClass<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
S.rename(S.Struct({ a: S.String, b: S.Number }), {})

// $ExpectType SchemaClass<{ readonly c: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
S.rename(S.Struct({ a: S.String, b: S.Number }), { a: "c" })

// $ExpectType SchemaClass<{ readonly c: string; readonly d: number; }, { readonly a: string; readonly b: number; }, never>
S.rename(S.Struct({ a: S.String, b: S.Number }), { a: "c", b: "d" })

const a = Symbol.for("effect/Schema/dtslint/a")

// $ExpectType SchemaClass<{ readonly [a]: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
S.rename(S.Struct({ a: S.String, b: S.Number }), { a })

// @ts-expect-error
S.rename(S.Struct({ a: S.String, b: S.Number }), { c: "d" })

// @ts-expect-error
S.rename(S.Struct({ a: S.String, b: S.Number }), { a: "c", d: "e" })

// $ExpectType SchemaClass<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
S.Struct({ a: S.String, b: S.Number }).pipe(S.rename({}))

// $ExpectType SchemaClass<{ readonly c: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
S.Struct({ a: S.String, b: S.Number }).pipe(S.rename({ a: "c" }))

// @ts-expect-error
S.Struct({ a: S.String, b: S.Number }).pipe(S.rename({ c: "d" }))

// @ts-expect-error
S.Struct({ a: S.String, b: S.Number }).pipe(S.rename({ a: "c", d: "e" }))

// ---------------------------------------------
// InstanceOf
// ---------------------------------------------

class Test {
  constructor(readonly name: string) {}
}

// $ExpectType Schema<Test, Test, never>
S.asSchema(S.instanceOf(Test))

// $ExpectType instanceOf<Test>
S.instanceOf(Test)

// ---------------------------------------------
// TemplateLiteral
// ---------------------------------------------

// $ExpectType TemplateLiteral<`${string}0`>
S.TemplateLiteral(S.String, 0)

// $ExpectType TemplateLiteral<`${string}true`>
S.TemplateLiteral(S.String, true)

// $ExpectType TemplateLiteral<`${string}null`>
S.TemplateLiteral(S.String, null)

// $ExpectType TemplateLiteral<`${string}1`>
S.TemplateLiteral(S.String, 1n)

// $ExpectType TemplateLiteral<`${string}a` | `${string}0`>
S.TemplateLiteral(S.String, S.Literal("a", 0))

// $ExpectType TemplateLiteral<`a${string}`>
S.TemplateLiteral(S.Literal("a"), S.String)

// $ExpectType TemplateLiteral<`a${string}`>
S.TemplateLiteral("a", S.String)

// $ExpectType TemplateLiteral<`${string}/`>
S.TemplateLiteral(S.String, S.Literal("/"))

// $ExpectType TemplateLiteral<`${string}/`>
S.TemplateLiteral(S.String, "/")

// $ExpectType TemplateLiteral<`${string}/${number}`>
S.TemplateLiteral(S.String, S.Literal("/"), S.Number)

// $ExpectType TemplateLiteral<`${string}/${number}`>
S.TemplateLiteral(S.String, "/", S.Number)

// example from https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html
const EmailLocaleIDs = S.Literal("welcome_email", "email_heading")
const FooterLocaleIDs = S.Literal("footer_title", "footer_sendoff")

// $ExpectType TemplateLiteral<"welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id">
S.TemplateLiteral(S.Union(EmailLocaleIDs, FooterLocaleIDs), S.Literal("_id"))

// $ExpectType TemplateLiteral<"welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id">
S.TemplateLiteral(S.Union(EmailLocaleIDs, FooterLocaleIDs), "_id")

// ---------------------------------------------
// attachPropertySignature
// ---------------------------------------------

// $ExpectType SchemaClass<{ readonly radius: number; readonly kind: "circle"; }, { readonly radius: number; }, never>
pipe(S.Struct({ radius: S.Number }), S.attachPropertySignature("kind", "circle"))

// $ExpectType SchemaClass<{ readonly radius: number; readonly kind: "circle"; }, { readonly radius: string; }, never>
pipe(S.Struct({ radius: S.NumberFromString }), S.attachPropertySignature("kind", "circle"))

// $ExpectType SchemaClass<{ readonly radius: number; readonly kind: "circle"; }, { readonly radius: number; }, never>
S.attachPropertySignature(S.Struct({ radius: S.Number }), "kind", "circle")

// $ExpectType SchemaClass<{ readonly radius: number; readonly kind: "circle"; }, { readonly radius: string; }, never>
S.attachPropertySignature(S.Struct({ radius: S.NumberFromString }), "kind", "circle")

const taggedStruct = <Name extends AST.LiteralValue | symbol, Fields extends S.Struct.Fields>(
  name: Name,
  fields: Fields
) => S.Struct(fields).pipe(S.attachPropertySignature("_tag", name))

// $ExpectType SchemaClass<{ readonly a: string; readonly _tag: "A"; }, { readonly a: string; }, never>
taggedStruct("A", { a: S.String })

// ---------------------------------------------
// filter
// ---------------------------------------------

S.String.pipe(S.filter((
  _s // $ExpectType string
) => undefined))

S.String.pipe(S.filter((
  _s // $ExpectType string
) => "err"))

S.String.pipe(S.filter((
  _s // $ExpectType string
) => true))

S.String.pipe(S.filter((
  _s // $ExpectType string
) => false))

S.String.pipe(S.filter((
  s, // $ExpectType string
  _,
  ast // $ExpectType Refinement<AST>
) => new ParseResult.Type(ast, s, "err")))

const predicateFilter1 = (u: unknown): boolean => typeof u === "string"
const FromFilter = S.Union(S.String, S.Number)

// $ExpectType filter<Union<[typeof String$, typeof Number$]>>
pipe(FromFilter, S.filter(predicateFilter1))

const FromRefinement = S.Struct({
  a: S.optionalWith(S.String, { exact: true }),
  b: S.optionalWith(S.Number, { exact: true })
})

// $ExpectType refine<{ readonly a?: string; readonly b?: number; } & { readonly b: number; }, Schema<unknown, { readonly a?: string; readonly b?: number; }, never>>
pipe(FromRefinement, S.filter(S.is(S.Struct({ b: S.Number }))))

const LiteralFilter = S.Literal("a", "b")
const predicateFilter2 = (u: unknown): u is "a" => typeof u === "string" && u === "a"

// $ExpectType refine<"a", Schema<unknown, "a" | "b", never>>
pipe(LiteralFilter, S.filter(predicateFilter2))

// $ExpectType refine<"a", Schema<unknown, "a" | "b", never>>
pipe(LiteralFilter, S.filter(S.is(S.Literal("a"))))

// $ExpectType refine<never, Schema<unknown, "a" | "b", never>>
pipe(LiteralFilter, S.filter(S.is(S.Literal("c"))))

declare const UnionFilter: S.Schema<
  { readonly a: string } | { readonly b: string },
  { readonly a: string } | { readonly b: string },
  never
>

// $ExpectType refine<({ readonly a: string; } | { readonly b: string; }) & { readonly b: string; }, Schema<unknown, { readonly a: string; } | { readonly b: string; }, never>>
pipe(UnionFilter, S.filter(S.is(S.Struct({ b: S.String }))))

// $ExpectType refine<number & Brand<"MyNumber">, Schema<number, number, never>>
pipe(S.Number, S.filter((n): n is number & Brand.Brand<"MyNumber"> => n > 0))

// annotations
pipe(
  S.String,
  S.filter(
    (
      _s // $ExpectType string
    ) => true,
    {
      arbitrary: (
        _from // $ExpectType LazyArbitrary<string>
      ) =>
      (fc) => fc.string(),
      pretty: (
        _from // $ExpectType Pretty<string>
      ) =>
      (s) => s,
      equivalence: () =>
      (
        _a, // $ExpectType string
        _b // $ExpectType string
      ) => true
    }
  )
)

// ---------------------------------------------
// filterEffect
// ---------------------------------------------

// $ExpectType filterEffect<typeof String$, never>
S.String.pipe(S.filterEffect((
  _s // $ExpectType string
) => Effect.succeed(undefined)))

// $ExpectType filterEffect<typeof String$, "ServiceA">
S.String.pipe(S.filterEffect((s) =>
  Effect.gen(function*() {
    const str = yield* ServiceA
    return str === s
  })
))

// $ExpectType filterEffect<typeof String$, never>
S.filterEffect(S.String, (
  _s // $ExpectType string
) => Effect.succeed(undefined))

// $ExpectType filterEffect<typeof String$, "ServiceA">
S.filterEffect(S.String, (s) =>
  Effect.gen(function*() {
    const str = yield* ServiceA
    return str === s
  }))

// ---------------------------------------------
// compose
// ---------------------------------------------

// A -> B -> C

// $ExpectType SchemaClass<readonly number[], string, never>
S.compose(S.split(","), S.Array(S.NumberFromString))

// $ExpectType SchemaClass<readonly number[], string, never>
S.split(",").pipe(S.compose(S.Array(S.NumberFromString)))

// $ExpectType SchemaClass<readonly number[], string, never>
S.compose(S.split(","), S.Array(S.NumberFromString), { strict: true })

// $ExpectType SchemaClass<readonly number[], string, never>
S.split(",").pipe(S.compose(S.Array(S.NumberFromString), { strict: true }))

// @ts-expect-error
S.compose(S.String, S.Number)

// @ts-expect-error
S.String.pipe(S.compose(S.Number))

// A -> B+, B -> C

// $ExpectType SchemaClass<number, string | null, never>
S.compose(S.Union(S.Null, S.String), S.NumberFromString)

// $ExpectType SchemaClass<number, string | null, never>
S.compose(S.Union(S.Null, S.String), S.NumberFromString, { strict: false })

// $ExpectType SchemaClass<number, string | null, never>
S.Union(S.Null, S.String).pipe(S.compose(S.NumberFromString))

// $ExpectType SchemaClass<number, string | null, never>
S.Union(S.Null, S.String).pipe(S.compose(S.NumberFromString, { strict: false }))

// A -> B, B+ -> C

// $ExpectType SchemaClass<number | null, string, never>
S.compose(S.NumberFromString, S.Union(S.Null, S.Number))

// $ExpectType SchemaClass<number | null, string, never>
S.compose(S.NumberFromString, S.Union(S.Null, S.Number), { strict: false })

// $ExpectType SchemaClass<number | null, string, never>
S.NumberFromString.pipe(S.compose(S.Union(S.Null, S.Number)))

// $ExpectType SchemaClass<number | null, string, never>
S.NumberFromString.pipe(S.compose(S.Union(S.Null, S.Number), { strict: false }))

// A -> B -> C -> D

// $ExpectType SchemaClass<number, string, never>
S.compose(S.String, S.Number, { strict: false })

// $ExpectType SchemaClass<number, string, never>
S.String.pipe(S.compose(S.Number, { strict: false }))

// ---------------------------------------------
// FromBrand
// ---------------------------------------------

type Eur = number & Brand.Brand<"Eur">
const Eur = Brand.nominal<Eur>()

// $ExpectType BrandSchema<number & Brand<"Eur">, number, never>
S.Number.pipe(S.fromBrand(Eur))

// ---------------------------------------------
// mutable
// ---------------------------------------------

// $ExpectType Schema<string, string, never>
S.asSchema(S.mutable(S.String))

// mutable<typeof String$>
S.mutable(S.String)

// $ExpectType Schema<{ a: number; }, { a: number; }, never>
S.asSchema(S.mutable(S.Struct({ a: S.Number })))

// $ExpectType mutable<Struct<{ a: typeof Number$; }>>
S.mutable(S.Struct({ a: S.Number }))

// $ExpectType Schema<{ [x: string]: number; }, { [x: string]: number; }, never>
S.asSchema(S.mutable(S.Record({ key: S.String, value: S.Number })))

// $ExpectType mutable<Record$<typeof String$, typeof Number$>>
S.mutable(S.Record({ key: S.String, value: S.Number }))

// $ExpectType Schema<string[], string[], never>
S.asSchema(S.mutable(S.Array(S.String)))

// $ExpectType mutable<Array$<typeof String$>>
S.mutable(S.Array(S.String))

// $ExpectType Schema<string[] | { a: number; }, string[] | { a: number; }, never>
S.asSchema(S.mutable(S.Union(S.Struct({ a: S.Number }), S.Array(S.String))))

// $ExpectType mutable<Union<[Struct<{ a: typeof Number$; }>, Array$<typeof String$>]>>
S.mutable(S.Union(S.Struct({ a: S.Number }), S.Array(S.String)))

// $ExpectType mutable<filter<Schema<readonly string[], readonly string[], never>>>
S.mutable(S.Array(S.String).pipe(S.maxItems(2)))

// $ExpectType Schema<string[], string[], never>
S.asSchema(S.mutable(S.suspend(() => S.Array(S.String))))

// $ExpectType mutable<suspend<readonly string[], readonly string[], never>>
S.mutable(S.suspend(() => S.Array(S.String)))

// $ExpectType Schema<string[], string[], never>
S.asSchema(S.mutable(S.transform(S.Array(S.String), S.Array(S.String), { decode: identity, encode: identity })))

// $ExpectType mutable<transform<Array$<typeof String$>, Array$<typeof String$>>>
S.mutable(S.transform(S.Array(S.String), S.Array(S.String), { decode: identity, encode: identity }))

// $ExpectType Schema<{ a: string; } & { b: number; }, { a: string; } & { b: number; }, never>
S.asSchema(S.extend(S.mutable(S.Struct({ a: S.String })), S.mutable(S.Struct({ b: S.Number }))))

// $ExpectType Schema<{ a: string; } & { readonly b: number; }, { a: string; } & { readonly b: number; }, never>
S.asSchema(S.extend(S.mutable(S.Struct({ a: S.String })), S.Struct({ b: S.Number })))

// $ExpectType Schema<{ a: string; } & { [x: string]: string; }, { a: string; } & { [x: string]: string; }, never>
S.asSchema(S.extend(S.mutable(S.Struct({ a: S.String })), S.mutable(S.Record({ key: S.String, value: S.String }))))

// $ExpectType Schema<{ a: string; } & { readonly [x: string]: string; }, { a: string; } & { readonly [x: string]: string; }, never>
S.asSchema(S.extend(S.mutable(S.Struct({ a: S.String })), S.Record({ key: S.String, value: S.String })))

// ---------------------------------------------
// transform
// ---------------------------------------------

// $ExpectType transform<typeof String$, typeof Number$>
const transform1 = S.String.pipe(S.transform(S.Number, { decode: (s) => s.length, encode: (n) => String(n) }))

// $ExpectType typeof String$
transform1.from

// $ExpectType typeof Number$
transform1.to

// $ExpectType transform<typeof String$, typeof Number$>
transform1.annotations({})

// $ExpectType Schema<number, string, never>
S.asSchema(transform1)

// $ExpectType Schema<number, string, never>
S.asSchema(S.String.pipe(S.transform(S.Number, { strict: false, decode: (s) => s, encode: (n) => n })))

// $ExpectType transform<typeof String$, typeof Number$>
S.String.pipe(S.transform(S.Number, { strict: false, decode: (s) => s, encode: (n) => n }))

// @ts-expect-error
S.String.pipe(S.transform(S.Number, (s) => s, (n) => String(n)))

// @ts-expect-error
S.String.pipe(S.transform(S.Number, (s) => s.length, (n) => n))

// should receive the fromI value other than the fromA value
S.transform(
  S.Struct({
    a: S.String,
    b: S.NumberFromString
  }),
  S.Struct({
    a: S.NumberFromString
  }),
  {
    strict: true,
    decode: ({
      a, // $ExpectType string
      b: _b // $ExpectType number
    }, i // $ExpectType { readonly a: string; readonly b: string; }
    ) => ({ a: a + i.b }),
    encode: (
      i, // $ExpectType { readonly a: string; }
      a // $ExpectType { readonly a: number; }
    ) => ({ ...i, b: a.a * 2 })
  }
)

// ---------------------------------------------
// transformOrFail
// ---------------------------------------------

// $ExpectType transformOrFail<typeof String$, typeof Number$, never>
const transformOrFail1 = S.String.pipe(
  S.transformOrFail(
    S.Number,
    { decode: (s) => ParseResult.succeed(s.length), encode: (n) => ParseResult.succeed(String(n)) }
  )
)

// $ExpectType typeof String$
transformOrFail1.from

// $ExpectType typeof Number$
transformOrFail1.to

// $ExpectType transformOrFail<typeof String$, typeof Number$, never>
transformOrFail1.annotations({})

// $ExpectType Schema<number, string, never>
S.asSchema(transformOrFail1)

// $ExpectType Schema<number, string, never>
S.asSchema(S.String.pipe(
  S.transformOrFail(
    S.Number,
    { strict: false, decode: (s) => ParseResult.succeed(s), encode: (n) => ParseResult.succeed(String(n)) }
  )
))

// $ExpectType transformOrFail<typeof String$, typeof Number$, never>
S.String.pipe(
  S.transformOrFail(
    S.Number,
    { strict: false, decode: (s) => ParseResult.succeed(s), encode: (n) => ParseResult.succeed(String(n)) }
  )
)

S.String.pipe(
  // @ts-expect-error
  S.transformOrFail(S.Number, (s) => ParseResult.succeed(s), (n) => ParseResult.succeed(String(n)))
)

S.String.pipe(
  // @ts-expect-error
  S.transformOrFail(S.Number, (s) => ParseResult.succeed(s.length), (n) => ParseResult.succeed(n))
)

// should receive the fromI value other than the fromA value
S.transformOrFail(
  S.Struct({
    a: S.String,
    b: S.NumberFromString
  }),
  S.Struct({
    a: S.NumberFromString
  }),
  {
    strict: true,
    decode: (
      {
        a, // $ExpectType string
        b: _b // $ExpectType number
      },
      _options,
      _ast,
      i // $ExpectType { readonly a: string; readonly b: string; }
    ) => ParseResult.succeed({ a: a + i.b }),
    encode: (
      i, // $ExpectType { readonly a: string; }
      _options,
      _ast,
      a // $ExpectType { readonly a: number; }
    ) => ParseResult.succeed({ ...i, b: a.a * 2 })
  }
)

// ---------------------------------------------
// transformLiteral
// ---------------------------------------------

// $ExpectType Schema<"a", 0, never>
S.asSchema(S.transformLiteral(0, "a"))

// $ExpectType transformLiteral<"a", 0>
S.transformLiteral(0, "a")

// ---------------------------------------------
// transformLiterals
// ---------------------------------------------

// $ExpectType Schema<"a" | "b", 0 | 1, never>
S.asSchema(S.transformLiterals([0, "a"], [1, "b"]))

// $ExpectType Union<[transformLiteral<"a", 0>, transformLiteral<"b", 1>]>
S.transformLiterals([0, "a"], [1, "b"])

// $ExpectType transformLiteral<"a", 0>
S.transformLiterals([0, "a"])

const pairs: Array<readonly [0 | 1, "a" | "b"]> = [[0, "a"], [1, "b"]]

// $ExpectType Schema<"a" | "b", 0 | 1, never>
S.transformLiterals(...pairs)

// ---------------------------------------------
// BigDecimal
// ---------------------------------------------

// $ExpectType Schema<BigDecimal, string, never>
S.asSchema(S.BigDecimal)

// $ExpectType typeof BigDecimal
S.BigDecimal

// $ExpectType Schema<BigDecimal, BigDecimal, never>
S.asSchema(S.BigDecimalFromSelf)

// $ExpectType typeof BigDecimalFromSelf
S.BigDecimalFromSelf

// $ExpectType Schema<BigDecimal, number, never>
S.asSchema(S.BigDecimalFromNumber)

// $ExpectType typeof BigDecimalFromNumber
S.BigDecimalFromNumber

// ---------------------------------------------
// Duration
// ---------------------------------------------

// $ExpectType Schema<Duration, readonly [seconds: number, nanos: number], never>
S.asSchema(S.Duration)

// $ExpectType typeof Duration
S.Duration

// $ExpectType Schema<Duration, Duration, never>
S.asSchema(S.DurationFromSelf)

// $ExpectType typeof DurationFromSelf
S.DurationFromSelf

// $ExpectType Schema<Duration, number, never>
S.asSchema(S.DurationFromMillis)

// $ExpectType typeof DurationFromMillis
S.DurationFromMillis

// $ExpectType Schema<Duration, bigint, never>
S.asSchema(S.DurationFromNanos)

// $ExpectType typeof DurationFromNanos
S.DurationFromNanos

// ---------------------------------------------
// Redacted
// ---------------------------------------------

// $ExpectType Schema<Redacted<number>, string, never>
S.asSchema(S.Redacted(S.NumberFromString))

// $ExpectType Redacted<typeof NumberFromString>
S.Redacted(S.NumberFromString)

// $ExpectType Schema<Redacted<number>, Redacted<string>, never>
S.asSchema(S.RedactedFromSelf(S.NumberFromString))

// $ExpectType RedactedFromSelf<typeof NumberFromString>
S.RedactedFromSelf(S.NumberFromString)

// ---------------------------------------------
// propertySignature
// ---------------------------------------------

// $ExpectType propertySignature<typeof String$>
S.propertySignature(S.String)

// $ExpectType propertySignature<typeof String$>
S.propertySignature(S.String).annotations({})

// ---------------------------------------------
// PropertySignature .annotations({}) method
// ---------------------------------------------

// $ExpectType optional<typeof String$>
S.optional(S.String).annotations({})

// ---------------------------------------------
// Pluck
// ---------------------------------------------

// @ts-expect-error
S.pluck(S.Struct({ a: S.propertySignature(S.Number).pipe(S.fromKey("c")) }), "a")

// $ExpectType Schema<string, { readonly a: string; }, never>
S.pluck(S.Struct({ a: S.String, b: S.Number }), "a")

// $ExpectType Schema<string, { readonly a: string; }, never>
pipe(S.Struct({ a: S.String, b: S.Number }), S.pluck("a"))

// ---------------------------------------------
// Head
// ---------------------------------------------

// $ExpectType SchemaClass<Option<number>, readonly number[], never>
S.head(S.Array(S.Number))

// ---------------------------------------------
// HeadOrElse
// ---------------------------------------------

// $ExpectType SchemaClass<number, readonly number[], never>
S.headOrElse(S.Array(S.Number))

// ---------------------------------------------
// TaggedClass
// ---------------------------------------------

class MyTaggedClass extends S.TaggedClass<MyTaggedClass>()("MyTaggedClass", {
  a: S.String
}) {}

// $ExpectType [props: { readonly a: string; }, options?: MakeOptions | undefined]
hole<ConstructorParameters<typeof MyTaggedClass>>()

// $ExpectType { readonly a: string; readonly _tag: "MyTaggedClass"; }
hole<S.Schema.Encoded<typeof MyTaggedClass>>()

// $ExpectType MyTaggedClass
hole<S.Schema.Type<typeof MyTaggedClass>>()

class VoidTaggedClass extends S.TaggedClass<VoidTaggedClass>()("VoidTaggedClass", {}) {}

// $ExpectType [props?: void | {}, options?: MakeOptions | undefined]
hole<ConstructorParameters<typeof VoidTaggedClass>>()

// $ExpectType Schema<{ readonly a: string; readonly _tag: "MyTaggedClass"; }, { readonly a: string; readonly _tag: "MyTaggedClass"; }, never>
S.asSchema(S.Struct(MyTaggedClass.fields))

// $ExpectType [props: { readonly a: string; readonly _tag?: "MyTaggedClass"; }, options?: MakeOptions | undefined]
hole<Parameters<S.Struct<typeof MyTaggedClass.fields>["make"]>>()

// ---------------------------------------------
// TaggedError
// ---------------------------------------------

class MyTaggedError extends S.TaggedError<MyTaggedError>()("MyTaggedError", {
  a: S.String
}) {}

// $ExpectType Schema<{ readonly a: string; readonly _tag: "MyTaggedError"; }, { readonly a: string; readonly _tag: "MyTaggedError"; }, never>
S.asSchema(S.Struct(MyTaggedError.fields))

// $ExpectType [props: { readonly a: string; readonly _tag?: "MyTaggedError"; }, options?: MakeOptions | undefined]
hole<Parameters<S.Struct<typeof MyTaggedError.fields>["make"]>>()

// ---------------------------------------------
// TaggedRequest
// ---------------------------------------------

class MyTaggedRequest extends S.TaggedRequest<MyTaggedRequest>()("MyTaggedRequest", {
  failure: S.String,
  success: S.Number,
  payload: {
    a: S.String
  }
}) {}

// $ExpectType Schema<{ readonly a: string; readonly _tag: "MyTaggedRequest"; }, { readonly a: string; readonly _tag: "MyTaggedRequest"; }, never>
S.asSchema(S.Struct(MyTaggedRequest.fields))

// $ExpectType [props: { readonly a: string; readonly _tag?: "MyTaggedRequest"; }, options?: MakeOptions | undefined]
hole<Parameters<S.Struct<typeof MyTaggedRequest.fields>["make"]>>()

// ---------------------------------------------
// Struct.Type
// ---------------------------------------------

export const StructTypeTest1 = <S extends S.Schema.Any>(
  input: S.Struct.Type<{ s: S }>
) => {
  input // $ExpectType Type<{ s: S; }>
}

// $ExpectType {}
hole<Simplify<S.Struct.Type<{}>>>()

// $ExpectType { readonly a: number; }
hole<Simplify<S.Struct.Type<{ a: S.Schema<number, string> }>>>()

// $ExpectType { readonly a: number; readonly b: number; }
hole<
  Simplify<
    S.Struct.Type<
      { a: S.Schema<number, string>; b: S.PropertySignature<":", number, never, ":", string, false, "context"> }
    >
  >
>()

// $ExpectType { readonly a: number; readonly b: number; }
hole<
  Simplify<
    S.Struct.Type<
      { a: S.Schema<number, string>; b: S.PropertySignature<":", number, never, "?:", string, false, "context"> }
    >
  >
>()

// $ExpectType { readonly a: number; readonly b: number; }
hole<
  Simplify<
    S.Struct.Type<
      { a: S.Schema<number, string>; b: S.PropertySignature<":", number, "c", ":", string, false, "context"> }
    >
  >
>()

// $ExpectType { readonly a: number; readonly b: number; }
hole<
  Simplify<
    S.Struct.Type<
      { a: S.Schema<number, string>; b: S.PropertySignature<":", number, "c", "?:", string, false, "context"> }
    >
  >
>()

// $ExpectType { readonly a: number; readonly b?: number; }
hole<
  Simplify<
    S.Struct.Type<
      { a: S.Schema<number, string>; b: S.PropertySignature<"?:", number, never, ":", string, false, "context"> }
    >
  >
>()

// $ExpectType { readonly a: number; readonly b?: number; }
hole<
  Simplify<
    S.Struct.Type<
      { a: S.Schema<number, string>; b: S.PropertySignature<"?:", number, never, "?:", string, false, "context"> }
    >
  >
>()

// $ExpectType { readonly a: number; readonly b?: number; }
hole<
  Simplify<
    S.Struct.Type<
      { a: S.Schema<number, string>; b: S.PropertySignature<"?:", number, "c", ":", string, false, "context"> }
    >
  >
>()

// $ExpectType { readonly a: number; readonly b?: number; }
hole<
  Simplify<
    S.Struct.Type<
      { a: S.Schema<number, string>; b: S.PropertySignature<"?:", number, "c", "?:", string, false, "context"> }
    >
  >
>()

// ---------------------------------------------
// Struct.Encoded
// ---------------------------------------------

export const StructEncodedTest1 = <S extends S.Schema.Any>(
  input: S.Struct.Encoded<{ s: S }>
) => {
  input // $ExpectType Encoded<{ s: S; }>
}

// $ExpectType {}
hole<Simplify<S.Struct.Encoded<{}>>>()

// $ExpectType { readonly a: string; }
hole<Simplify<S.Struct.Encoded<{ a: S.Schema<number, string> }>>>()

// $ExpectType { readonly a: string; readonly b: string; }
hole<
  Simplify<
    S.Struct.Encoded<
      { a: S.Schema<number, string>; b: S.PropertySignature<":", number, never, ":", string, false, "context"> }
    >
  >
>()

// $ExpectType { readonly a: string; readonly b?: string; }
hole<
  Simplify<
    S.Struct.Encoded<
      { a: S.Schema<number, string>; b: S.PropertySignature<":", number, never, "?:", string, false, "context"> }
    >
  >
>()

// $ExpectType { readonly a: string; readonly c: string; }
hole<
  Simplify<
    S.Struct.Encoded<
      { a: S.Schema<number, string>; b: S.PropertySignature<":", number, "c", ":", string, false, "context"> }
    >
  >
>()

// $ExpectType { readonly a: string; readonly c?: string; }
hole<
  Simplify<
    S.Struct.Encoded<
      { a: S.Schema<number, string>; b: S.PropertySignature<":", number, "c", "?:", string, false, "context"> }
    >
  >
>()

// $ExpectType { readonly a: string; readonly b: string; }
hole<
  Simplify<
    S.Struct.Encoded<
      { a: S.Schema<number, string>; b: S.PropertySignature<"?:", number, never, ":", string, false, "context"> }
    >
  >
>()

// $ExpectType { readonly a: string; readonly b?: string; }
hole<
  Simplify<
    S.Struct.Encoded<
      { a: S.Schema<number, string>; b: S.PropertySignature<"?:", number, never, "?:", string, false, "context"> }
    >
  >
>()

// $ExpectType { readonly a: string; readonly c: string; }
hole<
  Simplify<
    S.Struct.Encoded<
      { a: S.Schema<number, string>; b: S.PropertySignature<"?:", number, "c", ":", string, false, "context"> }
    >
  >
>()

// $ExpectType { readonly a: string; readonly c?: string; }
hole<
  Simplify<
    S.Struct.Encoded<
      { a: S.Schema<number, string>; b: S.PropertySignature<"?:", number, "c", "?:", string, false, "context"> }
    >
  >
>()

// ---------------------------------------------
// OptionFromSelf
// ---------------------------------------------

// $ExpectType Schema<Option<number>, Option<number>, never>
S.asSchema(S.OptionFromSelf(S.Number))

// $ExpectType OptionFromSelf<typeof Number$>
S.OptionFromSelf(S.Number)

// $ExpectType Schema<Option<number>, Option<string>, never>
S.asSchema(S.OptionFromSelf(S.NumberFromString))

// $ExpectType OptionFromSelf<typeof NumberFromString>
S.OptionFromSelf(S.NumberFromString)

// ---------------------------------------------
// Option
// ---------------------------------------------

// $ExpectType Schema<Option<number>, OptionEncoded<number>, never>
S.asSchema(S.Option(S.Number))

// $ExpectType Option<typeof Number$>
S.Option(S.Number)

// $ExpectType Schema<Option<number>, OptionEncoded<string>, never>
S.asSchema(S.Option(S.NumberFromString))

// $ExpectType Option<typeof NumberFromString>
S.Option(S.NumberFromString)

// ---------------------------------------------
// OptionFromNullOr
// ---------------------------------------------

// $ExpectType Schema<Option<number>, number | null, never>
S.asSchema(S.OptionFromNullOr(S.Number))

// $ExpectType OptionFromNullOr<typeof Number$>
S.OptionFromNullOr(S.Number)

// $ExpectType Schema<Option<number>, string | null, never>
S.asSchema(S.OptionFromNullOr(S.NumberFromString))

// $ExpectType OptionFromNullOr<typeof NumberFromString>
S.OptionFromNullOr(S.NumberFromString)

// ---------------------------------------------
// OptionFromUndefinedOr
// ---------------------------------------------

// $ExpectType Schema<Option<number>, string | undefined, never>
S.asSchema(S.OptionFromUndefinedOr(S.NumberFromString))

// $ExpectType OptionFromUndefinedOr<typeof NumberFromString>
S.OptionFromUndefinedOr(S.NumberFromString)

// ---------------------------------------------
// OptionFromNullishOr
// ---------------------------------------------

// $ExpectType Schema<Option<number>, string | null | undefined, never>
S.asSchema(S.OptionFromNullishOr(S.NumberFromString, null))

// $ExpectType OptionFromNullishOr<typeof NumberFromString>
S.OptionFromNullishOr(S.NumberFromString, undefined)

// ---------------------------------------------
// EitherFromSelf
// ---------------------------------------------

// $ExpectType Schema<Either<number, string>, Either<string, string>, never>
S.asSchema(S.EitherFromSelf({ right: S.NumberFromString, left: S.String }))

// $ExpectType EitherFromSelf<typeof NumberFromString, typeof String$>
S.EitherFromSelf({ right: S.NumberFromString, left: S.String })

// $ExpectType EitherFromSelf<typeof String$, typeof Never>
S.EitherFromSelf({ right: S.String, left: S.Never })

// $ExpectType EitherFromSelf<typeof Never, typeof String$>
S.EitherFromSelf({ right: S.Never, left: S.String })

// ---------------------------------------------
// Either
// ---------------------------------------------

// $ExpectType Schema<Either<number, string>, EitherEncoded<string, string>, never>
S.asSchema(S.Either({ right: S.NumberFromString, left: S.String }))

// $ExpectType Either<typeof NumberFromString, typeof String$>
S.Either({ right: S.NumberFromString, left: S.String })

// $ExpectType Either<typeof String$, typeof Never>
S.Either({ right: S.String, left: S.Never })

// $ExpectType Either<typeof Never, typeof String$>
S.Either({ right: S.Never, left: S.String })

// ---------------------------------------------
// EitherFromUnion
// ---------------------------------------------

// $ExpectType Schema<Either<number, boolean>, string | boolean, never>
S.asSchema(S.EitherFromUnion({ right: S.NumberFromString, left: S.Boolean }))

// $ExpectType EitherFromUnion<typeof NumberFromString, typeof Boolean$>
S.EitherFromUnion({ right: S.NumberFromString, left: S.Boolean })

// $ExpectType EitherFromUnion<typeof String$, typeof Never>
S.EitherFromUnion({ right: S.String, left: S.Never })

// $ExpectType EitherFromUnion<typeof Never, typeof String$>
S.EitherFromUnion({ right: S.Never, left: S.String })

// ---------------------------------------------
// ReadonlyMapFromSelf
// ---------------------------------------------

// $ExpectType Schema<ReadonlyMap<number, string>, ReadonlyMap<string, string>, never>
S.asSchema(S.ReadonlyMapFromSelf({ key: S.NumberFromString, value: S.String }))

// $ExpectType ReadonlyMapFromSelf<typeof NumberFromString, typeof String$>
S.ReadonlyMapFromSelf({ key: S.NumberFromString, value: S.String })

// ---------------------------------------------
// MapFromSelf
// ---------------------------------------------

// $ExpectType Schema<Map<number, string>, ReadonlyMap<string, string>, never>
S.asSchema(S.MapFromSelf({ key: S.NumberFromString, value: S.String }))

// $ExpectType MapFromSelf<typeof NumberFromString, typeof String$>
S.MapFromSelf({ key: S.NumberFromString, value: S.String })

// ---------------- -----------------------------
// ReadonlyMap
// ---------------------------------------------

// $ExpectType Schema<ReadonlyMap<number, string>, readonly (readonly [string, string])[], never>
S.asSchema(S.ReadonlyMap({ key: S.NumberFromString, value: S.String }))

// $ExpectType ReadonlyMap$<typeof NumberFromString, typeof String$>
S.ReadonlyMap({ key: S.NumberFromString, value: S.String })

// ---------------------------------------------
// Map
// ---------------------------------------------

// $ExpectType Schema<Map<number, string>, readonly (readonly [string, string])[], never>
S.asSchema(S.Map({ key: S.NumberFromString, value: S.String }))

// $ExpectType Map$<typeof NumberFromString, typeof String$>
S.Map({ key: S.NumberFromString, value: S.String })

// ---------------------------------------------
// HashMapFromSelf
// ---------------------------------------------

// $ExpectType Schema<HashMap<number, string>, HashMap<string, string>, never>
S.asSchema(S.HashMapFromSelf({ key: S.NumberFromString, value: S.String }))

// $ExpectType HashMapFromSelf<typeof NumberFromString, typeof String$>
S.HashMapFromSelf({ key: S.NumberFromString, value: S.String })

// ---------------------------------------------
// HashMap
// ---------------------------------------------

// $ExpectType Schema<HashMap<number, string>, readonly (readonly [string, string])[], never>
S.asSchema(S.HashMap({ key: S.NumberFromString, value: S.String }))

// $ExpectType HashMap<typeof NumberFromString, typeof String$>
S.HashMap({ key: S.NumberFromString, value: S.String })

// ---------------------------------------------
// ReadonlySetFromSelf
// ---------------------------------------------

// $ExpectType Schema<ReadonlySet<number>, ReadonlySet<string>, never>
S.asSchema(S.ReadonlySetFromSelf(S.NumberFromString))

// $ExpectType ReadonlySetFromSelf<typeof NumberFromString>
S.ReadonlySetFromSelf(S.NumberFromString)

// ---------------------------------------------
// SetFromSelf
// ---------------------------------------------

// $ExpectType Schema<Set<number>, ReadonlySet<string>, never>
S.asSchema(S.SetFromSelf(S.NumberFromString))

// $ExpectType SetFromSelf<typeof NumberFromString>
S.SetFromSelf(S.NumberFromString)

// ---------------------------------------------
// ReadonlySet
// ---------------------------------------------

// $ExpectType Schema<ReadonlySet<number>, readonly string[], never>
S.asSchema(S.ReadonlySet(S.NumberFromString))

// $ExpectType ReadonlySet$<typeof NumberFromString>
S.ReadonlySet(S.NumberFromString)

// ---------------------------------------------
// Set
// ---------------------------------------------

// $ExpectType Schema<Set<number>, readonly string[], never>
S.asSchema(S.Set(S.NumberFromString))

// $ExpectType Set$<typeof NumberFromString>
S.Set(S.NumberFromString)

// ---------------------------------------------
// HashSetFromSelf
// ---------------------------------------------

// $ExpectType Schema<HashSet<number>, HashSet<string>, never>
S.asSchema(S.HashSetFromSelf(S.NumberFromString))

// $ExpectType HashSetFromSelf<typeof NumberFromString>
S.HashSetFromSelf(S.NumberFromString)

// ---------------------------------------------
// HashSet
// ---------------------------------------------

// $ExpectType Schema<HashSet<number>, readonly string[], never>
S.asSchema(S.HashSet(S.NumberFromString))

// $ExpectType HashSet<typeof NumberFromString>
S.HashSet(S.NumberFromString)

// ---------------------------------------------
// ChunkFromSelf
// ---------------------------------------------

// $ExpectType Schema<Chunk<number>, Chunk<string>, never>
S.asSchema(S.ChunkFromSelf(S.NumberFromString))

// $ExpectType ChunkFromSelf<typeof NumberFromString>
S.ChunkFromSelf(S.NumberFromString)

// ---------------------------------------------
// Chunk
// ---------------------------------------------

// $ExpectType Schema<Chunk<number>, readonly string[], never>
S.asSchema(S.Chunk(S.NumberFromString))

// $ExpectType Chunk<typeof NumberFromString>
S.Chunk(S.NumberFromString)

// ---------------------------------------------
// NonEmptyChunkFromSelf
// ---------------------------------------------

// $ExpectType Schema<NonEmptyChunk<number>, NonEmptyChunk<string>, never>
S.asSchema(S.NonEmptyChunkFromSelf(S.NumberFromString))

// $ExpectType NonEmptyChunkFromSelf<typeof NumberFromString>
S.NonEmptyChunkFromSelf(S.NumberFromString)

// ---------------------------------------------
// NonEmptyChunk
// ---------------------------------------------

// $ExpectType Schema<NonEmptyChunk<number>, readonly [string, ...string[]], never>
S.asSchema(S.NonEmptyChunk(S.NumberFromString))

// $ExpectType NonEmptyChunk<typeof NumberFromString>
S.NonEmptyChunk(S.NumberFromString)

// ---------------------------------------------
// ListFromSelf
// ---------------------------------------------

// $ExpectType Schema<List<number>, List<string>, never>
S.asSchema(S.ListFromSelf(S.NumberFromString))

// $ExpectType ListFromSelf<typeof NumberFromString>
S.ListFromSelf(S.NumberFromString)

// ---------------------------------------------
// List
// ---------------------------------------------

// $ExpectType Schema<List<number>, readonly string[], never>
S.asSchema(S.List(S.NumberFromString))

// $ExpectType List<typeof NumberFromString>
S.List(S.NumberFromString)

// ---------------------------------------------
// ExitFromSelf
// ---------------------------------------------

// $ExpectType Schema<Exit<number, string>, Exit<number, string>, never>
S.asSchema(S.ExitFromSelf({ success: S.Number, failure: S.String, defect: S.Unknown }))

// $ExpectType ExitFromSelf<typeof Number$, typeof String$, typeof Unknown>
S.ExitFromSelf({ success: S.Number, failure: S.String, defect: S.Unknown })

// $ExpectType Schema<Exit<number, string>, Exit<number, string>, "a">
S.asSchema(S.ExitFromSelf({ success: S.Number, failure: S.String, defect: hole<S.Schema<unknown, unknown, "a">>() }))

// $ExpectType ExitFromSelf<typeof Number$, typeof String$, Schema<unknown, unknown, "a">>
S.ExitFromSelf({ success: S.Number, failure: S.String, defect: hole<S.Schema<unknown, unknown, "a">>() })

// $ExpectType Schema<{ readonly a: Exit<number, string>; }, { readonly a: Exit<number, string>; }, never>
S.asSchema(S.Struct({
  a: S.ExitFromSelf({
    success: S.Number,
    failure: S.String,
    defect: S.Unknown
  })
}))

// ---------------------------------------------
// Exit
// ---------------------------------------------

// $ExpectType Schema<Exit<number, string>, ExitEncoded<number, string, unknown>, never>
S.asSchema(S.Exit({ success: S.Number, failure: S.String, defect: S.Defect }))

// $ExpectType Exit<typeof Number$, typeof String$, Defect>
S.Exit({ success: S.Number, failure: S.String, defect: S.Defect })

// $ExpectType Schema<Exit<number, string>, ExitEncoded<number, string, unknown>, "a">
S.asSchema(S.Exit({ success: S.Number, failure: S.String, defect: hole<S.Schema<unknown, unknown, "a">>() }))

// $ExpectType Exit<typeof Number$, typeof String$, Schema<unknown, unknown, "a">>
S.Exit({ success: S.Number, failure: S.String, defect: hole<S.Schema<unknown, unknown, "a">>() })

// $ExpectType Schema<{ readonly a: Exit<number, string>; }, { readonly a: ExitEncoded<number, string, unknown>; }, never>
S.asSchema(S.Struct({
  a: S.Exit({
    success: S.Number,
    failure: S.String,
    defect: S.Defect
  })
}))

// ---------------------------------------------
// CauseFromSelf
// ---------------------------------------------

// $ExpectType Schema<Cause<string>, Cause<string>, never>
S.asSchema(S.CauseFromSelf({ error: S.String, defect: S.Unknown }))

// $ExpectType CauseFromSelf<typeof String$, typeof Unknown>
S.CauseFromSelf({ error: S.String, defect: S.Unknown })

// $ExpectType Schema<Cause<string>, Cause<string>, "a">
S.asSchema(S.CauseFromSelf({ error: S.String, defect: hole<S.Schema<unknown, unknown, "a">>() }))

// $ExpectType CauseFromSelf<typeof String$, Schema<unknown, unknown, "a">>
S.CauseFromSelf({ error: S.String, defect: hole<S.Schema<unknown, unknown, "a">>() })

// $ExpectType Schema<{ readonly a: Cause<string>; }, { readonly a: Cause<string>; }, never>
S.asSchema(S.Struct({
  a: S.CauseFromSelf({ error: S.String, defect: S.Unknown })
}))

// ---------------------------------------------
// Cause
// ---------------------------------------------

// $ExpectType Schema<Cause<string>, CauseEncoded<string, unknown>, never>
S.asSchema(S.Cause({ error: S.String, defect: S.Defect }))

// $ExpectType Cause<typeof String$, Defect>
S.Cause({ error: S.String, defect: S.Defect })

// $ExpectType Schema<Cause<string>, CauseEncoded<string, unknown>, "a">
S.asSchema(S.Cause({ error: S.String, defect: hole<S.Schema<unknown, unknown, "a">>() }))

// $ExpectType Cause<typeof String$, Schema<unknown, unknown, "a">>
S.Cause({ error: S.String, defect: hole<S.Schema<unknown, unknown, "a">>() })

// $ExpectType Schema<{ readonly a: Cause<string>; }, { readonly a: CauseEncoded<string, unknown>; }, never>
S.asSchema(S.Struct({
  a: S.Cause({ error: S.String, defect: S.Defect })
}))

// ---------------------------------------------
// TypeLiteral
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; }, { readonly a: string; }, never>
S.asSchema(hole<S.TypeLiteral<{ a: typeof S.String }, []>>())

// $ExpectType Schema<{ readonly [x: string]: unknown; }, { readonly [x: string]: unknown; }, never>
S.asSchema(hole<S.TypeLiteral<{}, [{ key: typeof S.String; value: typeof S.Unknown }]>>())

// $ExpectType Schema<{ readonly [x: string]: string; readonly [x: symbol]: number; }, { readonly [x: string]: never; }, never>
S.asSchema(
  hole<
    S.TypeLiteral<
      {},
      [{ key: typeof S.String; value: typeof S.String }, { key: typeof S.Symbol; value: typeof S.Number }]
    >
  >()
)

// $ExpectType Schema<{ readonly [x: string]: unknown; readonly a: string; }, { readonly [x: string]: unknown; readonly a: string; }, never>
S.asSchema(hole<S.TypeLiteral<{ a: typeof S.String }, [{ key: typeof S.String; value: typeof S.Unknown }]>>())

// ---------------------------------------------
// TupleType.Type
// ---------------------------------------------

// $ExpectType readonly []
hole<S.TupleType.Type<[], []>>()

// $ExpectType readonly [number]
hole<S.TupleType.Type<[typeof S.NumberFromString], []>>()

// $ExpectType readonly number[]
hole<S.TupleType.Type<[], [typeof S.NumberFromString]>>()

// $ExpectType readonly [number, ...number[]]
hole<S.TupleType.Type<[typeof S.NumberFromString], [typeof S.NumberFromString]>>()

// $ExpectType readonly [number, ...number[], number]
hole<S.TupleType.Type<[typeof S.NumberFromString], [typeof S.NumberFromString, typeof S.NumberFromString]>>()

// $ExpectType readonly [number, number?]
hole<S.TupleType.Type<[typeof S.NumberFromString, S.Element<typeof S.NumberFromString, "?">], []>>()

// $ExpectType readonly [number, number?, ...number[]]
hole<
  S.TupleType.Type<
    [typeof S.NumberFromString, S.Element<typeof S.NumberFromString, "?">],
    [typeof S.NumberFromString]
  >
>()

// ---------------------------------------------
// TupleType.Encoded
// ---------------------------------------------

// $ExpectType readonly []
hole<S.TupleType.Encoded<[], []>>()

// $ExpectType readonly [string]
hole<S.TupleType.Encoded<[typeof S.NumberFromString], []>>()

// $ExpectType readonly string[]
hole<S.TupleType.Encoded<[], [typeof S.NumberFromString]>>()

// $ExpectType readonly [string, ...string[]]
hole<S.TupleType.Encoded<[typeof S.NumberFromString], [typeof S.NumberFromString]>>()

// $ExpectType readonly [string, ...string[], string]
hole<S.TupleType.Encoded<[typeof S.NumberFromString], [typeof S.NumberFromString, typeof S.NumberFromString]>>()

// $ExpectType readonly [string, string?]
hole<S.TupleType.Encoded<[typeof S.NumberFromString, S.Element<typeof S.NumberFromString, "?">], []>>()

// $ExpectType readonly [string, string?, ...string[]]
hole<
  S.TupleType.Encoded<
    [typeof S.NumberFromString, S.Element<typeof S.NumberFromString, "?">],
    [typeof S.NumberFromString]
  >
>()

// ---------------------------------------------
// TupleType.Context
// ---------------------------------------------

// $ExpectType "a" | "b" | "c"
hole<S.Schema.Context<S.TupleType<[typeof aContext], [typeof bContext, typeof cContext]>>>()

// ---------------------------------------------
// SortedSetFromSelf
// ---------------------------------------------

// $ExpectType Schema<SortedSet<number>, SortedSet<string>, never>
S.asSchema(S.SortedSetFromSelf(S.NumberFromString, N.Order, Str.Order))

// $ExpectType SortedSetFromSelf<typeof NumberFromString>
S.SortedSetFromSelf(S.NumberFromString, N.Order, Str.Order)

// ---------------------------------------------
// SortedSet
// ---------------------------------------------

// $ExpectType Schema<SortedSet<number>, readonly string[], never>
S.asSchema(S.SortedSet(S.NumberFromString, N.Order))

// $ExpectType SortedSet<typeof NumberFromString>
S.SortedSet(S.NumberFromString, N.Order)

// ---------------------------------------------
// Struct.Constructor
// ---------------------------------------------

// $ExpectType { readonly a?: string; } & { readonly b: number; } & { readonly c?: boolean; }
hole<
  S.Struct.Constructor<{
    a: S.PropertySignature<":", string, never, ":", string, true, never>
    b: typeof S.Number
    c: S.PropertySignature<":", boolean, never, ":", boolean, true, never>
  }>
>()

// ---------------------------------------------
// withConstructorDefault
// ---------------------------------------------

// @ts-expect-error
S.propertySignature(S.String).pipe(S.withConstructorDefault(() => 1))

// $ExpectType PropertySignature<":", string, never, ":", string, true, never>
S.propertySignature(S.String).pipe(S.withConstructorDefault(() => "a"))

// $ExpectType PropertySignature<":", string, never, ":", string, true, never>
S.withConstructorDefault(S.propertySignature(S.String), () => "a")

// ---------------------------------------------
// Struct.make
// ---------------------------------------------

const make1 = S.Struct({
  a: S.propertySignature(S.String).pipe(S.withConstructorDefault(() => "")),
  b: S.Number,
  c: S.propertySignature(S.Boolean).pipe(S.withConstructorDefault(() => true))
}).make

// $ExpectType { readonly a?: string; readonly b: number; readonly c?: boolean; }
hole<Parameters<typeof make1>["0"]>()

const make2 = S.Struct({
  a: S.withConstructorDefault(S.propertySignature(S.String), () => ""),
  b: S.Number,
  c: S.withConstructorDefault(S.propertySignature(S.Boolean), () => true)
}).make

// $ExpectType { readonly a?: string; readonly b: number; readonly c?: boolean; }
hole<Parameters<typeof make2>["0"]>()

const make3 = S.Struct({
  a: S.withConstructorDefault(S.propertySignature(S.String), () => "")
}).make

// $ExpectType { readonly a?: string; }
hole<Parameters<typeof make3>["0"]>()

class AA extends S.Class<AA>("AA")({
  a: S.propertySignature(S.String).pipe(S.withConstructorDefault(() => "")),
  b: S.Number,
  c: S.propertySignature(S.Boolean).pipe(S.withConstructorDefault(() => true))
}) {}

// $ExpectType [props: { readonly a?: string; readonly b: number; readonly c?: boolean; }, options?: MakeOptions | undefined]
hole<ConstructorParameters<typeof AA>>()

// ---------------------------------------------
// withDecodingDefault
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; }, { readonly a?: string | undefined; }, never>
S.asSchema(S.Struct({ a: S.optional(S.String).pipe(S.withDecodingDefault(() => "")) }))

// $ExpectType Struct<{ a: PropertySignature<":", string, never, "?:", string | undefined, false, never>; }>
S.Struct({ a: S.optional(S.String).pipe(S.withDecodingDefault(() => "")) })

// ---------------------------------------------
// withDefaults
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; }, { readonly a?: string | undefined; }, never>
S.asSchema(S.Struct({ a: S.optional(S.String).pipe(S.withDefaults({ decoding: () => "", constructor: () => "" })) }))

// $ExpectType Struct<{ a: PropertySignature<":", string, never, "?:", string | undefined, true, never>; }>
S.Struct({ a: S.optional(S.String).pipe(S.withDefaults({ decoding: () => "", constructor: () => "" })) })

const make4 =
  S.Struct({ a: S.optional(S.String).pipe(S.withDefaults({ decoding: () => "", constructor: () => "" })) }).make

// $ExpectType { readonly a?: string; }
hole<Parameters<typeof make4>["0"]>()

// ---------------------------------------------
// Schema.AsSchema
// ---------------------------------------------

const MyStruct = <X extends S.Schema.All>(x: X) => S.Struct({ x })

type MyStructReturnType<X extends S.Schema.All> = S.Schema.Type<ReturnType<typeof MyStruct<X>>>

export function AsSchemaTest1<X extends S.Schema.All>(obj: MyStructReturnType<S.Schema.AsSchema<X>>) {
  obj.x // $ExpectType Type<X>
}

type XStruct<X extends S.Schema.All> = S.Schema<
  S.Struct.Type<{
    expectedVersion: typeof S.Number
    props: X
  }>,
  S.Struct.Encoded<{
    expectedVersion: typeof S.Number
    props: X
  }>
>
export const AsSchemaTest2 = <X extends S.Schema.All>(
  domainEvent: S.Schema.Type<XStruct<S.Schema.AsSchema<X>>>
) => {
  domainEvent.expectedVersion // $ExpectType number
  domainEvent.props // $ExpectType Type<X>
}

// ---------------------------------------------
// Schema.is
// ---------------------------------------------

// $ExpectType string[]
hole<Array<string | number>>().filter(S.is(S.String))

// $ExpectType string | undefined
hole<Array<string | number>>().find(S.is(S.String))

// ---------------------------------------------
// TaggedStruct
// ---------------------------------------------

// $ExpectType tag<"A">
S.tag("A")

// $ExpectType TaggedStruct<"Product", { category: tag<"Electronics">; name: typeof String$; price: typeof Number$; }>
const MyTaggedStruct = S.TaggedStruct("Product", {
  category: S.tag("Electronics"),
  name: S.String,
  price: S.Number
})

// $ExpectType Schema<{ readonly _tag: "Product"; readonly name: string; readonly category: "Electronics"; readonly price: number; }, { readonly _tag: "Product"; readonly name: string; readonly category: "Electronics"; readonly price: number; }, never>
S.asSchema(MyTaggedStruct)

// $ExpectType [props: { readonly _tag?: "Product"; readonly name: string; readonly category?: "Electronics"; readonly price: number; }, options?: MakeOptions | undefined]
hole<Parameters<typeof MyTaggedStruct["make"]>>()

// ---------------------------------------------
// optionalToOptional
// ---------------------------------------------

// $ExpectType Schema<{ readonly a?: string; }, { readonly a?: string; }, "a">
S.asSchema(S.Struct({ a: S.optionalToOptional(aContext, S.String, { decode: (o) => o, encode: (o) => o }) }))

// $ExpectType Struct<{ a: PropertySignature<"?:", string, never, "?:", string, false, "a">; }>
S.Struct({ a: S.optionalToOptional(aContext, S.String, { decode: (o) => o, encode: (o) => o }) })

// ---------------------------------------------
// optionalToRequired
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; }, { readonly a?: string; }, "a">
S.asSchema(
  S.Struct({ a: S.optionalToRequired(aContext, S.String, { decode: Option.getOrElse(() => ""), encode: Option.some }) })
)

// $ExpectType Struct<{ a: PropertySignature<":", string, never, "?:", string, false, "a">; }>
S.Struct({ a: S.optionalToRequired(aContext, S.String, { decode: Option.getOrElse(() => ""), encode: Option.some }) })

// ---------------------------------------------
// requiredToOptional
// ---------------------------------------------

// $ExpectType Schema<{ readonly a?: string; }, { readonly a: string; }, "a">
S.asSchema(
  S.Struct({ a: S.requiredToOptional(aContext, S.String, { decode: Option.some, encode: Option.getOrElse(() => "") }) })
)

// $ExpectType Struct<{ a: PropertySignature<"?:", string, never, ":", string, false, "a">; }>
S.Struct({ a: S.requiredToOptional(aContext, S.String, { decode: Option.some, encode: Option.getOrElse(() => "") }) })

// ---------------------------------------------
// minItems
// ---------------------------------------------

// $ExpectType Schema<readonly string[], readonly string[], never>
S.asSchema(S.Array(S.String).pipe(S.minItems(2)))

// $ExpectType filter<Schema<readonly string[], readonly string[], never>>
S.Array(S.String).pipe(S.minItems(2))

// $ExpectType Schema<readonly string[], readonly string[], never>
S.Array(S.String).pipe(S.minItems(2)).from

// $ExpectType Schema<readonly string[], readonly string[], never>
S.asSchema(S.Array(S.String).pipe(S.minItems(2), S.maxItems(3)))

// $ExpectType filter<Schema<readonly string[], readonly string[], never>>
S.Array(S.String).pipe(S.minItems(1), S.maxItems(2))

// ---------------------------------------------
// TemplateLiteralParser
// ---------------------------------------------

// $ExpectType Schema<readonly [number, "a"], `${number}a`, never>
S.asSchema(S.TemplateLiteralParser(S.Int, "a"))

// $ExpectType TemplateLiteralParser<[typeof Int, "a"]>
S.TemplateLiteralParser(S.Int, "a")

// $ExpectType Schema<readonly [number, "a", string], `${string}a${string}`, never>
S.asSchema(S.TemplateLiteralParser(S.NumberFromString, "a", S.NonEmptyString))

// $ExpectType TemplateLiteralParser<[typeof NumberFromString, "a", typeof NonEmptyString]>
S.TemplateLiteralParser(S.NumberFromString, "a", S.NonEmptyString)

// $ExpectType Schema<readonly ["/", number, "/", "a" | "b"], `/${number}/a` | `/${number}/b`, never>
S.asSchema(S.TemplateLiteralParser("/", S.Int, "/", S.Literal("a", "b")))

// $ExpectType TemplateLiteralParser<["/", typeof Int, "/", Literal<["a", "b"]>]>
S.TemplateLiteralParser("/", S.Int, "/", S.Literal("a", "b"))

// ---------------------------------------------
// UndefinedOr
// ---------------------------------------------

// $ExpectType UndefinedOr<typeof Never>
S.UndefinedOr(S.Never)

// ---------------------------------------------
// NullOr
// ---------------------------------------------

// $ExpectType NullOr<typeof Never>
S.NullOr(S.Never)

// ---------------------------------------------
// NullishOr
// ---------------------------------------------

// $ExpectType NullishOr<typeof Never>
S.NullishOr(S.Never)
