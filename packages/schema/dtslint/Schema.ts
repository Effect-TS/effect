import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Brand from "effect/Brand"
import { hole, identity, pipe } from "effect/Function"
import * as N from "effect/Number"
import * as Str from "effect/String"
import type { Simplify } from "effect/Types"

declare const anyNever: S.Schema<any, never>
declare const neverAny: S.Schema<never, any>
declare const anyNeverPropertySignature: S.PropertySignature<"?:", any, never, "?:", never, never>
declare const neverAnyPropertySignature: S.PropertySignature<"?:", never, never, "?:", any, never>

class A extends S.Class<A>("A")({ a: S.NonEmpty }) {}

// ---------------------------------------------
// Schema.Encoded
// ---------------------------------------------

// $ExpectType never
hole<S.Schema.Encoded<typeof S.Never>>()

// ---------------------------------------------
// Schema.Type
// ---------------------------------------------

// $ExpectType never
hole<S.Schema.Type<typeof S.Never>>()

// ---------------------------------------------
// S.annotations
// ---------------------------------------------

// $ExpectType Schema<string, string, never>
hole<S.Schema<string>>().pipe(S.annotations({}))

// $ExpectType $String
S.String.pipe(S.annotations({}))

// $ExpectType brand<Schema<number, number, never>, "Int">
S.Number.pipe(S.int(), S.brand("Int"), S.annotations({}))

// $ExpectType Never
S.Never.pipe(S.annotations({}))

// $ExpectType Struct<{ a: $String; }>
S.Struct({ a: S.String }).pipe(S.annotations({}))

// $ExpectType Schema<A, { readonly a: string; }, never>
A.pipe(S.annotations({}))

// $ExpectType number & Brand<"Int">
S.Number.pipe(S.int(), S.brand("Int"))(1)

// ---------------------------------------------
// S.message
// ---------------------------------------------

// $ExpectType Schema<string, string, never>
hole<S.Schema<string>>().pipe(S.message(() => ""))

// $ExpectType $String
S.String.pipe(S.message(() => ""))

// $ExpectType Schema<A, { readonly a: string; }, never>
A.pipe(S.message(() => ""))

// ---------------------------------------------
// S.identifier
// ---------------------------------------------

// $ExpectType $String
S.String.pipe(S.identifier(""))

// ---------------------------------------------
// S.title
// ---------------------------------------------

// $ExpectType $String
S.String.pipe(S.title(""))

// ---------------------------------------------
// S.description
// ---------------------------------------------

// $ExpectType $String
S.String.pipe(S.description(""))

// ---------------------------------------------
// S.examples
// ---------------------------------------------

// $ExpectType $String
S.String.pipe(S.examples([""]))

// ---------------------------------------------
// S.default
// ---------------------------------------------

// $ExpectType $String
S.String.pipe(S.default(""))

// ---------------------------------------------
// S.documentation
// ---------------------------------------------

// $ExpectType $String
S.String.pipe(S.documentation(""))

// ---------------------------------------------
// S.jsonSchema
// ---------------------------------------------

// $ExpectType $String
S.String.pipe(S.jsonSchema({}))

// ---------------------------------------------
// S.equivalence
// ---------------------------------------------

// $ExpectType $String
S.String.pipe(S.equivalence((
  _a, // $ExpectType string
  _b // $ExpectType string
) => true))

// ---------------------------------------------
// S.concurrency
// ---------------------------------------------

// $ExpectType $String
S.String.pipe(S.concurrency(1))

// ---------------------------------------------
// S.batching
// ---------------------------------------------

// $ExpectType $String
S.String.pipe(S.batching(true))

// ---------------------------------------------
// Primitives
// ---------------------------------------------

// $ExpectType Schema<void, void, never>
S.asSchema(S.Void)

// $ExpectType Void
S.Void

// $ExpectType Void
S.Void.annotations({})

// $ExpectType Schema<undefined, undefined, never>
S.asSchema(S.Undefined)

// $ExpectType Undefined
S.Undefined

// $ExpectType Undefined
S.Undefined.annotations({})

// $ExpectType Schema<string, string, never>
S.asSchema(S.String)

// $ExpectType $String
S.String

// $ExpectType $String
S.String.annotations({})

// $ExpectType Schema<number, number, never>
S.asSchema(S.Number)

// $ExpectType $Number
S.Number

// $ExpectType $Number
S.Number.annotations({})

// $ExpectType Schema<boolean, boolean, never>
S.asSchema(S.Boolean)

// $ExpectType $Boolean
S.Boolean

// $ExpectType $Boolean
S.Boolean.annotations({})

// $ExpectType Schema<bigint, bigint, never>
S.asSchema(S.BigIntFromSelf)

// $ExpectType BigIntFromSelf
S.BigIntFromSelf

// $ExpectType BigIntFromSelf
S.BigIntFromSelf.annotations({})

// $ExpectType Schema<bigint, string, never>
S.asSchema(S.BigInt)

// $ExpectType $BigInt
S.BigInt

// $ExpectType $BigInt
S.BigInt.annotations({})

// $ExpectType Schema<symbol, symbol, never>
S.asSchema(S.SymbolFromSelf)

// $ExpectType SymbolFromSelf
S.SymbolFromSelf

// $ExpectType SymbolFromSelf
S.SymbolFromSelf.annotations({})

// $ExpectType Schema<symbol, string, never>
S.asSchema(S.Symbol)

// $ExpectType $Symbol
S.Symbol

// $ExpectType $Symbol
S.Symbol.annotations({})

// $ExpectType Schema<unknown, unknown, never>
S.asSchema(S.Unknown)

// $ExpectType Unknown
S.Unknown

// $ExpectType Unknown
S.Unknown.annotations({})

// $ExpectType Schema<any, any, never>
S.asSchema(S.Any)

// $ExpectType Any
S.Any

// $ExpectType Any
S.Any.annotations({})

// $ExpectType Schema<object, object, never>
S.asSchema(S.Object)

// $ExpectType $Object
S.Object

// $ExpectType $Object
S.Object.annotations({})

// ---------------------------------------------
// literals
// ---------------------------------------------

// $ExpectType Schema<null, null, never>
S.asSchema(S.Null)

// $ExpectType Null
S.Null

// $ExpectType Null
S.Null.annotations({})

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

// $ExpectType Schema<string, string, never>
pipe(S.String, S.maxLength(5))

// $ExpectType Schema<string, string, never>
pipe(S.String, S.minLength(5))

// $ExpectType Schema<string, string, never>
pipe(S.String, S.length(5))

// $ExpectType Schema<string, string, never>
pipe(S.String, S.pattern(/a/))

// $ExpectType Schema<string, string, never>
pipe(S.String, S.startsWith("a"))

// $ExpectType Schema<string, string, never>
pipe(S.String, S.endsWith("a"))

// $ExpectType Schema<string, string, never>
pipe(S.String, S.includes("a"))

// $ExpectType Schema<number, number, never>
pipe(S.Number, S.greaterThan(5))

// $ExpectType Schema<number, number, never>
pipe(S.Number, S.greaterThanOrEqualTo(5))

// $ExpectType Schema<number, number, never>
pipe(S.Number, S.lessThan(5))

// $ExpectType Schema<number, number, never>
pipe(S.Number, S.lessThanOrEqualTo(5))

// $ExpectType Schema<number, number, never>
pipe(S.Number, S.int())

// $ExpectType Schema<number, number, never>
pipe(S.Number, S.nonNaN()) // not NaN

// $ExpectType Schema<number, number, never>
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

// $ExpectType NullOr<$String>
S.NullOr(S.String)

// $ExpectType Schema<number | null, string | null, never>
S.asSchema(S.NullOr(S.NumberFromString))

// $ExpectType NullOr<NumberFromString>
S.NullOr(S.NumberFromString)

// ---------------------------------------------
// Union
// ---------------------------------------------

// $ExpectType Union<[$String, $Number]>
S.Union(S.String, S.Number).annotations({})

// $ExpectType Schema<string | number, string | number, never>
S.asSchema(S.Union(S.String, S.Number))

// $ExpectType Union<[$String, $Number]>
S.Union(S.String, S.Number)

// $ExpectType Schema<number | boolean, string | boolean, never>
S.asSchema(S.Union(S.Boolean, S.NumberFromString))

// $ExpectType Union<[$Boolean, NumberFromString]>
S.Union(S.Boolean, S.NumberFromString)

// $ExpectType readonly [$String, $Number]
S.Union(S.String, S.Number).members

// ---------------------------------------------
// KeyOf
// ---------------------------------------------

// $ExpectType Schema<"a" | "b", "a" | "b", never>
S.KeyOf(S.Struct({ a: S.String, b: S.NumberFromString }))

// ---------------------------------------------
// tuple
// ---------------------------------------------

// $ExpectType Schema<readonly [string, number], readonly [string, number], never>
S.asSchema(S.Tuple(S.String, S.Number))

// $ExpectType Tuple<[$String, $Number]>
S.Tuple(S.String, S.Number)

// $ExpectType Schema<readonly [string, number], readonly [string, string], never>
S.asSchema(S.Tuple(S.String, S.NumberFromString))

// $ExpectType Tuple<[$String, NumberFromString]>
S.Tuple(S.String, S.NumberFromString)

// $ExpectType readonly [$String, $Number]
S.Tuple(S.String, S.Number).elements

// $ExpectType readonly []
S.Tuple(S.String, S.Number).rest

// ---------------------------------------------
// tuple overloading / array overloading
// ---------------------------------------------

// $ExpectType Schema<readonly [string, ...number[], boolean], readonly [string, ...number[], boolean], never>
S.asSchema(S.Tuple([S.String], S.Number, S.Boolean))

// $ExpectType TupleType<readonly [$String], [$Number, $Boolean]>
S.Tuple([S.String], S.Number, S.Boolean)

// $ExpectType readonly [$String]
S.Tuple([S.String], S.Number).elements

// $ExpectType readonly [$Number]
S.Tuple([S.String], S.Number).rest

// $ExpectType readonly [$Number, $Boolean]
S.Tuple([S.String], S.Number, S.Boolean).rest

// ---------------------------------------------
// optionalElement
// ---------------------------------------------

// $ExpectType Schema<readonly [string, number, boolean?], readonly [string, number, boolean?], never>
S.asSchema(S.Tuple(S.String, S.Number, S.optionalElement(S.Boolean)))

// $ExpectType Tuple<[$String, $Number, OptionalElement<$Boolean>]>
S.Tuple(S.String, S.Number, S.optionalElement(S.Boolean))

// $ExpectType Schema<readonly [string, number, number?], readonly [string, string, string?], never>
S.asSchema(S.Tuple(S.String, S.NumberFromString, S.optionalElement(S.NumberFromString)))

// $ExpectType Tuple<[$String, NumberFromString, OptionalElement<NumberFromString>]>
S.Tuple(S.String, S.NumberFromString, S.optionalElement(S.NumberFromString))

// ---------------------------------------------
// array
// ---------------------------------------------

// $ExpectType Schema<readonly number[], readonly number[], never>
S.asSchema(S.Array(S.Number))

// $ExpectType $Array<$Number>
S.Array(S.Number)

// $ExpectType $Array<$Number>
S.Number.pipe(S.Array)

// $ExpectType Schema<readonly number[], readonly string[], never>
S.asSchema(S.Array(S.NumberFromString))

// $ExpectType $Array<NumberFromString>
S.Array(S.NumberFromString)

// $ExpectType $String
S.Array(S.String).value

// $ExpectType readonly []
S.Array(S.String).elements

// $ExpectType readonly [$String]
S.Array(S.String).rest

// ---------------------------------------------
// NonEmptyArray
// ---------------------------------------------

// $ExpectType Schema<readonly [number, ...number[]], readonly [number, ...number[]], never>
S.asSchema(S.NonEmptyArray(S.Number))

// $ExpectType NonEmptyArray<$Number>
S.NonEmptyArray(S.Number)

// $ExpectType NonEmptyArray<$Number>
S.Number.pipe(S.NonEmptyArray)

// $ExpectType Schema<readonly [number, ...number[]], readonly [string, ...string[]], never>
S.asSchema(S.NonEmptyArray(S.NumberFromString))

// $ExpectType NonEmptyArray<NumberFromString>
S.NonEmptyArray(S.NumberFromString)

// $ExpectType $String
S.NonEmptyArray(S.String).value

// $ExpectType readonly [$String]
S.NonEmptyArray(S.String).elements

// $ExpectType readonly [$String]
S.NonEmptyArray(S.String).rest

// ---------------------------------------------
// Struct
// ---------------------------------------------

// $ExpectType { readonly a: $String; readonly b: $Number; }
S.Struct({ a: S.String, b: S.Number }).fields

// $ExpectType readonly []
S.Struct({ a: S.String, b: S.Number }).records

// $ExpectType { readonly a: $String; readonly b: $Number; }
S.Struct({ a: S.String, b: S.Number }).annotations({}).fields

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
S.asSchema(S.Struct({ a: S.String, b: S.Number }))

// $ExpectType Struct<{ a: $String; b: $Number; }>
S.Struct({ a: S.String, b: S.Number })

// $ExpectType Struct<{ a: $String; b: NumberFromString; }>
const MyModel = S.Struct({ a: S.String, b: S.NumberFromString })

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: string; }, never>
S.asSchema(MyModel)

// $ExpectType { readonly a: string; readonly b: number; }
export type MyModelType = S.Schema.Type<typeof MyModel>

// $ExpectType { readonly a: string; readonly b: string; }
export type MyModelEncoded = S.Schema.Encoded<typeof MyModel>

// $ExpectType Schema<{ readonly a: never; }, { readonly a: never; }, never>
S.asSchema(S.Struct({ a: S.Never }))

// $ExpectType Struct<{ a: Never; }>
S.Struct({ a: S.Never })

// $ExpectType Schema<{ readonly [x: string]: number; readonly a: number; }, { readonly [x: string]: string; readonly a: string; }, never>
S.asSchema(S.Struct({ a: S.NumberFromString }, { key: S.String, value: S.NumberFromString }))

// $ExpectType TypeLiteral<{ a: NumberFromString; }, readonly [{ readonly key: $String; readonly value: NumberFromString; }]>
S.Struct({ a: S.NumberFromString }, { key: S.String, value: S.NumberFromString })

// $ExpectType readonly [{ readonly key: $String; readonly value: $Number; }]
S.Struct({ a: S.Number }, { key: S.String, value: S.Number }).records

// $ExpectType readonly [{ readonly key: $String; readonly value: $Number; }, { readonly key: $Symbol; readonly value: $Number; }]
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
// optional { exact: true }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: boolean; }, { readonly a: string; readonly b: number; readonly c?: boolean; }, never>
S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optional(S.Boolean, { exact: true }) }))

// $ExpectType Struct<{ a: $String; b: $Number; c: PropertySignature<"?:", boolean, never, "?:", boolean, never>; }>
S.Struct({ a: S.String, b: S.Number, c: S.optional(S.Boolean, { exact: true }) })

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: number; }, { readonly a: string; readonly b: number; readonly c?: string; }, never>
S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optional(S.NumberFromString, { exact: true }) }))

// $ExpectType Struct<{ a: $String; b: $Number; c: PropertySignature<"?:", number, never, "?:", string, never>; }>
S.Struct({ a: S.String, b: S.Number, c: S.optional(S.NumberFromString, { exact: true }) })

// $ExpectType Schema<{ readonly a?: never; }, { readonly a?: never; }, never>
S.asSchema(S.Struct({ a: S.optional(S.Never, { exact: true }) }))

// $ExpectType Struct<{ a: PropertySignature<"?:", never, never, "?:", never, never>; }>
S.Struct({ a: S.optional(S.Never, { exact: true }) })

// $ExpectType Schema<{ readonly a?: string; }, { readonly a?: string; }, never>
S.asSchema(S.Struct({ a: S.String.pipe(S.optional({ exact: true })) }))

// $ExpectType Struct<{ a: PropertySignature<"?:", string, never, "?:", string, never>; }>
S.Struct({ a: S.String.pipe(S.optional({ exact: true })) })

// ---------------------------------------------
// optional()
// ---------------------------------------------

// @ts-expect-error
S.optional(S.String, { as: "Option", default: () => "" })

// @ts-expect-error
S.optional(S.String, { as: null })

// @ts-expect-error
S.optional(S.String, { default: null })

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: boolean | undefined; }, { readonly a: string; readonly b: number; readonly c?: boolean | undefined; }, never>
S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optional(S.Boolean) }))

// $ExpectType Struct<{ a: $String; b: $Number; c: PropertySignature<"?:", boolean | undefined, never, "?:", boolean | undefined, never>; }>
S.Struct({ a: S.String, b: S.Number, c: S.optional(S.Boolean) })

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: number | undefined; }, { readonly a: string; readonly b: number; readonly c?: string | undefined; }, never>
S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optional(S.NumberFromString) }))

// $ExpectType Struct<{ a: $String; b: $Number; c: PropertySignature<"?:", number | undefined, never, "?:", string | undefined, never>; }>
S.Struct({ a: S.String, b: S.Number, c: S.optional(S.NumberFromString) })

// $ExpectType Schema<{ readonly a?: undefined; }, { readonly a?: undefined; }, never>
S.asSchema(S.Struct({ a: S.optional(S.Never) }))

// $ExpectType Struct<{ a: PropertySignature<"?:", undefined, never, "?:", undefined, never>; }>
S.Struct({ a: S.optional(S.Never) })

// $ExpectType Schema<{ readonly a?: string | undefined; }, { readonly a?: string | undefined; }, never>
S.asSchema(S.Struct({ a: S.String.pipe(S.optional()) }))

// $ExpectType Struct<{ a: PropertySignature<"?:", string | undefined, never, "?:", string | undefined, never>; }>
S.Struct({ a: S.String.pipe(S.optional()) })

// ---------------------------------------------
// optional { exact: true, default: () => A }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: boolean; }, { readonly a: string; readonly b: number; readonly c?: boolean; }, never>
S.asSchema(S.Struct({
  a: S.String,
  b: S.Number,
  c: S.optional(S.Boolean, { exact: true, default: () => false })
}))

// $ExpectType Struct<{ a: $String; b: $Number; c: PropertySignature<":", boolean, never, "?:", boolean, never>; }>
S.Struct({
  a: S.String,
  b: S.Number,
  c: S.optional(S.Boolean, { exact: true, default: () => false })
})

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: number; }, { readonly a: string; readonly b: number; readonly c?: string; }, never>
S.asSchema(S.Struct({
  a: S.String,
  b: S.Number,
  c: S.optional(S.NumberFromString, { exact: true, default: () => 0 })
}))

// $ExpectType Struct<{ a: $String; b: $Number; c: PropertySignature<":", number, never, "?:", string, never>; }>
S.Struct({
  a: S.String,
  b: S.Number,
  c: S.optional(S.NumberFromString, { exact: true, default: () => 0 })
})

// $ExpectType Struct<{ a: PropertySignature<":", "a" | "b", never, "?:", "a" | "b", never>; }>
S.Struct({ a: S.optional(S.Literal("a", "b"), { default: () => "a", exact: true }) })

// $ExpectType Schema<{ readonly a: "a" | "b"; }, { readonly a?: "a" | "b"; }, never>
S.asSchema(S.Struct({ a: S.Literal("a", "b").pipe(S.optional({ default: () => "a" as const, exact: true })) }))

// $ExpectType Struct<{ a: PropertySignature<":", "a" | "b", never, "?:", "a" | "b", never>; }>
S.Struct({ a: S.Literal("a", "b").pipe(S.optional({ default: () => "a" as const, exact: true })) })

// ---------------------------------------------
// optional { default: () => A }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: boolean; }, { readonly a: string; readonly b: number; readonly c?: boolean | undefined; }, never>
S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optional(S.Boolean, { default: () => false }) }))

// $ExpectType Struct<{ a: $String; b: $Number; c: PropertySignature<":", boolean, never, "?:", boolean | undefined, never>; }>
S.Struct({ a: S.String, b: S.Number, c: S.optional(S.Boolean, { default: () => false }) })

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: number; }, { readonly a: string; readonly b: number; readonly c?: string | undefined; }, never>
S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optional(S.NumberFromString, { default: () => 0 }) }))

// $ExpectType Struct<{ a: $String; b: $Number; c: PropertySignature<":", number, never, "?:", string | undefined, never>; }>
S.Struct({ a: S.String, b: S.Number, c: S.optional(S.NumberFromString, { default: () => 0 }) })

// $ExpectType Struct<{ a: PropertySignature<":", "a" | "b", never, "?:", "a" | "b" | undefined, never>; }>
S.Struct({ a: S.optional(S.Literal("a", "b"), { default: () => "a" }) })

// $ExpectType Schema<{ readonly a: "a" | "b"; }, { readonly a?: "a" | "b" | undefined; }, never>
S.asSchema(S.Struct({ a: S.Literal("a", "b").pipe(S.optional({ default: () => "a" as const })) }))

// $ExpectType Struct<{ a: PropertySignature<":", "a" | "b", never, "?:", "a" | "b" | undefined, never>; }>
S.Struct({ a: S.Literal("a", "b").pipe(S.optional({ default: () => "a" as const })) })

// ---------------------------------------------
// optional { nullable: true, default: () => A }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: number; }, { readonly a?: string | null | undefined; }, never>
S.asSchema(S.Struct({ a: S.optional(S.NumberFromString, { nullable: true, default: () => 0 }) }))

// $ExpectType Struct<{ a: PropertySignature<":", number, never, "?:", string | null | undefined, never>; }>
S.Struct({ a: S.optional(S.NumberFromString, { nullable: true, default: () => 0 }) })

// $ExpectType Schema<{ readonly a: number; }, { readonly a?: string | null; }, never>
S.asSchema(S.Struct({ a: S.optional(S.NumberFromString, { exact: true, nullable: true, default: () => 0 }) }))

// $ExpectType Struct<{ a: PropertySignature<":", number, never, "?:", string | null, never>; }>
S.Struct({ a: S.optional(S.NumberFromString, { exact: true, nullable: true, default: () => 0 }) })

// $ExpectType Struct<{ a: PropertySignature<":", "a" | "b", never, "?:", "a" | "b" | null | undefined, never>; }>
S.Struct({ a: S.optional(S.Literal("a", "b"), { default: () => "a", nullable: true }) })

// $ExpectType Schema<{ readonly a: "a" | "b"; }, { readonly a?: "a" | "b" | null | undefined; }, never>
S.asSchema(S.Struct({ a: S.Literal("a", "b").pipe(S.optional({ default: () => "a" as const, nullable: true })) }))

// $ExpectType Struct<{ a: PropertySignature<":", "a" | "b", never, "?:", "a" | "b" | null | undefined, never>; }>
S.Struct({ a: S.Literal("a", "b").pipe(S.optional({ default: () => "a" as const, nullable: true })) })

// ---------------------------------------------
// optional { exact: true, as: "Option" }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: Option<boolean>; }, { readonly a: string; readonly b: number; readonly c?: boolean; }, never>
S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optional(S.Boolean, { exact: true, as: "Option" }) }))

// $ExpectType Struct<{ a: $String; b: $Number; c: PropertySignature<":", Option<boolean>, never, "?:", boolean, never>; }>
S.Struct({ a: S.String, b: S.Number, c: S.optional(S.Boolean, { exact: true, as: "Option" }) })

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: Option<number>; }, { readonly a: string; readonly b: number; readonly c?: string; }, never>
S.asSchema(S.Struct({
  a: S.String,
  b: S.Number,
  c: S.optional(S.NumberFromString, { exact: true, as: "Option" })
}))

// $ExpectType Struct<{ a: $String; b: $Number; c: PropertySignature<":", Option<number>, never, "?:", string, never>; }>
S.Struct({
  a: S.String,
  b: S.Number,
  c: S.optional(S.NumberFromString, { exact: true, as: "Option" })
})

// $ExpectType Schema<{ readonly a: Option<string>; }, { readonly a?: string; }, never>
S.asSchema(S.Struct({ a: S.String.pipe(S.optional({ exact: true, as: "Option" })) }))

// $ExpectType Struct<{ a: PropertySignature<":", Option<string>, never, "?:", string, never>; }>
S.Struct({ a: S.String.pipe(S.optional({ exact: true, as: "Option" })) })

// ---------------------------------------------
// optional { as: "Option" }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: Option<boolean>; }, { readonly a: string; readonly b: number; readonly c?: boolean | undefined; }, never>
S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optional(S.Boolean, { as: "Option" }) }))

// $ExpectType Struct<{ a: $String; b: $Number; c: PropertySignature<":", Option<boolean>, never, "?:", boolean | undefined, never>; }>
S.Struct({ a: S.String, b: S.Number, c: S.optional(S.Boolean, { as: "Option" }) })

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: Option<number>; }, { readonly a: string; readonly b: number; readonly c?: string | undefined; }, never>
S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optional(S.NumberFromString, { as: "Option" }) }))

// $ExpectType Struct<{ a: $String; b: $Number; c: PropertySignature<":", Option<number>, never, "?:", string | undefined, never>; }>
S.Struct({ a: S.String, b: S.Number, c: S.optional(S.NumberFromString, { as: "Option" }) })

// $ExpectType Schema<{ readonly a: Option<string>; }, { readonly a?: string | undefined; }, never>
S.asSchema(S.Struct({ a: S.String.pipe(S.optional({ as: "Option" })) }))

// $ExpectType Struct<{ a: PropertySignature<":", Option<string>, never, "?:", string | undefined, never>; }>
S.Struct({ a: S.String.pipe(S.optional({ as: "Option" })) })

// ---------------------------------------------
// optional { nullable: true, as: "Option" }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: Option<number>; }, { readonly a?: string | null | undefined; }, never>
S.asSchema(S.Struct({ a: S.optional(S.NumberFromString, { nullable: true, as: "Option" }) }))

// $ExpectType Struct<{ a: PropertySignature<":", Option<number>, never, "?:", string | null | undefined, never>; }>
S.Struct({ a: S.optional(S.NumberFromString, { nullable: true, as: "Option" }) })

// $ExpectType Schema<{ readonly a: Option<string>; }, { readonly a?: string | null | undefined; }, never>
S.asSchema(S.Struct({ a: S.String.pipe(S.optional({ nullable: true, as: "Option" })) }))

// $ExpectType Struct<{ a: PropertySignature<":", Option<string>, never, "?:", string | null | undefined, never>; }>
S.Struct({ a: S.String.pipe(S.optional({ nullable: true, as: "Option" })) })

// ---------------------------------------------
// optional { exact: true, nullable: true, as: "Option" }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: Option<number>; }, { readonly a?: string | null; }, never>
S.asSchema(S.Struct({ a: S.optional(S.NumberFromString, { exact: true, nullable: true, as: "Option" }) }))

// $ExpectType Struct<{ a: PropertySignature<":", Option<number>, never, "?:", string | null, never>; }>
S.Struct({ a: S.optional(S.NumberFromString, { exact: true, nullable: true, as: "Option" }) })

// $ExpectType Schema<{ readonly a: Option<string>; }, { readonly a?: string | null; }, never>
S.asSchema(S.Struct({ a: S.String.pipe(S.optional({ exact: true, nullable: true, as: "Option" })) }))

// $ExpectType Struct<{ a: PropertySignature<":", Option<string>, never, "?:", string | null, never>; }>
S.Struct({ a: S.String.pipe(S.optional({ exact: true, nullable: true, as: "Option" })) })

// ---------------------------------------------
// Pick
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
pipe(S.Struct({ a: S.String, b: S.Number, c: S.Boolean }), S.Pick("a", "b"))

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: string; }, never>
pipe(S.Struct({ a: S.String, b: S.NumberFromString, c: S.Boolean }), S.Pick("a", "b"))

// ---------------------------------------------
// Pick - optional
// ---------------------------------------------

// $ExpectType Schema<{ readonly a?: string; readonly b: number; }, { readonly a?: string; readonly b: number; }, never>
pipe(
  S.Struct({ a: S.optional(S.String, { exact: true }), b: S.Number, c: S.Boolean }),
  S.Pick("a", "b")
)

// $ExpectType Schema<{ readonly a?: string; readonly b: number; }, { readonly a?: string; readonly b: string; }, never>
pipe(
  S.Struct({ a: S.optional(S.String, { exact: true }), b: S.NumberFromString, c: S.Boolean }),
  S.Pick("a", "b")
)

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a?: string; readonly b: string; }, never>
pipe(
  S.Struct({
    a: S.optional(S.String, { exact: true, default: () => "" }),
    b: S.NumberFromString,
    c: S.Boolean
  }),
  S.Pick("a", "b")
)

// ---------------------------------------------
// Omit
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
pipe(S.Struct({ a: S.String, b: S.Number, c: S.Boolean }), S.Omit("c"))

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: string; }, never>
pipe(S.Struct({ a: S.String, b: S.NumberFromString, c: S.Boolean }), S.Omit("c"))

// ---------------------------------------------
// Omit - optional
// ---------------------------------------------

// $ExpectType Schema<{ readonly a?: string; readonly b: number; }, { readonly a?: string; readonly b: number; }, never>
pipe(S.Struct({ a: S.optional(S.String, { exact: true }), b: S.Number, c: S.Boolean }), S.Omit("c"))

// $ExpectType Schema<{ readonly a?: string; readonly b: number; }, { readonly a?: string; readonly b: string; }, never>
pipe(
  S.Struct({ a: S.optional(S.String, { exact: true }), b: S.NumberFromString, c: S.Boolean }),
  S.Omit("c")
)

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a?: string; readonly b: string; }, never>
pipe(
  S.Struct({
    a: S.optional(S.String, { exact: true, default: () => "" }),
    b: S.NumberFromString,
    c: S.Boolean
  }),
  S.Omit("c")
)

// ---------------------------------------------
// brand
// ---------------------------------------------

// $ExpectType Schema<number & Brand<"Int">, number, never>
S.asSchema(pipe(S.Number, S.int(), S.brand("Int")))

// $ExpectType Schema<number & Brand<"Int">, number, never>
S.asSchema(pipe(S.Number, S.int(), S.brand("Int"))).annotations({})

// $ExpectType BrandSchema<number & Brand<"Int">, number>
S.asBrandSchema(pipe(S.Number, S.int(), S.brand("Int")))

// $ExpectType BrandSchema<number & Brand<"Int">, number>
S.asBrandSchema(pipe(S.Number, S.int(), S.brand("Int"))).annotations({})

// $ExpectType brand<Schema<number, number, never>, "Int">
pipe(S.Number, S.int(), S.brand("Int"))

// $ExpectType Schema<number & Brand<"Int">, string, never>
S.asSchema(pipe(S.NumberFromString, S.int(), S.brand("Int")))

// $ExpectType BrandSchema<number & Brand<"Int">, string>
S.asBrandSchema(pipe(S.NumberFromString, S.int(), S.brand("Int")))

// $ExpectType brand<Schema<number, string, never>, "Int">
pipe(S.NumberFromString, S.int(), S.brand("Int"))

// ---------------------------------------------
// Partial
// ---------------------------------------------

// $ExpectType Schema<{ readonly a?: string; readonly b?: number; }, { readonly a?: string; readonly b?: number; }, never>
S.Partial(S.Struct({ a: S.String, b: S.Number }), { exact: true })

// $ExpectType Schema<{ readonly a?: string; readonly b?: number; }, { readonly a?: string; readonly b?: string; }, never>
S.Partial(S.Struct({ a: S.String, b: S.NumberFromString }), { exact: true })

// $ExpectType Schema<{ readonly a?: string | undefined; readonly b?: number | undefined; }, { readonly a?: string | undefined; readonly b?: number | undefined; }, never>
S.Partial(S.Struct({ a: S.String, b: S.Number }))

// $ExpectType Schema<{ readonly a?: string | undefined; readonly b?: number | undefined; }, { readonly a?: string | undefined; readonly b?: string | undefined; }, never>
S.Partial(S.Struct({ a: S.String, b: S.NumberFromString }))

// $ExpectType Schema<{ readonly a?: string; readonly b?: number; }, { readonly a?: string; readonly b?: number; }, never>
S.Struct({ a: S.String, b: S.Number }).pipe(S.Partial({ exact: true }))

// $ExpectType Schema<{ readonly a?: string | undefined; readonly b?: number | undefined; }, { readonly a?: string | undefined; readonly b?: number | undefined; }, never>
S.Struct({ a: S.String, b: S.Number }).pipe(S.Partial())

// ---------------------------------------------
// Required
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
S.Required(
  S.Struct({ a: S.optional(S.String, { exact: true }), b: S.optional(S.Number, { exact: true }) })
)

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: number; }, { readonly b: string; readonly a: string; readonly c: string; }, never>
S.Required(
  S.Struct({
    a: S.optional(S.String, { exact: true }),
    b: S.NumberFromString,
    c: S.optional(S.NumberFromString, { exact: true })
  })
)

// ---------------------------------------------
// Records
// ---------------------------------------------

// $ExpectType Schema<string, string, never>
S.asSchema(S.Record(S.String, S.String).key)

// $ExpectType $String
S.Record(S.String, S.String).key

// $ExpectType Schema<string, string, never>
S.asSchema(S.Record(S.String, S.String).value)

// $ExpectType $String
S.Record(S.String, S.String).value

// $ExpectType Schema<{ readonly [x: string]: string; }, { readonly [x: string]: string; }, never>
S.asSchema(S.Record(S.String, S.String))

// $ExpectType $Record<$String, $String>
S.Record(S.String, S.String)

// $ExpectType Schema<{ readonly [x: string]: number; }, { readonly [x: string]: string; }, never>
S.asSchema(S.Record(S.String, S.NumberFromString))

// $ExpectType $Record<$String, NumberFromString>
S.Record(S.String, S.NumberFromString)

// $ExpectType Schema<{ readonly [x: string]: string; }, { readonly [x: string]: string; }, never>
S.asSchema(S.Record(pipe(S.String, S.minLength(2)), S.String))

// $ExpectType $Record<Schema<string, string, never>, $String>
S.Record(pipe(S.String, S.minLength(2)), S.String)

// $ExpectType Schema<{ readonly a: string; readonly b: string; }, { readonly a: string; readonly b: string; }, never>
S.asSchema(S.Record(S.Union(S.Literal("a"), S.Literal("b")), S.String))

// $ExpectType $Record<Union<[Literal<["a"]>, Literal<["b"]>]>, $String>
S.Record(S.Union(S.Literal("a"), S.Literal("b")), S.String)

// $ExpectType Schema<{ readonly [x: symbol]: string; }, { readonly [x: symbol]: string; }, never>
S.asSchema(S.Record(S.SymbolFromSelf, S.String))

// $ExpectType $Record<SymbolFromSelf, $String>
S.Record(S.SymbolFromSelf, S.String)

// $ExpectType Schema<{ readonly [x: `a${string}`]: string; }, { readonly [x: `a${string}`]: string; }, never>
S.asSchema(S.Record(S.TemplateLiteral(S.Literal("a"), S.String), S.String))

// $ExpectType $Record<Schema<`a${string}`, `a${string}`, never>, $String>
S.Record(S.TemplateLiteral(S.Literal("a"), S.String), S.String)

// $ExpectType Schema<{ readonly [x: string & Brand<"UserId">]: string; }, { readonly [x: string]: string; }, never>
S.asSchema(S.Record(S.String.pipe(S.brand("UserId")), S.String))

// $ExpectType $Record<brand<$String, "UserId">, $String>
S.Record(S.String.pipe(S.brand("UserId")), S.String)

// $ExpectType Schema<{ readonly [x: string & Brand<symbol>]: string; }, { readonly [x: string]: string; }, never>
S.asSchema(S.Record(S.String.pipe(S.brand(Symbol.for("UserId"))), S.String))

// $ExpectType $Record<brand<$String, symbol>, $String>
S.Record(S.String.pipe(S.brand(Symbol.for("UserId"))), S.String)

// ---------------------------------------------
// extend
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: string; readonly c: string; }, { readonly a: string; readonly b: string; readonly c: string; }, never>
S.asSchema(pipe(
  S.Struct({ a: S.String, b: S.String }),
  S.extend(S.Struct({ c: S.String }))
))

// $ExpectType extend<Struct<{ a: $String; b: $String; }>, Struct<{ c: $String; }>>
pipe(
  S.Struct({ a: S.String, b: S.String }),
  S.extend(S.Struct({ c: S.String }))
)

// $ExpectType Schema<{ readonly a: string; readonly b: string; readonly c: string; }, { readonly a: string; readonly b: string; readonly c: string; }, never>
S.asSchema(S.extend(S.Struct({ a: S.String, b: S.String }), S.Struct({ c: S.String })))

// $ExpectType extend<Struct<{ a: $String; b: $String; }>, Struct<{ c: $String; }>>
S.extend(S.Struct({ a: S.String, b: S.String }), S.Struct({ c: S.String }))

// $ExpectType Schema<{ readonly a: string; readonly b: number; } | { readonly a: string; readonly c: boolean; }, { readonly a: string; readonly b: number; } | { readonly a: string; readonly c: boolean; }, never>
S.asSchema(S.extend(S.Struct({ a: S.String }), S.Union(S.Struct({ b: S.Number }), S.Struct({ c: S.Boolean }))))

// $ExpectType extend<Struct<{ a: $String; }>, Union<[Struct<{ b: $Number; }>, Struct<{ c: $Boolean; }>]>>
S.extend(S.Struct({ a: S.String }), S.Union(S.Struct({ b: S.Number }), S.Struct({ c: S.Boolean })))

// TODO: rises an error in TypeScript@5.0
// // $ExpectType Schema<{ readonly [x: string]: string; readonly a: string; readonly b: string; readonly c: string; }, { readonly [x: string]: string; readonly a: string; readonly b: string; readonly c: string; }, never>
// pipe(
//   S.Struct({ a: S.String, b: S.String }),
//   S.extend(S.Struct({ c: S.String })),
//   S.extend(S.Record(S.String, S.String))
// )

// ---------------------------------------------
// suspend
// ---------------------------------------------

interface SuspendType1 {
  readonly a: number
  readonly as: ReadonlyArray<SuspendType1>
}
const suspend1: S.Schema<SuspendType1> = S.Struct({
  a: S.Number,
  as: S.Array(S.Suspend(() => suspend1))
})

interface LazyEncoded2 {
  readonly a: string
  readonly as: ReadonlyArray<LazyEncoded2>
}
interface LazyType2 {
  readonly a: number
  readonly as: ReadonlyArray<LazyType2>
}
const lazy2: S.Schema<LazyType2, LazyEncoded2> = S.Struct({
  a: S.NumberFromString,
  as: S.Array(S.Suspend(() => lazy2))
})

// ---------------------------------------------
// rename
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
S.rename(S.Struct({ a: S.String, b: S.Number }), {})

// $ExpectType Schema<{ readonly c: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
S.rename(S.Struct({ a: S.String, b: S.Number }), { a: "c" })

// $ExpectType Schema<{ readonly c: string; readonly d: number; }, { readonly a: string; readonly b: number; }, never>
S.rename(S.Struct({ a: S.String, b: S.Number }), { a: "c", b: "d" })

const a = Symbol.for("@effect/schema/dtslint/a")

// $ExpectType Schema<{ readonly [a]: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
S.rename(S.Struct({ a: S.String, b: S.Number }), { a })

// @ts-expect-error
S.rename(S.Struct({ a: S.String, b: S.Number }), { c: "d" })

// @ts-expect-error
S.rename(S.Struct({ a: S.String, b: S.Number }), { a: "c", d: "e" })

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
S.Struct({ a: S.String, b: S.Number }).pipe(S.rename({}))

// $ExpectType Schema<{ readonly c: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
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
S.asSchema(S.InstanceOf(Test))

// $ExpectType InstanceOf<Test>
S.InstanceOf(Test)

// ---------------------------------------------
// TemplateLiteral
// ---------------------------------------------

// $ExpectType Schema<`a${string}`, `a${string}`, never>
S.TemplateLiteral(S.Literal("a"), S.String)

// example from https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html
const EmailLocaleIDs = S.Literal("welcome_email", "email_heading")
const FooterLocaleIDs = S.Literal("footer_title", "footer_sendoff")

// $ExpectType Schema<"welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id", "welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id", never>
S.TemplateLiteral(S.Union(EmailLocaleIDs, FooterLocaleIDs), S.Literal("_id"))

// ---------------------------------------------
// attachPropertySignature
// ---------------------------------------------

// $ExpectType Schema<{ readonly radius: number; readonly kind: "circle"; }, { readonly radius: number; }, never>
pipe(S.Struct({ radius: S.Number }), S.attachPropertySignature("kind", "circle"))

// $ExpectType Schema<{ readonly radius: number; readonly kind: "circle"; }, { readonly radius: string; }, never>
pipe(S.Struct({ radius: S.NumberFromString }), S.attachPropertySignature("kind", "circle"))

// ---------------------------------------------
// filter
// ---------------------------------------------

const predicateFilter1 = (u: unknown): boolean => typeof u === "string"
const FromFilter = S.Union(S.String, S.Number)

// $ExpectType Schema<string | number, string | number, never>
pipe(FromFilter, S.filter(predicateFilter1))

const FromRefinement = S.Struct({
  a: S.optional(S.String, { exact: true }),
  b: S.optional(S.Number, { exact: true })
})

// $ExpectType Schema<{ readonly a?: string; readonly b?: number; } & { readonly b: number; }, { readonly a?: string; readonly b?: number; }, never>
pipe(FromRefinement, S.filter(S.is(S.Struct({ b: S.Number }))))

const LiteralFilter = S.Literal("a", "b")
const predicateFilter2 = (u: unknown): u is "a" => typeof u === "string" && u === "a"

// $ExpectType Schema<"a", "a" | "b", never>
pipe(LiteralFilter, S.filter(predicateFilter2))

// $ExpectType Schema<"a", "a" | "b", never>
pipe(LiteralFilter, S.filter(S.is(S.Literal("a"))))

// $ExpectType Schema<never, "a" | "b", never>
pipe(LiteralFilter, S.filter(S.is(S.Literal("c"))))

declare const UnionFilter: S.Schema<
  { readonly a: string } | { readonly b: string },
  { readonly a: string } | { readonly b: string },
  never
>

// $ExpectType Schema<({ readonly a: string; } | { readonly b: string; }) & { readonly b: string; }, { readonly a: string; } | { readonly b: string; }, never>
pipe(UnionFilter, S.filter(S.is(S.Struct({ b: S.String }))))

// $ExpectType Schema<number & Brand<"MyNumber">, number, never>
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
        _from // $ExpectType Arbitrary<string>
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
// compose
// ---------------------------------------------

// A -> B -> C

// $ExpectType Schema<readonly number[], string, never>
S.compose(S.Split(","), S.Array(S.NumberFromString))

// $ExpectType Schema<readonly number[], string, never>
S.Split(",").pipe(S.compose(S.Array(S.NumberFromString)))

// decoding (strict: false)

// $ExpectType Schema<number, string | null, never>
S.compose(S.Union(S.Null, S.String), S.NumberFromString, { strict: false })

// $ExpectType Schema<number, string | null, never>
S.Union(S.Null, S.String).pipe(S.compose(S.NumberFromString, { strict: false }))

// decoding (strict: true)

// @ts-expect-error
S.compose(S.Union(S.Null, S.String), S.NumberFromString)

// @ts-expect-error
S.Union(S.Null, S.String).pipe(S.compose(S.NumberFromString))

// encoding (strict: false)

// $ExpectType Schema<number | null, string, never>
S.compose(S.NumberFromString, S.Union(S.Null, S.Number), { strict: false })

// $ExpectType Schema<number | null, string, never>
S.NumberFromString.pipe(S.compose(S.Union(S.Null, S.Number), { strict: false }))

// encoding (strict: true)

// @ts-expect-error
S.compose(S.NumberFromString, S.Union(S.Null, S.Number))

// @ts-expect-error
S.NumberFromString.pipe(S.compose(S.Union(S.Null, S.Number)))

// ---------------------------------------------
// FromBrand
// ---------------------------------------------

type Eur = number & Brand.Brand<"Eur">
const Eur = Brand.nominal<Eur>()

// $ExpectType Schema<number & Brand<"Eur">, number, never>
S.Number.pipe(S.FromBrand(Eur))

// ---------------------------------------------
// Mutable
// ---------------------------------------------

// $ExpectType Schema<string, string, never>
S.asSchema(S.Mutable(S.String))

// Mutable<$String>
S.Mutable(S.String)

// $ExpectType Schema<{ a: number; }, { a: number; }, never>
S.asSchema(S.Mutable(S.Struct({ a: S.Number })))

// $ExpectType Mutable<Struct<{ a: $Number; }>>
S.Mutable(S.Struct({ a: S.Number }))

// $ExpectType Schema<{ [x: string]: number; }, { [x: string]: number; }, never>
S.asSchema(S.Mutable(S.Record(S.String, S.Number)))

// $ExpectType Mutable<$Record<$String, $Number>>
S.Mutable(S.Record(S.String, S.Number))

// $ExpectType Schema<string[], string[], never>
S.asSchema(S.Mutable(S.Array(S.String)))

// $ExpectType Mutable<$Array<$String>>
S.Mutable(S.Array(S.String))

// $ExpectType Schema<string[] | { a: number; }, string[] | { a: number; }, never>
S.asSchema(S.Mutable(S.Union(S.Struct({ a: S.Number }), S.Array(S.String))))

// $ExpectType Mutable<Union<[Struct<{ a: $Number; }>, $Array<$String>]>>
S.Mutable(S.Union(S.Struct({ a: S.Number }), S.Array(S.String)))

// $ExpectType Mutable<Schema<readonly string[], readonly string[], never>>
S.Mutable(S.Array(S.String).pipe(S.maxItems(2)))

// $ExpectType Schema<string[], string[], never>
S.asSchema(S.Mutable(S.Suspend(() => S.Array(S.String))))

// $ExpectType Mutable<Suspend<readonly string[], readonly string[], never>>
S.Mutable(S.Suspend(() => S.Array(S.String)))

// $ExpectType Schema<string[], string[], never>
S.asSchema(S.Mutable(S.transform(S.Array(S.String), S.Array(S.String), { decode: identity, encode: identity })))

// $ExpectType Mutable<transform<$Array<$String>, $Array<$String>>>
S.Mutable(S.transform(S.Array(S.String), S.Array(S.String), { decode: identity, encode: identity }))

// $ExpectType Schema<{ a: string; b: number; }, { a: string; b: number; }, never>
S.asSchema(S.extend(S.Mutable(S.Struct({ a: S.String })), S.Mutable(S.Struct({ b: S.Number }))))

// $ExpectType Schema<{ a: string; readonly b: number; }, { a: string; readonly b: number; }, never>
S.asSchema(S.extend(S.Mutable(S.Struct({ a: S.String })), S.Struct({ b: S.Number })))

// $ExpectType Schema<{ [x: string]: string; a: string; }, { [x: string]: string; a: string; }, never>
S.asSchema(S.extend(S.Mutable(S.Struct({ a: S.String })), S.Mutable(S.Record(S.String, S.String))))

// TODO: rises an error in TypeScript@5.0
// // $ExpectType Schema<{ readonly [x: string]: string; a: string; }, { readonly [x: string]: string; a: string; }, never>
// S.asSchema(S.extend(S.Mutable(S.Struct({ a: S.String })), S.Record(S.String, S.String)))

// ---------------------------------------------
// transform
// ---------------------------------------------

// $ExpectType transform<$String, $Number>
const transform1 = S.String.pipe(S.transform(S.Number, { decode: (s) => s.length, encode: (n) => String(n) }))

// $ExpectType $String
transform1.from

// $ExpectType $Number
transform1.to

// $ExpectType transform<$String, $Number>
transform1.annotations({})

// $ExpectType Schema<number, string, never>
S.asSchema(transform1)

// $ExpectType Schema<number, string, never>
S.asSchema(S.String.pipe(S.transform(S.Number, { strict: false, decode: (s) => s, encode: (n) => n })))

// $ExpectType transform<$String, $Number>
S.String.pipe(S.transform(S.Number, { strict: false, decode: (s) => s, encode: (n) => n }))

// @ts-expect-error
S.String.pipe(S.transform(S.Number, (s) => s, (n) => String(n)))

// @ts-expect-error
S.String.pipe(S.transform(S.Number, (s) => s.length, (n) => n))

// ---------------------------------------------
// transformOrFail
// ---------------------------------------------

// $ExpectType transformOrFail<$String, $Number, never>
const transformOrFail1 = S.String.pipe(
  S.transformOrFail(
    S.Number,
    { decode: (s) => ParseResult.succeed(s.length), encode: (n) => ParseResult.succeed(String(n)) }
  )
)

// $ExpectType $String
transformOrFail1.from

// $ExpectType $Number
transformOrFail1.to

// $ExpectType transformOrFail<$String, $Number, never>
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

// $ExpectType transformOrFail<$String, $Number, never>
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

// ---------------------------------------------
// TransformLiteral
// ---------------------------------------------

// $ExpectType Schema<"a", 0, never>
S.asSchema(S.TransformLiteral(0, "a"))

// $ExpectType TransformLiteral<"a", 0>
S.TransformLiteral(0, "a")

// ---------------------------------------------
// TransformLiterals
// ---------------------------------------------

// $ExpectType Schema<"a" | "b", 0 | 1, never>
S.asSchema(S.TransformLiterals([0, "a"], [1, "b"]))

// $ExpectType Union<[TransformLiteral<"a", 0>, TransformLiteral<"b", 1>]>
S.TransformLiterals([0, "a"], [1, "b"])

// $ExpectType TransformLiteral<"a", 0>
S.TransformLiterals([0, "a"])

const pairs: Array<readonly [0 | 1, "a" | "b"]> = [[0, "a"], [1, "b"]]

// $ExpectType Schema<"a" | "b", 0 | 1, never>
S.TransformLiterals(...pairs)

// ---------------------------------------------
// BigDecimal
// ---------------------------------------------

// $ExpectType Schema<BigDecimal, string, never>
S.asSchema(S.BigDecimal)

// $ExpectType BigDecimal
S.BigDecimal

// $ExpectType Schema<BigDecimal, BigDecimal, never>
S.asSchema(S.BigDecimalFromSelf)

// $ExpectType BigDecimalFromSelf
S.BigDecimalFromSelf

// $ExpectType Schema<BigDecimal, number, never>
S.asSchema(S.BigDecimalFromNumber)

// $ExpectType BigDecimalFromNumber
S.BigDecimalFromNumber

// ---------------------------------------------
// Duration
// ---------------------------------------------

// $ExpectType Schema<Duration, readonly [seconds: number, nanos: number], never>
S.asSchema(S.Duration)

// $ExpectType Duration
S.Duration

// $ExpectType Schema<Duration, Duration, never>
S.asSchema(S.DurationFromSelf)

// $ExpectType DurationFromSelf
S.DurationFromSelf

// $ExpectType Schema<Duration, number, never>
S.asSchema(S.DurationFromMillis)

// $ExpectType DurationFromMillis
S.DurationFromMillis

// $ExpectType Schema<Duration, bigint, never>
S.asSchema(S.DurationFromNanos)

// $ExpectType DurationFromNanos
S.DurationFromNanos

// ---------------------------------------------
// Secret
// ---------------------------------------------

// $ExpectType Schema<Secret, string, never>
S.asSchema(S.Secret)

// $ExpectType Secret
S.Secret

// $ExpectType Schema<Secret, Secret, never>
S.asSchema(S.SecretFromSelf)

// $ExpectType SecretFromSelf
S.SecretFromSelf

// ---------------------------------------------
// propertySignature
// ---------------------------------------------

// $ExpectType PropertySignature<":", string, never, ":", string, never>
S.propertySignature(S.String).annotations({ description: "description" })

// ---------------------------------------------
// PropertySignature .annotations({}) method
// ---------------------------------------------

// $ExpectType PropertySignature<"?:", string | undefined, never, "?:", string | undefined, never>
S.optional(S.String).annotations({ description: "description" })

// ---------------------------------------------
// Pluck
// ---------------------------------------------

// $ExpectType Schema<string, { readonly a: string; }, never>
S.Pluck(S.Struct({ a: S.String, b: S.Number }), "a")

// $ExpectType Schema<string, { readonly a: string; }, never>
pipe(S.Struct({ a: S.String, b: S.Number }), S.Pluck("a"))

// ---------------------------------------------
// Head
// ---------------------------------------------

// $ExpectType Schema<Option<number>, readonly number[], never>
S.Head(S.Array(S.Number))

// ---------------------------------------------
// HeadOrElse
// ---------------------------------------------

// $ExpectType Schema<number, readonly number[], never>
S.HeadOrElse(S.Array(S.Number))

// ---------------------------------------------
// Class
// ---------------------------------------------

class VoidClass extends S.Class<VoidClass>("VoidClass")({}) {}

// $ExpectType [props?: void | {}, disableValidation?: boolean | undefined]
hole<ConstructorParameters<typeof VoidClass>>()

declare const aContext: S.Schema<string, string, "a">
declare const bContext: S.Schema<number, number, "b">
declare const cContext: S.Schema<boolean, boolean, "c">

class AB extends S.Class<AB>("AB")({ a: aContext, b: bContext }) {}

// $ExpectType AB
hole<S.Schema.Type<typeof AB>>()

// $ExpectType { readonly a: string; readonly b: number; }
hole<S.Schema.Encoded<typeof AB>>()

// $ExpectType "a" | "b"
hole<S.Schema.Context<typeof AB>>()

// $ExpectType { readonly a: Schema<string, string, "a">; readonly b: Schema<number, number, "b">; }
AB.fields

// $ExpectType [props: { readonly a: string; readonly b: number; }, disableValidation?: boolean | undefined]
hole<ConstructorParameters<typeof AB>>()

// can be extended with extend()

class EABC extends AB.extend<EABC>("EABC")({
  c: cContext
}) {}

// $ExpectType EABC
hole<S.Schema.Type<typeof EABC>>()

// $ExpectType { readonly a: string; readonly b: number; readonly c: boolean; }
hole<S.Schema.Encoded<typeof EABC>>()

// $ExpectType "a" | "b" | "c"
hole<S.Schema.Context<typeof EABC>>()

// $ExpectType { readonly a: Schema<string, string, "a">; readonly b: Schema<number, number, "b">; readonly c: Schema<boolean, boolean, "c">; }
EABC.fields

// $ExpectType [props: { readonly a: string; readonly b: number; readonly c: boolean; }, disableValidation?: boolean | undefined]
hole<ConstructorParameters<typeof EABC>>()

// can be extended with Class fields

class ABC extends S.Class<ABC>("ABC")({
  ...AB.fields,
  b: S.String,
  c: cContext
}) {}

// $ExpectType ABC
hole<S.Schema.Type<typeof ABC>>()

// $ExpectType { readonly a: string; readonly b: string; readonly c: boolean; }
hole<S.Schema.Encoded<typeof ABC>>()

// $ExpectType "a" | "c"
hole<S.Schema.Context<typeof ABC>>()

// $ExpectType { readonly b: $String; readonly c: Schema<boolean, boolean, "c">; readonly a: Schema<string, string, "a">; }
ABC.fields

// $ExpectType [props: { readonly a: string; readonly b: string; readonly c: boolean; }, disableValidation?: boolean | undefined]
hole<ConstructorParameters<typeof ABC>>()

// can be extended with TaggedClass fields

class D extends S.TaggedClass<D>()("D", {
  ...AB.fields,
  b: S.String,
  c: cContext
}) {}

// $ExpectType D
hole<S.Schema.Type<typeof D>>()

// $ExpectType { readonly _tag: "D"; readonly a: string; readonly b: string; readonly c: boolean; }
hole<S.Schema.Encoded<typeof D>>()

// $ExpectType "a" | "c"
hole<S.Schema.Context<typeof D>>()

// $ExpectType { readonly _tag: Literal<["D"]>; readonly b: $String; readonly c: Schema<boolean, boolean, "c">; readonly a: Schema<string, string, "a">; }
D.fields

// $ExpectType [props: { readonly a: string; readonly b: string; readonly c: boolean; }, disableValidation?: boolean | undefined]
hole<ConstructorParameters<typeof D>>()

// ---------------------------------------------
// TaggedClass
// ---------------------------------------------

class MyTaggedClass extends S.TaggedClass<MyTaggedClass>()("MyTaggedClass", {
  a: S.String
}) {}

// $ExpectType [props: { readonly a: string; }, disableValidation?: boolean | undefined]
hole<ConstructorParameters<typeof MyTaggedClass>>()

// $ExpectType { readonly _tag: "MyTaggedClass"; readonly a: string; }
hole<S.Schema.Encoded<typeof MyTaggedClass>>()

// $ExpectType MyTaggedClass
hole<S.Schema.Type<typeof MyTaggedClass>>()

class VoidTaggedClass extends S.TaggedClass<VoidTaggedClass>()("VoidTaggedClass", {}) {}

// $ExpectType [props?: void | {}, disableValidation?: boolean | undefined]
hole<ConstructorParameters<typeof VoidTaggedClass>>()

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
    S.Struct.Type<{ a: S.Schema<number, string>; b: S.PropertySignature<":", number, never, ":", string, "context"> }>
  >
>()

// $ExpectType { readonly a: number; readonly b: number; }
hole<
  Simplify<
    S.Struct.Type<{ a: S.Schema<number, string>; b: S.PropertySignature<":", number, never, "?:", string, "context"> }>
  >
>()

// $ExpectType { readonly a: number; readonly b: number; }
hole<
  Simplify<
    S.Struct.Type<{ a: S.Schema<number, string>; b: S.PropertySignature<":", number, "c", ":", string, "context"> }>
  >
>()

// $ExpectType { readonly a: number; readonly b: number; }
hole<
  Simplify<
    S.Struct.Type<{ a: S.Schema<number, string>; b: S.PropertySignature<":", number, "c", "?:", string, "context"> }>
  >
>()

// $ExpectType { readonly a: number; readonly b?: number; }
hole<
  Simplify<
    S.Struct.Type<{ a: S.Schema<number, string>; b: S.PropertySignature<"?:", number, never, ":", string, "context"> }>
  >
>()

// $ExpectType { readonly a: number; readonly b?: number; }
hole<
  Simplify<
    S.Struct.Type<{ a: S.Schema<number, string>; b: S.PropertySignature<"?:", number, never, "?:", string, "context"> }>
  >
>()

// $ExpectType { readonly a: number; readonly b?: number; }
hole<
  Simplify<
    S.Struct.Type<{ a: S.Schema<number, string>; b: S.PropertySignature<"?:", number, "c", ":", string, "context"> }>
  >
>()

// $ExpectType { readonly a: number; readonly b?: number; }
hole<
  Simplify<
    S.Struct.Type<{ a: S.Schema<number, string>; b: S.PropertySignature<"?:", number, "c", "?:", string, "context"> }>
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
      { a: S.Schema<number, string>; b: S.PropertySignature<":", number, never, ":", string, "context"> }
    >
  >
>()

// $ExpectType { readonly a: string; readonly b?: string; }
hole<
  Simplify<
    S.Struct.Encoded<
      { a: S.Schema<number, string>; b: S.PropertySignature<":", number, never, "?:", string, "context"> }
    >
  >
>()

// $ExpectType { readonly a: string; readonly c: string; }
hole<
  Simplify<
    S.Struct.Encoded<{ a: S.Schema<number, string>; b: S.PropertySignature<":", number, "c", ":", string, "context"> }>
  >
>()

// $ExpectType { readonly a: string; readonly c?: string; }
hole<
  Simplify<
    S.Struct.Encoded<{ a: S.Schema<number, string>; b: S.PropertySignature<":", number, "c", "?:", string, "context"> }>
  >
>()

// $ExpectType { readonly a: string; readonly b: string; }
hole<
  Simplify<
    S.Struct.Encoded<
      { a: S.Schema<number, string>; b: S.PropertySignature<"?:", number, never, ":", string, "context"> }
    >
  >
>()

// $ExpectType { readonly a: string; readonly b?: string; }
hole<
  Simplify<
    S.Struct.Encoded<
      { a: S.Schema<number, string>; b: S.PropertySignature<"?:", number, never, "?:", string, "context"> }
    >
  >
>()

// $ExpectType { readonly a: string; readonly c: string; }
hole<
  Simplify<
    S.Struct.Encoded<{ a: S.Schema<number, string>; b: S.PropertySignature<"?:", number, "c", ":", string, "context"> }>
  >
>()

// $ExpectType { readonly a: string; readonly c?: string; }
hole<
  Simplify<
    S.Struct.Encoded<
      { a: S.Schema<number, string>; b: S.PropertySignature<"?:", number, "c", "?:", string, "context"> }
    >
  >
>()

// ---------------------------------------------
// OptionFromSelf
// ---------------------------------------------

// $ExpectType Schema<Option<number>, Option<number>, never>
S.asSchema(S.OptionFromSelf(S.Number))

// $ExpectType OptionFromSelf<$Number>
S.OptionFromSelf(S.Number)

// $ExpectType Schema<Option<number>, Option<string>, never>
S.asSchema(S.OptionFromSelf(S.NumberFromString))

// $ExpectType OptionFromSelf<NumberFromString>
S.OptionFromSelf(S.NumberFromString)

// ---------------------------------------------
// Option
// ---------------------------------------------

// $ExpectType Schema<Option<number>, OptionEncoded<number>, never>
S.asSchema(S.Option(S.Number))

// $ExpectType Option<$Number>
S.Option(S.Number)

// $ExpectType Schema<Option<number>, OptionEncoded<string>, never>
S.asSchema(S.Option(S.NumberFromString))

// $ExpectType Option<NumberFromString>
S.Option(S.NumberFromString)

// ---------------------------------------------
// OptionFromNullOr
// ---------------------------------------------

// $ExpectType Schema<Option<number>, number | null, never>
S.asSchema(S.OptionFromNullOr(S.Number))

// $ExpectType OptionFromNullOr<$Number>
S.OptionFromNullOr(S.Number)

// $ExpectType Schema<Option<number>, string | null, never>
S.asSchema(S.OptionFromNullOr(S.NumberFromString))

// $ExpectType OptionFromNullOr<NumberFromString>
S.OptionFromNullOr(S.NumberFromString)

// ---------------------------------------------
// OptionFromUndefinedOr
// ---------------------------------------------

// $ExpectType Schema<Option<number>, string | undefined, never>
S.asSchema(S.OptionFromUndefinedOr(S.NumberFromString))

// $ExpectType OptionFromUndefinedOr<NumberFromString>
S.OptionFromUndefinedOr(S.NumberFromString)

// ---------------------------------------------
// OptionFromNullishOr
// ---------------------------------------------

// $ExpectType Schema<Option<number>, string | null | undefined, never>
S.asSchema(S.OptionFromNullishOr(S.NumberFromString, null))

// $ExpectType OptionFromNullishOr<NumberFromString>
S.OptionFromNullishOr(S.NumberFromString, undefined)

// ---------------------------------------------
// EitherFromSelf
// ---------------------------------------------

// $ExpectType Schema<Either<number, string>, Either<string, string>, never>
S.asSchema(S.EitherFromSelf({ Right: S.NumberFromString, Left: S.String }))

// $ExpectType EitherFromSelf<NumberFromString, $String>
S.EitherFromSelf({ Right: S.NumberFromString, Left: S.String })

// ---------------------------------------------
// Either
// ---------------------------------------------

// $ExpectType Schema<Either<number, string>, EitherEncoded<string, string>, never>
S.asSchema(S.Either({ Right: S.NumberFromString, Left: S.String }))

// $ExpectType Either<NumberFromString, $String>
S.Either({ Right: S.NumberFromString, Left: S.String })

// ---------------------------------------------
// EitherFromUnion
// ---------------------------------------------

// $ExpectType Schema<Either<number, boolean>, string | boolean, never>
S.asSchema(S.EitherFromUnion({ Right: S.NumberFromString, Left: S.Boolean }))

// $ExpectType EitherFromUnion<NumberFromString, $Boolean>
S.EitherFromUnion({ Right: S.NumberFromString, Left: S.Boolean })

// ---------------------------------------------
// ReadonlyMapFromSelf
// ---------------------------------------------

// $ExpectType Schema<ReadonlyMap<number, string>, ReadonlyMap<string, string>, never>
S.asSchema(S.ReadonlyMapFromSelf({ Key: S.NumberFromString, Value: S.String }))

// $ExpectType ReadonlyMapFromSelf<NumberFromString, $String>
S.ReadonlyMapFromSelf({ Key: S.NumberFromString, Value: S.String })

// ---------------------------------------------
// MapFromSelf
// ---------------------------------------------

// $ExpectType Schema<Map<number, string>, ReadonlyMap<string, string>, never>
S.asSchema(S.MapFromSelf({ Key: S.NumberFromString, Value: S.String }))

// $ExpectType MapFromSelf<NumberFromString, $String>
S.MapFromSelf({ Key: S.NumberFromString, Value: S.String })

// ---------------- -----------------------------
// ReadonlyMap
// ---------------------------------------------

// $ExpectType Schema<ReadonlyMap<number, string>, readonly (readonly [string, string])[], never>
S.asSchema(S.ReadonlyMap({ Key: S.NumberFromString, Value: S.String }))

// $ExpectType $ReadonlyMap<NumberFromString, $String>
S.ReadonlyMap({ Key: S.NumberFromString, Value: S.String })

// ---------------------------------------------
// Map
// ---------------------------------------------

// $ExpectType Schema<Map<number, string>, readonly (readonly [string, string])[], never>
S.asSchema(S.Map({ Key: S.NumberFromString, Value: S.String }))

// $ExpectType $Map<NumberFromString, $String>
S.Map({ Key: S.NumberFromString, Value: S.String })

// ---------------------------------------------
// HashMapFromSelf
// ---------------------------------------------

// $ExpectType Schema<HashMap<number, string>, HashMap<string, string>, never>
S.asSchema(S.HashMapFromSelf({ Key: S.NumberFromString, Value: S.String }))

// $ExpectType HashMapFromSelf<NumberFromString, $String>
S.HashMapFromSelf({ Key: S.NumberFromString, Value: S.String })

// ---------------------------------------------
// HashMap
// ---------------------------------------------

// $ExpectType Schema<HashMap<number, string>, readonly (readonly [string, string])[], never>
S.asSchema(S.HashMap({ Key: S.NumberFromString, Value: S.String }))

// $ExpectType HashMap<NumberFromString, $String>
S.HashMap({ Key: S.NumberFromString, Value: S.String })

// ---------------------------------------------
// ReadonlySetFromSelf
// ---------------------------------------------

// $ExpectType Schema<ReadonlySet<number>, ReadonlySet<string>, never>
S.asSchema(S.ReadonlySetFromSelf(S.NumberFromString))

// $ExpectType ReadonlySetFromSelf<NumberFromString>
S.ReadonlySetFromSelf(S.NumberFromString)

// ---------------------------------------------
// SetFromSelf
// ---------------------------------------------

// $ExpectType Schema<Set<number>, ReadonlySet<string>, never>
S.asSchema(S.SetFromSelf(S.NumberFromString))

// $ExpectType SetFromSelf<NumberFromString>
S.SetFromSelf(S.NumberFromString)

// ---------------------------------------------
// ReadonlySet
// ---------------------------------------------

// $ExpectType Schema<ReadonlySet<number>, readonly string[], never>
S.asSchema(S.ReadonlySet(S.NumberFromString))

// $ExpectType $ReadonlySet<NumberFromString>
S.ReadonlySet(S.NumberFromString)

// ---------------------------------------------
// Set
// ---------------------------------------------

// $ExpectType Schema<Set<number>, readonly string[], never>
S.asSchema(S.Set(S.NumberFromString))

// $ExpectType $Set<NumberFromString>
S.Set(S.NumberFromString)

// ---------------------------------------------
// HashSetFromSelf
// ---------------------------------------------

// $ExpectType Schema<HashSet<number>, HashSet<string>, never>
S.asSchema(S.HashSetFromSelf(S.NumberFromString))

// $ExpectType HashSetFromSelf<NumberFromString>
S.HashSetFromSelf(S.NumberFromString)

// ---------------------------------------------
// HashSet
// ---------------------------------------------

// $ExpectType Schema<HashSet<number>, readonly string[], never>
S.asSchema(S.HashSet(S.NumberFromString))

// $ExpectType HashSet<NumberFromString>
S.HashSet(S.NumberFromString)

// ---------------------------------------------
// ChunkFromSelf
// ---------------------------------------------

// $ExpectType Schema<Chunk<number>, Chunk<string>, never>
S.asSchema(S.ChunkFromSelf(S.NumberFromString))

// $ExpectType ChunkFromSelf<NumberFromString>
S.ChunkFromSelf(S.NumberFromString)

// ---------------------------------------------
// Chunk
// ---------------------------------------------

// $ExpectType Schema<Chunk<number>, readonly string[], never>
S.asSchema(S.Chunk(S.NumberFromString))

// $ExpectType Chunk<NumberFromString>
S.Chunk(S.NumberFromString)

// ---------------------------------------------
// ListFromSelf
// ---------------------------------------------

// $ExpectType Schema<List<number>, List<string>, never>
S.asSchema(S.ListFromSelf(S.NumberFromString))

// $ExpectType ListFromSelf<NumberFromString>
S.ListFromSelf(S.NumberFromString)

// ---------------------------------------------
// List
// ---------------------------------------------

// $ExpectType Schema<List<number>, readonly string[], never>
S.asSchema(S.List(S.NumberFromString))

// $ExpectType List<NumberFromString>
S.List(S.NumberFromString)

// ---------------------------------------------
// ExitFromSelf
// ---------------------------------------------

// $ExpectType Schema<Exit<number, string>, Exit<number, string>, never>
S.asSchema(S.ExitFromSelf({ Success: S.Number, Failure: S.String }))

// $ExpectType ExitFromSelf<$Number, $String, never>
S.ExitFromSelf({ Success: S.Number, Failure: S.String })

// $ExpectType Schema<Exit<number, string>, Exit<number, string>, "a">
S.asSchema(S.ExitFromSelf({ Success: S.Number, Failure: S.String, Defect: hole<S.Schema<unknown, unknown, "a">>() }))

// $ExpectType ExitFromSelf<$Number, $String, "a">
S.ExitFromSelf({ Success: S.Number, Failure: S.String, Defect: hole<S.Schema<unknown, unknown, "a">>() })

// ---------------------------------------------
// Exit
// ---------------------------------------------

// $ExpectType Schema<Exit<number, string>, ExitEncoded<number, string>, never>
S.asSchema(S.Exit({ Success: S.Number, Failure: S.String }))

// $ExpectType Exit<$Number, $String, never>
S.Exit({ Success: S.Number, Failure: S.String })

// $ExpectType Schema<Exit<number, string>, ExitEncoded<number, string>, "a">
S.asSchema(S.Exit({ Success: S.Number, Failure: S.String, Defect: hole<S.Schema<unknown, unknown, "a">>() }))

// $ExpectType Exit<$Number, $String, "a">
S.Exit({ Success: S.Number, Failure: S.String, Defect: hole<S.Schema<unknown, unknown, "a">>() })

// ---------------------------------------------
// CauseFromSelf
// ---------------------------------------------

// $ExpectType Schema<Cause<string>, Cause<string>, never>
S.asSchema(S.CauseFromSelf({ Error: S.String }))

// $ExpectType CauseFromSelf<$String, never>
S.CauseFromSelf({ Error: S.String })

// $ExpectType Schema<Cause<string>, Cause<string>, "a">
S.asSchema(S.CauseFromSelf({ Error: S.String, Defect: hole<S.Schema<unknown, unknown, "a">>() }))

// $ExpectType CauseFromSelf<$String, "a">
S.CauseFromSelf({ Error: S.String, Defect: hole<S.Schema<unknown, unknown, "a">>() })

// ---------------------------------------------
// Cause
// ---------------------------------------------

// $ExpectType Schema<Cause<string>, CauseEncoded<string>, never>
S.asSchema(S.Cause({ Error: S.String }))

// $ExpectType Cause<$String, never>
S.Cause({ Error: S.String })

// $ExpectType Schema<Cause<string>, CauseEncoded<string>, "a">
S.asSchema(S.Cause({ Error: S.String, Defect: hole<S.Schema<unknown, unknown, "a">>() }))

// $ExpectType Cause<$String, "a">
S.Cause({ Error: S.String, Defect: hole<S.Schema<unknown, unknown, "a">>() })

// ---------------------------------------------
// TypeLiteral
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; }, { readonly a: string; }, never>
S.asSchema(hole<S.TypeLiteral<{ a: S.$String }, []>>())

// $ExpectType Schema<{ readonly [x: string]: unknown; }, { readonly [x: string]: unknown; }, never>
S.asSchema(hole<S.TypeLiteral<{}, [{ key: S.$String; value: S.Unknown }]>>())

// $ExpectType Schema<{ readonly [x: string]: string; readonly [x: symbol]: number; }, { readonly [x: string]: never; }, never>
S.asSchema(hole<S.TypeLiteral<{}, [{ key: S.$String; value: S.$String }, { key: S.$Symbol; value: S.$Number }]>>())

// $ExpectType Schema<{ readonly [x: string]: unknown; readonly a: string; }, { readonly [x: string]: unknown; readonly a: string; }, never>
S.asSchema(hole<S.TypeLiteral<{ a: S.$String }, [{ key: S.$String; value: S.Unknown }]>>())

// ---------------------------------------------
// TupleType.Type
// ---------------------------------------------

// $ExpectType readonly []
hole<S.TupleType.Type<[], []>>()

// $ExpectType readonly [number]
hole<S.TupleType.Type<[S.NumberFromString], []>>()

// $ExpectType readonly number[]
hole<S.TupleType.Type<[], [S.NumberFromString]>>()

// $ExpectType readonly [number, ...number[]]
hole<S.TupleType.Type<[S.NumberFromString], [S.NumberFromString]>>()

// $ExpectType readonly [number, ...number[], number]
hole<S.TupleType.Type<[S.NumberFromString], [S.NumberFromString, S.NumberFromString]>>()

// $ExpectType readonly [number, number?]
hole<S.TupleType.Type<[S.NumberFromString, S.OptionalElement<S.NumberFromString>], []>>()

// $ExpectType readonly [number, number?, ...number[]]
hole<S.TupleType.Type<[S.NumberFromString, S.OptionalElement<S.NumberFromString>], [S.NumberFromString]>>()

// ---------------------------------------------
// TupleType.Encoded
// ---------------------------------------------

// $ExpectType readonly []
hole<S.TupleType.Encoded<[], []>>()

// $ExpectType readonly [string]
hole<S.TupleType.Encoded<[S.NumberFromString], []>>()

// $ExpectType readonly string[]
hole<S.TupleType.Encoded<[], [S.NumberFromString]>>()

// $ExpectType readonly [string, ...string[]]
hole<S.TupleType.Encoded<[S.NumberFromString], [S.NumberFromString]>>()

// $ExpectType readonly [string, ...string[], string]
hole<S.TupleType.Encoded<[S.NumberFromString], [S.NumberFromString, S.NumberFromString]>>()

// $ExpectType readonly [string, string?]
hole<S.TupleType.Encoded<[S.NumberFromString, S.OptionalElement<S.NumberFromString>], []>>()

// $ExpectType readonly [string, string?, ...string[]]
hole<S.TupleType.Encoded<[S.NumberFromString, S.OptionalElement<S.NumberFromString>], [S.NumberFromString]>>()

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

// $ExpectType SortedSetFromSelf<NumberFromString>
S.SortedSetFromSelf(S.NumberFromString, N.Order, Str.Order)

// ---------------------------------------------
// SortedSet
// ---------------------------------------------

// $ExpectType Schema<SortedSet<number>, readonly string[], never>
S.asSchema(S.SortedSet(S.NumberFromString, N.Order))

// $ExpectType SortedSet<NumberFromString>
S.SortedSet(S.NumberFromString, N.Order)
