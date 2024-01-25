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

// $ExpectType Schema<never, void, void>
S.void

// $ExpectType Schema<never, undefined, undefined>
S.undefined

// $ExpectType Schema<never, string, string>
S.string

// $ExpectType Schema<never, number, number>
S.number

// $ExpectType Schema<never, boolean, boolean>
S.boolean

// $ExpectType Schema<never, bigint, bigint>
S.bigintFromSelf

// $ExpectType Schema<never, string, bigint>
S.bigint

// $ExpectType Schema<never, symbol, symbol>
S.symbolFromSelf

// $ExpectType Schema<never, string, symbol>
S.symbol

// $ExpectType Schema<never, unknown, unknown>
S.unknown

// $ExpectType Schema<never, any, any>
S.any

// $ExpectType Schema<never, object, object>
S.object

// ---------------------------------------------
// literals
// ---------------------------------------------

// $ExpectType Schema<never, null, null>
S.null

// $ExpectType Schema<never, never, never>
S.literal()

// $ExpectType Schema<never, "a", "a">
S.literal("a")

// $ExpectType Schema<never, "a" | "b" | "c", "a" | "b" | "c">
S.literal("a", "b", "c")

// $ExpectType Schema<never, 1, 1>
S.literal(1)

// $ExpectType Schema<never, 2n, 2n>
S.literal(2n) // bigint literal

// $ExpectType Schema<never, true, true>
S.literal(true)

// ---------------------------------------------
// strings
// ---------------------------------------------

// $ExpectType Schema<never, string, string>
pipe(S.string, S.maxLength(5))

// $ExpectType Schema<never, string, string>
pipe(S.string, S.minLength(5))

// $ExpectType Schema<never, string, string>
pipe(S.string, S.length(5))

// $ExpectType Schema<never, string, string>
pipe(S.string, S.pattern(/a/))

// $ExpectType Schema<never, string, string>
pipe(S.string, S.startsWith("a"))

// $ExpectType Schema<never, string, string>
pipe(S.string, S.endsWith("a"))

// $ExpectType Schema<never, string, string>
pipe(S.string, S.includes("a"))

// $ExpectType Schema<never, number, number>
pipe(S.number, S.greaterThan(5))

// $ExpectType Schema<never, number, number>
pipe(S.number, S.greaterThanOrEqualTo(5))

// $ExpectType Schema<never, number, number>
pipe(S.number, S.lessThan(5))

// $ExpectType Schema<never, number, number>
pipe(S.number, S.lessThanOrEqualTo(5))

// $ExpectType Schema<never, number, number>
pipe(S.number, S.int())

// $ExpectType Schema<never, number, number>
pipe(S.number, S.nonNaN()) // not NaN

// $ExpectType Schema<never, number, number>
pipe(S.number, S.finite()) // value must be finite, not Infinity or -Infinity

// ---------------------------------------------
// Native enums
// ---------------------------------------------

enum Fruits {
  Apple,
  Banana
}

// $ExpectType Schema<never, Fruits, Fruits>
S.enums(Fruits)

//
// Nullables
//

// $ExpectType Schema<never, string | null, string | null>
S.nullable(S.string)

// $ExpectType Schema<never, string | null, number | null>
S.nullable(S.NumberFromString)

// ---------------------------------------------
// Unions
// ---------------------------------------------

// $ExpectType Schema<never, string | number, string | number>
S.union(S.string, S.number)

// $ExpectType Schema<never, string | boolean, number | boolean>
S.union(S.boolean, S.NumberFromString)

// ---------------------------------------------
// keyof
// ---------------------------------------------

// $ExpectType Schema<never, "a" | "b", "a" | "b">
S.keyof(S.struct({ a: S.string, b: S.NumberFromString }))

// ---------------------------------------------
// Tuples
// ---------------------------------------------

// $ExpectType Schema<never, readonly [string, number], readonly [string, number]>
S.tuple(S.string, S.number)

// $ExpectType Schema<never, readonly [string, string], readonly [string, number]>
S.tuple(S.string, S.NumberFromString)

// ---------------------------------------------
// rest
// ---------------------------------------------

// $ExpectType Schema<never, readonly [string, number, ...boolean[]], readonly [string, number, ...boolean[]]>
pipe(S.tuple(S.string, S.number), S.rest(S.boolean))

// $ExpectType Schema<never, readonly [string, string, ...string[]], readonly [string, number, ...number[]]>
pipe(S.tuple(S.string, S.NumberFromString), S.rest(S.NumberFromString))

// ---------------------------------------------
// element
// ---------------------------------------------

// $ExpectType Schema<never, readonly [string, number, boolean], readonly [string, number, boolean]>
pipe(S.tuple(S.string, S.number), S.element(S.boolean))

// $ExpectType Schema<never, readonly [string, string, string], readonly [string, number, number]>
pipe(S.tuple(S.string, S.NumberFromString), S.element(S.NumberFromString))

// ---------------------------------------------
// optionalElement
// ---------------------------------------------

// $ExpectType Schema<never, readonly [string, number, boolean?], readonly [string, number, boolean?]>
pipe(S.tuple(S.string, S.number), S.optionalElement(S.boolean))

// $ExpectType Schema<never, readonly [string, string, string?], readonly [string, number, number?]>
pipe(S.tuple(S.string, S.NumberFromString), S.optionalElement(S.NumberFromString))

// ---------------------------------------------
// Arrays
// ---------------------------------------------

// $ExpectType Schema<never, readonly number[], readonly number[]>
S.array(S.number)

// $ExpectType Schema<never, readonly string[], readonly number[]>
S.array(S.NumberFromString)

// $ExpectType Schema<never, readonly [number, ...number[]], readonly [number, ...number[]]>
S.nonEmptyArray(S.number)

// $ExpectType Schema<never, readonly [string, ...string[]], readonly [number, ...number[]]>
S.nonEmptyArray(S.NumberFromString)

// ---------------------------------------------
// Structs
// ---------------------------------------------

// $ExpectType Schema<never, { readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }>
S.struct({ a: S.string, b: S.number })

// $ExpectType Schema<never, { readonly a: string; readonly b: string; }, { readonly a: string; readonly b: number; }>
const MyModel = S.struct({ a: S.string, b: S.NumberFromString })

// $ExpectType { readonly a: string; readonly b: string; }
export type MyModelFrom = S.Schema.From<typeof MyModel>

// $ExpectType { readonly a: string; readonly b: number; }
export type MyModelTo = S.Schema.To<typeof MyModel>

// $ExpectType Schema<never, { readonly a: never; }, { readonly a: never; }>
S.struct({ a: S.never })

// ---------------------------------------------
// optional { exact: true }
// ---------------------------------------------

// $ExpectType Schema<never, { readonly a: string; readonly b: number; readonly c?: boolean; }, { readonly a: string; readonly b: number; readonly c?: boolean; }>
S.struct({ a: S.string, b: S.number, c: S.optional(S.boolean, { exact: true }) })

// $ExpectType Schema<never, { readonly a: string; readonly b: number; readonly c?: string; }, { readonly a: string; readonly b: number; readonly c?: number; }>
S.struct({ a: S.string, b: S.number, c: S.optional(S.NumberFromString, { exact: true }) })

// $ExpectType Schema<never, { readonly a?: never; }, { readonly a?: never; }>
S.struct({ a: S.optional(S.never, { exact: true }) })

// ---------------------------------------------
// optional
// ---------------------------------------------

// $ExpectType Schema<never, { readonly a: string; readonly b: number; readonly c?: boolean | undefined; }, { readonly a: string; readonly b: number; readonly c?: boolean | undefined; }>
S.struct({ a: S.string, b: S.number, c: S.optional(S.boolean) })

// $ExpectType Schema<never, { readonly a: string; readonly b: number; readonly c?: string | undefined; }, { readonly a: string; readonly b: number; readonly c?: number | undefined; }>
S.struct({ a: S.string, b: S.number, c: S.optional(S.NumberFromString) })

// $ExpectType Schema<never, { readonly a?: undefined; }, { readonly a?: undefined; }>
S.struct({ a: S.optional(S.never) })

// ---------------------------------------------
// optional { exact: true, default: () => A }
// ---------------------------------------------

// $ExpectType Schema<never, { readonly a: string; readonly b: number; readonly c?: boolean; }, { readonly a: string; readonly b: number; readonly c: boolean; }>
S.struct({
  a: S.string,
  b: S.number,
  c: S.optional(S.boolean, { exact: true, default: () => false })
})

// $ExpectType Schema<never, { readonly a: string; readonly b: number; readonly c?: string; }, { readonly a: string; readonly b: number; readonly c: number; }>
S.struct({
  a: S.string,
  b: S.number,
  c: S.optional(S.NumberFromString, { exact: true, default: () => 0 })
})

// ---------------------------------------------
// optional { default: () => A }
// ---------------------------------------------

// $ExpectType Schema<never, { readonly a: string; readonly b: number; readonly c?: boolean | undefined; }, { readonly a: string; readonly b: number; readonly c: boolean; }>
S.struct({ a: S.string, b: S.number, c: S.optional(S.boolean, { default: () => false }) })

// $ExpectType Schema<never, { readonly a: string; readonly b: number; readonly c?: string | undefined; }, { readonly a: string; readonly b: number; readonly c: number; }>
S.struct({ a: S.string, b: S.number, c: S.optional(S.NumberFromString, { default: () => 0 }) })

// ---------------------------------------------
// optional { nullable: true, default: () => A }
// ---------------------------------------------

// $ExpectType Schema<never, { readonly a?: string | null | undefined; }, { readonly a: number; }>
S.struct({ a: S.optional(S.NumberFromString, { nullable: true, default: () => 0 }) })

// $ExpectType Schema<never, { readonly a?: string | null; }, { readonly a: number; }>
S.struct({ a: S.optional(S.NumberFromString, { exact: true, nullable: true, default: () => 0 }) })

// ---------------------------------------------
// optional { exact: true, as: "Option" }
// ---------------------------------------------

// $ExpectType Schema<never, { readonly a: string; readonly b: number; readonly c?: boolean; }, { readonly a: string; readonly b: number; readonly c: Option<boolean>; }>
S.struct({ a: S.string, b: S.number, c: S.optional(S.boolean, { exact: true, as: "Option" }) })

// $ExpectType Schema<never, { readonly a: string; readonly b: number; readonly c?: string; }, { readonly a: string; readonly b: number; readonly c: Option<number>; }>
S.struct({
  a: S.string,
  b: S.number,
  c: S.optional(S.NumberFromString, { exact: true, as: "Option" })
})

// ---------------------------------------------
// optional { as: "Option" }
// ---------------------------------------------

// $ExpectType Schema<never, { readonly a: string; readonly b: number; readonly c?: boolean | undefined; }, { readonly a: string; readonly b: number; readonly c: Option<boolean>; }>
S.struct({ a: S.string, b: S.number, c: S.optional(S.boolean, { as: "Option" }) })

// $ExpectType Schema<never, { readonly a: string; readonly b: number; readonly c?: string | undefined; }, { readonly a: string; readonly b: number; readonly c: Option<number>; }>
S.struct({ a: S.string, b: S.number, c: S.optional(S.NumberFromString, { as: "Option" }) })

// ---------------------------------------------
// optional { nullable: true, as: "Option" }
// ---------------------------------------------

// $ExpectType Schema<never, { readonly a?: string | null | undefined; }, { readonly a: Option<number>; }>
S.struct({ a: S.optional(S.NumberFromString, { nullable: true, as: "Option" }) })

// $ExpectType Schema<never, { readonly a?: string | null; }, { readonly a: Option<number>; }>
S.struct({ a: S.optional(S.NumberFromString, { exact: true, nullable: true, as: "Option" }) })

// ---------------------------------------------
// pick
// ---------------------------------------------

// $ExpectType Schema<never, { readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }>
pipe(S.struct({ a: S.string, b: S.number, c: S.boolean }), S.pick("a", "b"))

// $ExpectType Schema<never, { readonly a: string; readonly b: string; }, { readonly a: string; readonly b: number; }>
pipe(S.struct({ a: S.string, b: S.NumberFromString, c: S.boolean }), S.pick("a", "b"))

// ---------------------------------------------
// pick - optional
// ---------------------------------------------

// $ExpectType Schema<never, { readonly a?: string; readonly b: number; }, { readonly a?: string; readonly b: number; }>
pipe(
  S.struct({ a: S.optional(S.string, { exact: true }), b: S.number, c: S.boolean }),
  S.pick("a", "b")
)

// $ExpectType Schema<never, { readonly a?: string; readonly b: string; }, { readonly a?: string; readonly b: number; }>
pipe(
  S.struct({ a: S.optional(S.string, { exact: true }), b: S.NumberFromString, c: S.boolean }),
  S.pick("a", "b")
)

// $ExpectType Schema<never, { readonly a?: string; readonly b: string; }, { readonly a: string; readonly b: number; }>
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

// $ExpectType Schema<never, { readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }>
pipe(S.struct({ a: S.string, b: S.number, c: S.boolean }), S.omit("c"))

// $ExpectType Schema<never, { readonly a: string; readonly b: string; }, { readonly a: string; readonly b: number; }>
pipe(S.struct({ a: S.string, b: S.NumberFromString, c: S.boolean }), S.omit("c"))

// ---------------------------------------------
// omit - optional
// ---------------------------------------------

// $ExpectType Schema<never, { readonly a?: string; readonly b: number; }, { readonly a?: string; readonly b: number; }>
pipe(S.struct({ a: S.optional(S.string, { exact: true }), b: S.number, c: S.boolean }), S.omit("c"))

// $ExpectType Schema<never, { readonly a?: string; readonly b: string; }, { readonly a?: string; readonly b: number; }>
pipe(
  S.struct({ a: S.optional(S.string, { exact: true }), b: S.NumberFromString, c: S.boolean }),
  S.omit("c")
)

// $ExpectType Schema<never, { readonly a?: string; readonly b: string; }, { readonly a: string; readonly b: number; }>
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

// $ExpectType BrandSchema<never, number, number & Brand<"Int">>
pipe(S.number, S.int(), S.brand("Int"))

// $ExpectType BrandSchema<never, string, number & Brand<"Int">>
pipe(S.NumberFromString, S.int(), S.brand("Int"))

// ---------------------------------------------
// Partial
// ---------------------------------------------

// $ExpectType Schema<never, { readonly a?: string; readonly b?: number; }, { readonly a?: string; readonly b?: number; }>
S.partial(S.struct({ a: S.string, b: S.number }))

// $ExpectType Schema<never, { readonly a?: string; readonly b?: string; }, { readonly a?: string; readonly b?: number; }>
S.partial(S.struct({ a: S.string, b: S.NumberFromString }))

// ---------------------------------------------
// Required
// ---------------------------------------------

// $ExpectType Schema<never, { readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }>
S.required(
  S.struct({ a: S.optional(S.string, { exact: true }), b: S.optional(S.number, { exact: true }) })
)

// $ExpectType Schema<never, { readonly b: string; readonly a: string; readonly c: string; }, { readonly b: number; readonly a: string; readonly c: number; }>
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

// $ExpectType Schema<never, { readonly [x: string]: string; }, { readonly [x: string]: string; }>
S.record(S.string, S.string)

// $ExpectType Schema<never, { readonly [x: string]: string; }, { readonly [x: string]: number; }>
S.record(S.string, S.NumberFromString)

// $ExpectType Schema<never, { readonly [x: string]: string; }, { readonly [x: string]: string; }>
S.record(pipe(S.string, S.minLength(2)), S.string)

// $ExpectType Schema<never, { readonly a: string; readonly b: string; }, { readonly a: string; readonly b: string; }>
S.record(S.union(S.literal("a"), S.literal("b")), S.string)

// $ExpectType Schema<never, { readonly [x: symbol]: string; }, { readonly [x: symbol]: string; }>
S.record(S.symbolFromSelf, S.string)

// $ExpectType Schema<never, { readonly [x: `a${string}`]: string; }, { readonly [x: `a${string}`]: string; }>
S.record(S.templateLiteral(S.literal("a"), S.string), S.string)

// $ExpectType Schema<never, { readonly [x: string]: string; }, { readonly [x: string & Brand<"UserId">]: string; }>
S.record(S.string.pipe(S.brand("UserId")), S.string)

// $ExpectType Schema<never, { readonly [x: string]: string; }, { readonly [x: string & Brand<symbol>]: string; }>
S.record(S.string.pipe(S.brand(Symbol.for("UserId"))), S.string)

// ---------------------------------------------
// Extend
// ---------------------------------------------

// $ExpectType Schema<never, { readonly a: string; readonly b: string; readonly c: string; }, { readonly a: string; readonly b: string; readonly c: string; }>
pipe(
  S.struct({ a: S.string, b: S.string }),
  S.extend(S.struct({ c: S.string }))
)

// dual
// $ExpectType Schema<never, { readonly a: string; readonly b: string; readonly c: string; }, { readonly a: string; readonly b: string; readonly c: string; }>
S.extend(S.struct({ a: S.string, b: S.string }), S.struct({ c: S.string }))

// rises an error in TypeScript@5.0
// // $ExpectType Schema<never, { readonly [x: string]: string; readonly a: string; readonly b: string; readonly c: string; }, { readonly [x: string]: string; readonly a: string; readonly b: string; readonly c: string; }>
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
const suspend1: S.Schema<never, SuspendTo1> = S.struct({
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
const lazy2: S.Schema<never, LazyFrom2, LazyTo2> = S.struct({
  a: S.NumberFromString,
  as: S.array(S.suspend(() => lazy2))
})

// ---------------------------------------------
// rename
// ---------------------------------------------

// $ExpectType Schema<never, { readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }>
S.rename(S.struct({ a: S.string, b: S.number }), {})

// $ExpectType Schema<never, { readonly a: string; readonly b: number; }, { readonly c: string; readonly b: number; }>
S.rename(S.struct({ a: S.string, b: S.number }), { a: "c" })

// $ExpectType Schema<never, { readonly a: string; readonly b: number; }, { readonly c: string; readonly d: number; }>
S.rename(S.struct({ a: S.string, b: S.number }), { a: "c", b: "d" })

const a = Symbol.for("@effect/schema/dtslint/a")

// $ExpectType Schema<never, { readonly a: string; readonly b: number; }, { readonly [a]: string; readonly b: number; }>
S.rename(S.struct({ a: S.string, b: S.number }), { a })

// @ts-expect-error
S.rename(S.struct({ a: S.string, b: S.number }), { c: "d" })

// @ts-expect-error
S.rename(S.struct({ a: S.string, b: S.number }), { a: "c", d: "e" })

// $ExpectType Schema<never, { readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }>
S.struct({ a: S.string, b: S.number }).pipe(S.rename({}))

// $ExpectType Schema<never, { readonly a: string; readonly b: number; }, { readonly c: string; readonly b: number; }>
S.struct({ a: S.string, b: S.number }).pipe(S.rename({ a: "c" }))

// @ts-expect-error
S.struct({ a: S.string, b: S.number }).pipe(S.rename({ c: "d" }))

// @ts-expect-error
S.struct({ a: S.string, b: S.number }).pipe(S.rename({ a: "c", d: "e" }))

// ---------------------------------------------
// optionFromSelf
// ---------------------------------------------

// $ExpectType Schema<never, Option<number>, Option<number>>
S.optionFromSelf(S.number)

// $ExpectType Schema<never, Option<string>, Option<number>>
S.optionFromSelf(S.NumberFromString)

// ---------------------------------------------
// optionFromNullable
// ---------------------------------------------

// $ExpectType Schema<never, number | null, Option<number>>
S.optionFromNullable(S.number)

// $ExpectType Schema<never, string | null, Option<number>>
S.optionFromNullable(S.NumberFromString)

// ---------------------------------------------
// instanceOf
// ---------------------------------------------

class Test {
  constructor(readonly name: string) {}
}

// $ExpectType Schema<never, Test, Test>
S.instanceOf(Test)

// ---------------------------------------------
// Template literals
// ---------------------------------------------

// $ExpectType Schema<never, `a${string}`, `a${string}`>
S.templateLiteral(S.literal("a"), S.string)

// example from https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html
const EmailLocaleIDs = S.literal("welcome_email", "email_heading")
const FooterLocaleIDs = S.literal("footer_title", "footer_sendoff")

// $ExpectType Schema<never, "welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id", "welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id">
S.templateLiteral(S.union(EmailLocaleIDs, FooterLocaleIDs), S.literal("_id"))

// ---------------------------------------------
// attachPropertySignature
// ---------------------------------------------

// $ExpectType Schema<never, { readonly radius: number; }, { readonly radius: number; readonly kind: "circle"; }>
pipe(S.struct({ radius: S.number }), S.attachPropertySignature("kind", "circle"))

// $ExpectType Schema<never, { readonly radius: string; }, { readonly radius: number; readonly kind: "circle"; }>
pipe(S.struct({ radius: S.NumberFromString }), S.attachPropertySignature("kind", "circle"))

// ---------------------------------------------
// filter
// ---------------------------------------------

const predicateFilter1 = (u: unknown) => typeof u === "string"
const FromFilter = S.union(S.string, S.number)

// $ExpectType Schema<never, string | number, string | number>
pipe(FromFilter, S.filter(predicateFilter1))

const FromRefinement = S.struct({
  a: S.optional(S.string, { exact: true }),
  b: S.optional(S.number, { exact: true })
})

// $ExpectType Schema<never, { readonly a?: string; readonly b?: number; }, { readonly a?: string; readonly b?: number; } & { readonly b: number; }>
pipe(FromRefinement, S.filter(S.is(S.struct({ b: S.number }))))

const LiteralFilter = S.literal("a", "b")
const predicateFilter2 = (u: unknown): u is "a" => typeof u === "string" && u === "a"

// $ExpectType Schema<never, "a" | "b", "a">
pipe(LiteralFilter, S.filter(predicateFilter2))

// $ExpectType Schema<never, "a" | "b", "a">
pipe(LiteralFilter, S.filter(S.is(S.literal("a"))))

// $ExpectType Schema<never, "a" | "b", never>
pipe(LiteralFilter, S.filter(S.is(S.literal("c"))))

declare const UnionFilter: S.Schema<never, { readonly a: string } | { readonly b: string }>

// $ExpectType Schema<never, { readonly a: string; } | { readonly b: string; }, ({ readonly a: string; } | { readonly b: string; }) & { readonly b: string; }>
pipe(UnionFilter, S.filter(S.is(S.struct({ b: S.string }))))

// $ExpectType Schema<never, number, number & Brand<"MyNumber">>
pipe(S.number, S.filter((n): n is number & Brand.Brand<"MyNumber"> => n > 0))

// annotations
pipe(
  S.string,
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

// $ExpectType Schema<never, string, readonly number[]>
S.compose(S.split(","), S.array(S.NumberFromString))

// $ExpectType Schema<never, string, readonly number[]>
S.split(",").pipe(S.compose(S.array(S.NumberFromString)))

// decoding (strict: false)

// $ExpectType Schema<never, string | null, number>
S.compose(S.union(S.null, S.string), S.NumberFromString, { strict: false })

// $ExpectType Schema<never, string | null, number>
S.union(S.null, S.string).pipe(S.compose(S.NumberFromString, { strict: false }))

// decoding (strict: true)

// @ts-expect-error
S.compose(S.union(S.null, S.string), S.NumberFromString)

// @ts-expect-error
S.union(S.null, S.string).pipe(S.compose(S.NumberFromString))

// encoding (strict: false)

// $ExpectType Schema<never, string, number | null>
S.compose(S.NumberFromString, S.union(S.null, S.number), { strict: false })

// $ExpectType Schema<never, string, number | null>
S.NumberFromString.pipe(S.compose(S.union(S.null, S.number), { strict: false }))

// encoding (strict: true)

// @ts-expect-error
S.compose(S.NumberFromString, S.union(S.null, S.number))

// @ts-expect-error
S.NumberFromString.pipe(S.compose(S.union(S.null, S.number)))

// ---------------------------------------------
// fromBrand
// ---------------------------------------------

type Eur = number & Brand.Brand<"Eur">
const Eur = Brand.nominal<Eur>()

// $ExpectType Schema<never, number, number & Brand<"Eur">>
S.number.pipe(S.fromBrand(Eur))

// ---------------------------------------------
// mutable
// ---------------------------------------------

// $ExpectType Schema<never, string, string>
S.mutable(S.string)

// $ExpectType Schema<never, { a: number; }, { a: number; }>
S.mutable(S.struct({ a: S.number }))

// $ExpectType Schema<never, { [x: string]: number; }, { [x: string]: number; }>
S.mutable(S.record(S.string, S.number))

// $ExpectType Schema<never, string[], string[]>
S.mutable(S.array(S.string))

// $ExpectType Schema<never, string[] | { a: number; }, string[] | { a: number; }>
S.mutable(S.union(S.struct({ a: S.number }), S.array(S.string)))

// $ExpectType Schema<never, string[], string[]>
S.mutable(S.array(S.string).pipe(S.maxItems(2)))

// $ExpectType Schema<never, string[], string[]>
S.mutable(S.suspend(() => S.array(S.string)))

// $ExpectType Schema<never, string[], string[]>
S.mutable(S.transform(S.array(S.string), S.array(S.string), identity, identity))

// ---------------------------------------------
// transform
// ---------------------------------------------

// $ExpectType Schema<never, string, number>
S.string.pipe(S.transform(S.number, (s) => s.length, (n) => String(n)))

// $ExpectType Schema<never, string, number>
S.string.pipe(S.transform(S.number, (s) => s, (n) => n, { strict: false }))

// @ts-expect-error
S.string.pipe(S.transform(S.number, (s) => s, (n) => String(n)))

// @ts-expect-error
S.string.pipe(S.transform(S.number, (s) => s.length, (n) => n))

// ---------------------------------------------
// transformOrFail
// ---------------------------------------------

// $ExpectType Schema<never, string, number>
S.string.pipe(
  S.transformOrFail(
    S.number,
    (s) => ParseResult.succeed(s.length),
    (n) => ParseResult.succeed(String(n))
  )
)

// $ExpectType Schema<never, string, number>
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

// $ExpectType Schema<never, 0, "a">
S.transformLiteral(0, "a")

// ---------------------------------------------
// transformLiterals
// ---------------------------------------------

// $ExpectType Schema<never, 0 | 1, "a" | "b">
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

// $ExpectType Schema<never, { readonly a: string; }, { readonly a: string; }>
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

// $ExpectType Schema<never, { readonly _tag: "MyTaggedClass"; readonly a: string; }, { readonly _tag: "MyTaggedClass"; readonly a: string; }>
MyTaggedClass.struct

class VoidTaggedClass extends S.TaggedClass<VoidTaggedClass>()("VoidTaggedClass", {}) {}

// $ExpectType [props?: void | {}, disableValidation?: boolean | undefined]
export type VoidTaggedClassParams = ConstructorParameters<typeof VoidTaggedClass>

// ---------------------------------------------
// BigDecimal
// ---------------------------------------------

// $ExpectType Schema<never, string, BigDecimal>
S.BigDecimal

// $ExpectType Schema<never, BigDecimal, BigDecimal>
S.BigDecimalFromSelf

// $ExpectType Schema<never, number, BigDecimal>
S.BigDecimalFromNumber

// ---------------------------------------------
// Duration
// ---------------------------------------------

// $ExpectType Schema<never, readonly [seconds: number, nanos: number], Duration>
S.Duration

// $ExpectType Schema<never, Duration, Duration>
S.DurationFromSelf

// $ExpectType Schema<never, number, Duration>
S.DurationFromMillis

// $ExpectType Schema<never, bigint, Duration>
S.DurationFromNanos

// ---------------------------------------------
// Secret
// ---------------------------------------------

// $ExpectType Schema<never, string, Secret>
S.Secret

// $ExpectType Schema<never, Secret, Secret>
S.SecretFromSelf

// ---------------------------------------------
// propertySignatureAnnotations
// ---------------------------------------------

// $ExpectType PropertySignature<never, string, false, string, false>
S.string.pipe(S.propertySignatureAnnotations({ description: "description" }))

// $ExpectType PropertySignature<never, string | undefined, true, string | undefined, true>
S.optional(S.string).pipe(S.propertySignatureAnnotations({ description: "description" }))

// ---------------------------------------------
// pluck
// ---------------------------------------------

// $ExpectType Schema<never, { readonly a: string; readonly b: number; }, string>
S.pluck(S.struct({ a: S.string, b: S.number }), "a")

// $ExpectType Schema<never, { readonly a: string; readonly b: number; }, string>
pipe(S.struct({ a: S.string, b: S.number }), S.pluck("a"))

// ---------------------------------------------
// head
// ---------------------------------------------

// $ExpectType Schema<never, readonly number[], Option<number>>
S.head(S.array(S.number))

// ---------------------------------------------
// headOr
// ---------------------------------------------

// $ExpectType Schema<never, readonly number[], number>
S.headOr(S.array(S.number))

// ---------------------------------------------
// cause
// ---------------------------------------------

declare const defect: S.Schema<"defect", unknown, unknown>

// $ExpectType Schema<never, CauseFrom<string>, Cause<string>>
S.cause(S.string)

// $ExpectType Schema<"defect", CauseFrom<string>, Cause<string>>
S.cause(S.string, defect)

// ---------------------------------------------
// causeFromSelf
// ---------------------------------------------

// $ExpectType Schema<never, Cause<string>, Cause<string>>
S.causeFromSelf(S.string)

// $ExpectType Schema<"defect", Cause<string>, Cause<string>>
S.causeFromSelf(S.string, defect)
