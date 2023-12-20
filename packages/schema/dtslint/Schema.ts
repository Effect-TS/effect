import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Brand from "effect/Brand"
import { identity, pipe } from "effect/Function"

// ---------------------------------------------
// From
// ---------------------------------------------

// $ExpectType never
export type FromNever = S.Schema.From<typeof S.never>

// ---------------------------------------------
// To
// ---------------------------------------------

// $ExpectType never
export type ToNever = S.Schema.To<typeof S.never>

// ---------------------------------------------
// Primitives
// ---------------------------------------------

// $ExpectType Schema<void, void>
S.void

// $ExpectType Schema<undefined, undefined>
S.undefined

// $ExpectType Schema<string, string>
S.string

// $ExpectType Schema<number, number>
S.number

// $ExpectType Schema<boolean, boolean>
S.boolean

// $ExpectType Schema<bigint, bigint>
S.bigintFromSelf

// $ExpectType Schema<string, bigint>
S.bigint

// $ExpectType Schema<symbol, symbol>
S.symbolFromSelf

// $ExpectType Schema<string, symbol>
S.symbol

// $ExpectType Schema<unknown, unknown>
S.unknown

// $ExpectType Schema<any, any>
S.any

// $ExpectType Schema<object, object>
S.object

// ---------------------------------------------
// literals
// ---------------------------------------------

// $ExpectType Schema<null, null>
S.null

// $ExpectType Schema<never, never>
S.literal()

// $ExpectType Schema<"a", "a">
S.literal("a")

// $ExpectType Schema<"a" | "b" | "c", "a" | "b" | "c">
S.literal("a", "b", "c")

// $ExpectType Schema<1, 1>
S.literal(1)

// $ExpectType Schema<2n, 2n>
S.literal(2n) // bigint literal

// $ExpectType Schema<true, true>
S.literal(true)

// ---------------------------------------------
// strings
// ---------------------------------------------

// $ExpectType Schema<string, string>
pipe(S.string, S.maxLength(5))

// $ExpectType Schema<string, string>
pipe(S.string, S.minLength(5))

// $ExpectType Schema<string, string>
pipe(S.string, S.length(5))

// $ExpectType Schema<string, string>
pipe(S.string, S.pattern(/a/))

// $ExpectType Schema<string, string>
pipe(S.string, S.startsWith("a"))

// $ExpectType Schema<string, string>
pipe(S.string, S.endsWith("a"))

// $ExpectType Schema<string, string>
pipe(S.string, S.includes("a"))

// $ExpectType Schema<number, number>
pipe(S.number, S.greaterThan(5))

// $ExpectType Schema<number, number>
pipe(S.number, S.greaterThanOrEqualTo(5))

// $ExpectType Schema<number, number>
pipe(S.number, S.lessThan(5))

// $ExpectType Schema<number, number>
pipe(S.number, S.lessThanOrEqualTo(5))

// $ExpectType Schema<number, number>
pipe(S.number, S.int())

// $ExpectType Schema<number, number>
pipe(S.number, S.nonNaN()) // not NaN

// $ExpectType Schema<number, number>
pipe(S.number, S.finite()) // value must be finite, not Infinity or -Infinity

// ---------------------------------------------
// Native enums
// ---------------------------------------------

enum Fruits {
  Apple,
  Banana
}

// $ExpectType Schema<Fruits, Fruits>
S.enums(Fruits)

//
// Nullables
//

// $ExpectType Schema<string | null, string | null>
S.nullable(S.string)

// $ExpectType Schema<string | null, number | null>
S.nullable(S.NumberFromString)

// ---------------------------------------------
// Unions
// ---------------------------------------------

// $ExpectType Schema<string | number, string | number>
S.union(S.string, S.number)

// $ExpectType Schema<string | boolean, number | boolean>
S.union(S.boolean, S.NumberFromString)

// ---------------------------------------------
// keyof
// ---------------------------------------------

// $ExpectType Schema<"a" | "b", "a" | "b">
S.keyof(S.struct({ a: S.string, b: S.NumberFromString }))

// ---------------------------------------------
// Tuples
// ---------------------------------------------

// $ExpectType Schema<readonly [string, number], readonly [string, number]>
S.tuple(S.string, S.number)

// $ExpectType Schema<readonly [string, string], readonly [string, number]>
S.tuple(S.string, S.NumberFromString)

// ---------------------------------------------
// rest
// ---------------------------------------------

// $ExpectType Schema<readonly [string, number, ...boolean[]], readonly [string, number, ...boolean[]]>
pipe(S.tuple(S.string, S.number), S.rest(S.boolean))

// $ExpectType Schema<readonly [string, string, ...string[]], readonly [string, number, ...number[]]>
pipe(S.tuple(S.string, S.NumberFromString), S.rest(S.NumberFromString))

// ---------------------------------------------
// element
// ---------------------------------------------

// $ExpectType Schema<readonly [string, number, boolean], readonly [string, number, boolean]>
pipe(S.tuple(S.string, S.number), S.element(S.boolean))

// $ExpectType Schema<readonly [string, string, string], readonly [string, number, number]>
pipe(S.tuple(S.string, S.NumberFromString), S.element(S.NumberFromString))

// ---------------------------------------------
// optionalElement
// ---------------------------------------------

// $ExpectType Schema<readonly [string, number, boolean?], readonly [string, number, boolean?]>
pipe(S.tuple(S.string, S.number), S.optionalElement(S.boolean))

// $ExpectType Schema<readonly [string, string, string?], readonly [string, number, number?]>
pipe(S.tuple(S.string, S.NumberFromString), S.optionalElement(S.NumberFromString))

// ---------------------------------------------
// Arrays
// ---------------------------------------------

// $ExpectType Schema<readonly number[], readonly number[]>
S.array(S.number)

// $ExpectType Schema<readonly string[], readonly number[]>
S.array(S.NumberFromString)

// $ExpectType Schema<readonly [number, ...number[]], readonly [number, ...number[]]>
S.nonEmptyArray(S.number)

// $ExpectType Schema<readonly [string, ...string[]], readonly [number, ...number[]]>
S.nonEmptyArray(S.NumberFromString)

// ---------------------------------------------
// Structs
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }>
S.struct({ a: S.string, b: S.number })

// $ExpectType Schema<{ readonly a: string; readonly b: string; }, { readonly a: string; readonly b: number; }>
const MyModel = S.struct({ a: S.string, b: S.NumberFromString })

// $ExpectType { readonly a: string; readonly b: string; }
export type MyModelFrom = S.Schema.From<typeof MyModel>

// $ExpectType { readonly a: string; readonly b: number; }
export type MyModelTo = S.Schema.To<typeof MyModel>

// $ExpectType Schema<{ readonly a: never; }, { readonly a: never; }>
S.struct({ a: S.never })

// ---------------------------------------------
// optional { exact: true }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: boolean; }, { readonly a: string; readonly b: number; readonly c?: boolean; }>
S.struct({ a: S.string, b: S.number, c: S.optional(S.boolean, { exact: true }) })

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: string; }, { readonly a: string; readonly b: number; readonly c?: number; }>
S.struct({ a: S.string, b: S.number, c: S.optional(S.NumberFromString, { exact: true }) })

// $ExpectType Schema<{ readonly a?: never; }, { readonly a?: never; }>
S.struct({ a: S.optional(S.never, { exact: true }) })

// ---------------------------------------------
// optional
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: boolean | undefined; }, { readonly a: string; readonly b: number; readonly c?: boolean | undefined; }>
S.struct({ a: S.string, b: S.number, c: S.optional(S.boolean) })

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: string | undefined; }, { readonly a: string; readonly b: number; readonly c?: number | undefined; }>
S.struct({ a: S.string, b: S.number, c: S.optional(S.NumberFromString) })

// $ExpectType Schema<{ readonly a?: undefined; }, { readonly a?: undefined; }>
S.struct({ a: S.optional(S.never) })

// ---------------------------------------------
// optional { exact: true, default: () => A }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: boolean; }, { readonly a: string; readonly b: number; readonly c: boolean; }>
S.struct({
  a: S.string,
  b: S.number,
  c: S.optional(S.boolean, { exact: true, default: () => false })
})

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: string; }, { readonly a: string; readonly b: number; readonly c: number; }>
S.struct({
  a: S.string,
  b: S.number,
  c: S.optional(S.NumberFromString, { exact: true, default: () => 0 })
})

// ---------------------------------------------
// optional { default: () => A }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: boolean | undefined; }, { readonly a: string; readonly b: number; readonly c: boolean; }>
S.struct({ a: S.string, b: S.number, c: S.optional(S.boolean, { default: () => false }) })

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: string | undefined; }, { readonly a: string; readonly b: number; readonly c: number; }>
S.struct({ a: S.string, b: S.number, c: S.optional(S.NumberFromString, { default: () => 0 }) })

// ---------------------------------------------
// optional { nullable: true, default: () => A }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a?: string | null | undefined; }, { readonly a: number; }>
S.struct({ a: S.optional(S.NumberFromString, { nullable: true, default: () => 0 }) })

// $ExpectType Schema<{ readonly a?: string | null; }, { readonly a: number; }>
S.struct({ a: S.optional(S.NumberFromString, { exact: true, nullable: true, default: () => 0 }) })

// ---------------------------------------------
// optional { exact: true, as: "Option" }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: boolean; }, { readonly a: string; readonly b: number; readonly c: Option<boolean>; }>
S.struct({ a: S.string, b: S.number, c: S.optional(S.boolean, { exact: true, as: "Option" }) })

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: string; }, { readonly a: string; readonly b: number; readonly c: Option<number>; }>
S.struct({
  a: S.string,
  b: S.number,
  c: S.optional(S.NumberFromString, { exact: true, as: "Option" })
})

// ---------------------------------------------
// optional { as: "Option" }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: boolean | undefined; }, { readonly a: string; readonly b: number; readonly c: Option<boolean>; }>
S.struct({ a: S.string, b: S.number, c: S.optional(S.boolean, { as: "Option" }) })

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: string | undefined; }, { readonly a: string; readonly b: number; readonly c: Option<number>; }>
S.struct({ a: S.string, b: S.number, c: S.optional(S.NumberFromString, { as: "Option" }) })

// ---------------------------------------------
// optional { nullable: true, as: "Option" }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a?: string | null | undefined; }, { readonly a: Option<number>; }>
S.struct({ a: S.optional(S.NumberFromString, { nullable: true, as: "Option" }) })

// $ExpectType Schema<{ readonly a?: string | null; }, { readonly a: Option<number>; }>
S.struct({ a: S.optional(S.NumberFromString, { exact: true, nullable: true, as: "Option" }) })

// ---------------------------------------------
// pick
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }>
pipe(S.struct({ a: S.string, b: S.number, c: S.boolean }), S.pick("a", "b"))

// $ExpectType Schema<{ readonly a: string; readonly b: string; }, { readonly a: string; readonly b: number; }>
pipe(S.struct({ a: S.string, b: S.NumberFromString, c: S.boolean }), S.pick("a", "b"))

// ---------------------------------------------
// pick - optional
// ---------------------------------------------

// $ExpectType Schema<{ readonly a?: string; readonly b: number; }, { readonly a?: string; readonly b: number; }>
pipe(
  S.struct({ a: S.optional(S.string, { exact: true }), b: S.number, c: S.boolean }),
  S.pick("a", "b")
)

// $ExpectType Schema<{ readonly a?: string; readonly b: string; }, { readonly a?: string; readonly b: number; }>
pipe(
  S.struct({ a: S.optional(S.string, { exact: true }), b: S.NumberFromString, c: S.boolean }),
  S.pick("a", "b")
)

// $ExpectType Schema<{ readonly a?: string; readonly b: string; }, { readonly a: string; readonly b: number; }>
pipe(
  S.struct({
    a: S.optional(S.string, { exact: true, default: () => "" }),
    b: S.NumberFromString,
    c: S.boolean
  }),
  S.pick("a", "b")
)

// ---------------------------------------------
// omit
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }>
pipe(S.struct({ a: S.string, b: S.number, c: S.boolean }), S.omit("c"))

// $ExpectType Schema<{ readonly a: string; readonly b: string; }, { readonly a: string; readonly b: number; }>
pipe(S.struct({ a: S.string, b: S.NumberFromString, c: S.boolean }), S.omit("c"))

// ---------------------------------------------
// omit - optional
// ---------------------------------------------

// $ExpectType Schema<{ readonly a?: string; readonly b: number; }, { readonly a?: string; readonly b: number; }>
pipe(S.struct({ a: S.optional(S.string, { exact: true }), b: S.number, c: S.boolean }), S.omit("c"))

// $ExpectType Schema<{ readonly a?: string; readonly b: string; }, { readonly a?: string; readonly b: number; }>
pipe(
  S.struct({ a: S.optional(S.string, { exact: true }), b: S.NumberFromString, c: S.boolean }),
  S.omit("c")
)

// $ExpectType Schema<{ readonly a?: string; readonly b: string; }, { readonly a: string; readonly b: number; }>
pipe(
  S.struct({
    a: S.optional(S.string, { exact: true, default: () => "" }),
    b: S.NumberFromString,
    c: S.boolean
  }),
  S.omit("c")
)

// ---------------------------------------------
// brand
// ---------------------------------------------

// $ExpectType BrandSchema<number, number & Brand<"Int">>
pipe(S.number, S.int(), S.brand("Int"))

// $ExpectType BrandSchema<string, number & Brand<"Int">>
pipe(S.NumberFromString, S.int(), S.brand("Int"))

// ---------------------------------------------
// Partial
// ---------------------------------------------

// $ExpectType Schema<{ readonly a?: string; readonly b?: number; }, { readonly a?: string; readonly b?: number; }>
S.partial(S.struct({ a: S.string, b: S.number }))

// $ExpectType Schema<{ readonly a?: string; readonly b?: string; }, { readonly a?: string; readonly b?: number; }>
S.partial(S.struct({ a: S.string, b: S.NumberFromString }))

// ---------------------------------------------
// Required
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }>
S.required(
  S.struct({ a: S.optional(S.string, { exact: true }), b: S.optional(S.number, { exact: true }) })
)

// $ExpectType Schema<{ readonly b: string; readonly a: string; readonly c: string; }, { readonly b: number; readonly a: string; readonly c: number; }>
S.required(
  S.struct({
    a: S.optional(S.string, { exact: true }),
    b: S.NumberFromString,
    c: S.optional(S.NumberFromString, { exact: true })
  })
)

// ---------------------------------------------
// Records
// ---------------------------------------------

// $ExpectType Schema<{ readonly [x: string]: string; }, { readonly [x: string]: string; }>
S.record(S.string, S.string)

// $ExpectType Schema<{ readonly [x: string]: string; }, { readonly [x: string]: number; }>
S.record(S.string, S.NumberFromString)

// $ExpectType Schema<{ readonly [x: string]: string; }, { readonly [x: string]: string; }>
S.record(pipe(S.string, S.minLength(2)), S.string)

// $ExpectType Schema<{ readonly a: string; readonly b: string; }, { readonly a: string; readonly b: string; }>
S.record(S.union(S.literal("a"), S.literal("b")), S.string)

// $ExpectType Schema<{ readonly [x: symbol]: string; }, { readonly [x: symbol]: string; }>
S.record(S.symbolFromSelf, S.string)

// $ExpectType Schema<{ readonly [x: `a${string}`]: string; }, { readonly [x: `a${string}`]: string; }>
S.record(S.templateLiteral(S.literal("a"), S.string), S.string)

// $ExpectType Schema<{ readonly [x: string]: string; }, { readonly [x: string & Brand<"UserId">]: string; }>
S.record(S.string.pipe(S.brand("UserId")), S.string)

// $ExpectType Schema<{ readonly [x: string]: string; }, { readonly [x: string & Brand<symbol>]: string; }>
S.record(S.string.pipe(S.brand(Symbol.for("UserId"))), S.string)

// ---------------------------------------------
// Extend
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: string; readonly c: string; }, { readonly a: string; readonly b: string; readonly c: string; }>
pipe(
  S.struct({ a: S.string, b: S.string }),
  S.extend(S.struct({ c: S.string }))
)

// dual
// $ExpectType Schema<{ readonly a: string; readonly b: string; readonly c: string; }, { readonly a: string; readonly b: string; readonly c: string; }>
S.extend(S.struct({ a: S.string, b: S.string }), S.struct({ c: S.string }))

// rises an error in TypeScript@5.0
// // $ExpectType Schema<{ readonly [x: string]: string; readonly a: string; readonly b: string; readonly c: string; }, { readonly [x: string]: string; readonly a: string; readonly b: string; readonly c: string; }>
// pipe(
//   S.struct({ a: S.string, b: S.string }),
//   S.extend(S.struct({ c: S.string })),
//   S.extend(S.record(S.string, S.string))
// )

// ---------------------------------------------
// suspend
// ---------------------------------------------

interface SuspendTo1 {
  readonly a: number
  readonly as: ReadonlyArray<SuspendTo1>
}
const suspend1: S.Schema<SuspendTo1> = S.struct({
  a: S.number,
  as: S.array(S.suspend(() => suspend1))
})

interface LazyFrom2 {
  readonly a: string
  readonly as: ReadonlyArray<LazyFrom2>
}
interface LazyTo2 {
  readonly a: number
  readonly as: ReadonlyArray<LazyTo2>
}
const lazy2: S.Schema<LazyFrom2, LazyTo2> = S.struct({
  a: S.NumberFromString,
  as: S.array(S.suspend(() => lazy2))
})

// ---------------------------------------------
// rename
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }>
S.rename(S.struct({ a: S.string, b: S.number }), {})

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly c: string; readonly b: number; }>
S.rename(S.struct({ a: S.string, b: S.number }), { a: "c" })

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly c: string; readonly d: number; }>
S.rename(S.struct({ a: S.string, b: S.number }), { a: "c", b: "d" })

const a = Symbol.for("@effect/schema/dtslint/a")

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly [a]: string; readonly b: number; }>
S.rename(S.struct({ a: S.string, b: S.number }), { a })

// @ts-expect-error
S.rename(S.struct({ a: S.string, b: S.number }), { c: "d" })

// @ts-expect-error
S.rename(S.struct({ a: S.string, b: S.number }), { a: "c", d: "e" })

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }>
S.struct({ a: S.string, b: S.number }).pipe(S.rename({}))

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly c: string; readonly b: number; }>
S.struct({ a: S.string, b: S.number }).pipe(S.rename({ a: "c" }))

// @ts-expect-error
S.struct({ a: S.string, b: S.number }).pipe(S.rename({ c: "d" }))

// @ts-expect-error
S.struct({ a: S.string, b: S.number }).pipe(S.rename({ a: "c", d: "e" }))

// ---------------------------------------------
// optionFromSelf
// ---------------------------------------------

// $ExpectType Schema<Option<number>, Option<number>>
S.optionFromSelf(S.number)

// $ExpectType Schema<Option<string>, Option<number>>
S.optionFromSelf(S.NumberFromString)

// ---------------------------------------------
// optionFromNullable
// ---------------------------------------------

// $ExpectType Schema<number | null, Option<number>>
S.optionFromNullable(S.number)

// $ExpectType Schema<string | null, Option<number>>
S.optionFromNullable(S.NumberFromString)

// ---------------------------------------------
// instanceOf
// ---------------------------------------------

class Test {
  constructor(readonly name: string) {}
}

// $ExpectType Schema<Test, Test>
S.instanceOf(Test)

// ---------------------------------------------
// Template literals
// ---------------------------------------------

// $ExpectType Schema<`a${string}`, `a${string}`>
S.templateLiteral(S.literal("a"), S.string)

// example from https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html
const EmailLocaleIDs = S.literal("welcome_email", "email_heading")
const FooterLocaleIDs = S.literal("footer_title", "footer_sendoff")

// $ExpectType Schema<"welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id", "welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id">
S.templateLiteral(S.union(EmailLocaleIDs, FooterLocaleIDs), S.literal("_id"))

// ---------------------------------------------
// attachPropertySignature
// ---------------------------------------------

// $ExpectType Schema<{ readonly radius: number; }, { readonly radius: number; readonly kind: "circle"; }>
pipe(S.struct({ radius: S.number }), S.attachPropertySignature("kind", "circle"))

// $ExpectType Schema<{ readonly radius: string; }, { readonly radius: number; readonly kind: "circle"; }>
pipe(S.struct({ radius: S.NumberFromString }), S.attachPropertySignature("kind", "circle"))

// ---------------------------------------------
// filter
// ---------------------------------------------

const predicateFilter1 = (u: unknown) => typeof u === "string"
const FromFilter = S.union(S.string, S.number)

// $ExpectType Schema<string | number, string | number>
pipe(FromFilter, S.filter(predicateFilter1))

const FromRefinement = S.struct({
  a: S.optional(S.string, { exact: true }),
  b: S.optional(S.number, { exact: true })
})

// $ExpectType Schema<{ readonly a?: string; readonly b?: number; }, { readonly a?: string; readonly b?: number; } & { readonly b: number; }>
pipe(FromRefinement, S.filter(S.is(S.struct({ b: S.number }))))

const LiteralFilter = S.literal("a", "b")
const predicateFilter2 = (u: unknown): u is "a" => typeof u === "string" && u === "a"

// $ExpectType Schema<"a" | "b", "a">
pipe(LiteralFilter, S.filter(predicateFilter2))

// $ExpectType Schema<"a" | "b", "a">
pipe(LiteralFilter, S.filter(S.is(S.literal("a"))))

// $ExpectType Schema<"a" | "b", never>
pipe(LiteralFilter, S.filter(S.is(S.literal("c"))))

declare const UnionFilter: S.Schema<{ readonly a: string } | { readonly b: string }>

// $ExpectType Schema<{ readonly a: string; } | { readonly b: string; }, ({ readonly a: string; } | { readonly b: string; }) & { readonly b: string; }>
pipe(UnionFilter, S.filter(S.is(S.struct({ b: S.string }))))

// $ExpectType Schema<number, number & Brand<"MyNumber">>
pipe(S.number, S.filter((n): n is number & Brand.Brand<"MyNumber"> => n > 0))

// ---------------------------------------------
// compose
// ---------------------------------------------

// plain

// $ExpectType Schema<string, readonly number[]>
S.compose(S.split(","), S.array(S.NumberFromString))

// $ExpectType Schema<string, readonly number[]>
S.split(",").pipe(S.compose(S.array(S.NumberFromString)))

// decoding

// $ExpectType Schema<string | null, number>
S.compose(S.union(S.null, S.string), S.NumberFromString)

// $ExpectType Schema<string | null, number>
S.union(S.null, S.string).pipe(S.compose(S.NumberFromString))

// encoding

// $ExpectType Schema<string, number | null>
S.compose(S.NumberFromString, S.union(S.null, S.number))

// $ExpectType Schema<string, number | null>
S.NumberFromString.pipe(S.compose(S.union(S.null, S.number)))

// ---------------------------------------------
// fromBrand
// ---------------------------------------------

type Eur = number & Brand.Brand<"Eur">
const Eur = Brand.nominal<Eur>()

// $ExpectType Schema<number, number & Brand<"Eur">>
S.number.pipe(S.fromBrand(Eur))

// ---------------------------------------------
// mutable
// ---------------------------------------------

// $ExpectType Schema<string, string>
S.mutable(S.string)

// $ExpectType Schema<{ a: number; }, { a: number; }>
S.mutable(S.struct({ a: S.number }))

// $ExpectType Schema<{ [x: string]: number; }, { [x: string]: number; }>
S.mutable(S.record(S.string, S.number))

// $ExpectType Schema<string[], string[]>
S.mutable(S.array(S.string))

// $ExpectType Schema<string[] | { a: number; }, string[] | { a: number; }>
S.mutable(S.union(S.struct({ a: S.number }), S.array(S.string)))

// $ExpectType Schema<string[], string[]>
S.mutable(S.array(S.string).pipe(S.maxItems(2)))

// $ExpectType Schema<string[], string[]>
S.mutable(S.suspend(() => S.array(S.string)))

// $ExpectType Schema<string[], string[]>
S.mutable(S.transform(S.array(S.string), S.array(S.string), identity, identity))

// ---------------------------------------------
// transform
// ---------------------------------------------

// $ExpectType Schema<string, number>
S.string.pipe(S.transform(S.number, (s) => s.length, (n) => String(n)))

// $ExpectType Schema<string, number>
S.string.pipe(S.transform(S.number, (s) => s, (n) => n, { strict: false }))

// @ts-expect-error
S.string.pipe(S.transform(S.number, (s) => s, (n) => String(n)))

// @ts-expect-error
S.string.pipe(S.transform(S.number, (s) => s.length, (n) => n))

// ---------------------------------------------
// transformOrFail
// ---------------------------------------------

// $ExpectType Schema<string, number>
S.string.pipe(
  S.transformOrFail(
    S.number,
    (s) => ParseResult.succeed(s.length),
    (n) => ParseResult.succeed(String(n))
  )
)

// $ExpectType Schema<string, number>
S.string.pipe(
  S.transformOrFail(
    S.number,
    (s) => ParseResult.succeed(s),
    (n) => ParseResult.succeed(String(n)),
    { strict: false }
  )
)

S.string.pipe(
  // @ts-expect-error
  S.transformOrFail(S.number, (s) => ParseResult.succeed(s), (n) => ParseResult.succeed(String(n)))
)

S.string.pipe(
  // @ts-expect-error
  S.transformOrFail(S.number, (s) => ParseResult.succeed(s.length), (n) => ParseResult.succeed(n))
)

// ---------------------------------------------
// transformLiteral
// ---------------------------------------------

// $ExpectType Schema<0, "a">
S.transformLiteral(0, "a")

// ---------------------------------------------
// transformLiterals
// ---------------------------------------------

// $ExpectType Schema<0 | 1, "a" | "b">
S.transformLiterals([0, "a"], [1, "b"])

// ---------------------------------------------
// Class
// ---------------------------------------------

class MyClass extends S.Class<MyClass>()({
  a: S.string
}) {}

// $ExpectType { readonly a: string; }
export type MyClassFrom = S.Schema.From<typeof MyClass>

// $ExpectType MyClass
export type MyClassTo = S.Schema.To<typeof MyClass>

// $ExpectType Schema<{ readonly a: string; }, { readonly a: string; }>
MyClass.struct

class MyTaggedClass extends S.TaggedClass<MyTaggedClass>()("MyTaggedClass", {
  a: S.string
}) {}

// $ExpectType [props: { readonly a: string; }, disableValidation?: boolean | undefined]
export type MyTaggedClassParams = ConstructorParameters<typeof MyTaggedClass>

// $ExpectType { readonly _tag: "MyTaggedClass"; readonly a: string; }
export type MyTaggedClassFrom = S.Schema.From<typeof MyTaggedClass>

// $ExpectType MyTaggedClass
export type MyTaggedClassTo = S.Schema.To<typeof MyTaggedClass>

// $ExpectType Schema<{ readonly _tag: "MyTaggedClass"; readonly a: string; }, { readonly _tag: "MyTaggedClass"; readonly a: string; }>
MyTaggedClass.struct

class VoidTaggedClass extends S.TaggedClass<VoidTaggedClass>()("VoidTaggedClass", {}) {}

// $ExpectType [props?: void | {}, disableValidation?: boolean | undefined]
export type VoidTaggedClassParams = ConstructorParameters<typeof VoidTaggedClass>

// ---------------------------------------------
// BigDecimal
// ---------------------------------------------

// $ExpectType Schema<string, BigDecimal>
S.BigDecimal

// $ExpectType Schema<BigDecimal, BigDecimal>
S.BigDecimalFromSelf

// $ExpectType Schema<number, BigDecimal>
S.BigDecimalFromNumber

// ---------------------------------------------
// Duration
// ---------------------------------------------

// $ExpectType Schema<readonly [seconds: number, nanos: number], Duration>
S.Duration

// $ExpectType Schema<Duration, Duration>
S.DurationFromSelf

// $ExpectType Schema<number, Duration>
S.DurationFromMillis

// $ExpectType Schema<bigint, Duration>
S.DurationFromNanos

// ---------------------------------------------
// Secret
// ---------------------------------------------

// $ExpectType Schema<string, Secret>
S.Secret

// $ExpectType Schema<Secret, Secret>
S.SecretFromSelf

// ---------------------------------------------
// propertySignatureAnnotations
// ---------------------------------------------

// $ExpectType PropertySignature<string, false, string, false>
S.string.pipe(S.propertySignatureAnnotations({ description: "description" }))

// $ExpectType PropertySignature<string | undefined, true, string | undefined, true>
S.optional(S.string).pipe(S.propertySignatureAnnotations({ description: "description" }))
