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

// $ExpectType Schema<void, void, never>
S.void

// $ExpectType Schema<undefined, undefined, never>
S.undefined

// $ExpectType Schema<string, string, never>
S.string

// $ExpectType Schema<number, number, never>
S.number

// $ExpectType Schema<boolean, boolean, never>
S.boolean

// $ExpectType Schema<bigint, bigint, never>
S.bigintFromSelf

// $ExpectType Schema<bigint, string, never>
S.bigint

// $ExpectType Schema<symbol, symbol, never>
S.symbolFromSelf

// $ExpectType Schema<symbol, string, never>
S.symbol

// $ExpectType Schema<unknown, unknown, never>
S.unknown

// $ExpectType Schema<any, any, never>
S.any

// $ExpectType Schema<object, object, never>
S.object

// ---------------------------------------------
// literals
// ---------------------------------------------

// $ExpectType Schema<null, null, never>
S.null

// $ExpectType Schema<never, never, never>
S.literal()

// $ExpectType Schema<"a", "a", never>
S.literal("a")

// $ExpectType Schema<"a" | "b" | "c", "a" | "b" | "c", never>
S.literal("a", "b", "c")

// $ExpectType Schema<1, 1, never>
S.literal(1)

// $ExpectType Schema<2n, 2n, never>
S.literal(2n) // bigint literal

// $ExpectType Schema<true, true, never>
S.literal(true)

// ---------------------------------------------
// strings
// ---------------------------------------------

// $ExpectType Schema<string, string, never>
pipe(S.string, S.maxLength(5))

// $ExpectType Schema<string, string, never>
pipe(S.string, S.minLength(5))

// $ExpectType Schema<string, string, never>
pipe(S.string, S.length(5))

// $ExpectType Schema<string, string, never>
pipe(S.string, S.pattern(/a/))

// $ExpectType Schema<string, string, never>
pipe(S.string, S.startsWith("a"))

// $ExpectType Schema<string, string, never>
pipe(S.string, S.endsWith("a"))

// $ExpectType Schema<string, string, never>
pipe(S.string, S.includes("a"))

// $ExpectType Schema<number, number, never>
pipe(S.number, S.greaterThan(5))

// $ExpectType Schema<number, number, never>
pipe(S.number, S.greaterThanOrEqualTo(5))

// $ExpectType Schema<number, number, never>
pipe(S.number, S.lessThan(5))

// $ExpectType Schema<number, number, never>
pipe(S.number, S.lessThanOrEqualTo(5))

// $ExpectType Schema<number, number, never>
pipe(S.number, S.int())

// $ExpectType Schema<number, number, never>
pipe(S.number, S.nonNaN()) // not NaN

// $ExpectType Schema<number, number, never>
pipe(S.number, S.finite()) // value must be finite, not Infinity or -Infinity

// ---------------------------------------------
// Native enums
// ---------------------------------------------

enum Fruits {
  Apple,
  Banana
}

// $ExpectType Schema<Fruits, Fruits, never>
S.enums(Fruits)

//
// Nullables
//

// $ExpectType Schema<string | null, string | null, never>
S.nullable(S.string)

// $ExpectType Schema<number | null, string | null, never>
S.nullable(S.NumberFromString)

// ---------------------------------------------
// Unions
// ---------------------------------------------

// $ExpectType Schema<string | number, string | number, never>
S.union(S.string, S.number)

// $ExpectType Schema<number | boolean, string | boolean, never>
S.union(S.boolean, S.NumberFromString)

// ---------------------------------------------
// keyof
// ---------------------------------------------

// $ExpectType Schema<"a" | "b", "a" | "b", never>
S.keyof(S.struct({ a: S.string, b: S.NumberFromString }))

// ---------------------------------------------
// Tuples
// ---------------------------------------------

// $ExpectType Schema<readonly [string, number], readonly [string, number], never>
S.tuple(S.string, S.number)

// $ExpectType Schema<readonly [string, number], readonly [string, string], never>
S.tuple(S.string, S.NumberFromString)

// ---------------------------------------------
// rest
// ---------------------------------------------

// $ExpectType Schema<readonly [string, number, ...boolean[]], readonly [string, number, ...boolean[]], never>
pipe(S.tuple(S.string, S.number), S.rest(S.boolean))

// $ExpectType Schema<readonly [string, number, ...number[]], readonly [string, string, ...string[]], never>
pipe(S.tuple(S.string, S.NumberFromString), S.rest(S.NumberFromString))

// ---------------------------------------------
// element
// ---------------------------------------------

// $ExpectType Schema<readonly [string, number, boolean], readonly [string, number, boolean], never>
pipe(S.tuple(S.string, S.number), S.element(S.boolean))

// $ExpectType Schema<readonly [string, number, number], readonly [string, string, string], never>
pipe(S.tuple(S.string, S.NumberFromString), S.element(S.NumberFromString))

// ---------------------------------------------
// optionalElement
// ---------------------------------------------

// $ExpectType Schema<readonly [string, number, boolean?], readonly [string, number, boolean?], never>
pipe(S.tuple(S.string, S.number), S.optionalElement(S.boolean))

// $ExpectType Schema<readonly [string, number, number?], readonly [string, string, string?], never>
pipe(S.tuple(S.string, S.NumberFromString), S.optionalElement(S.NumberFromString))

// ---------------------------------------------
// Arrays
// ---------------------------------------------

// $ExpectType Schema<readonly number[], readonly number[], never>
S.array(S.number)

// $ExpectType Schema<readonly number[], readonly string[], never>
S.array(S.NumberFromString)

// $ExpectType Schema<readonly [number, ...number[]], readonly [number, ...number[]], never>
S.nonEmptyArray(S.number)

// $ExpectType Schema<readonly [number, ...number[]], readonly [string, ...string[]], never>
S.nonEmptyArray(S.NumberFromString)

// ---------------------------------------------
// Structs
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
S.struct({ a: S.string, b: S.number })

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: string; }, never>
const MyModel = S.struct({ a: S.string, b: S.NumberFromString })

// $ExpectType { readonly a: string; readonly b: string; }
export type MyModelFrom = S.Schema.From<typeof MyModel>

// $ExpectType { readonly a: string; readonly b: number; }
export type MyModelTo = S.Schema.To<typeof MyModel>

// $ExpectType Schema<{ readonly a: never; }, { readonly a: never; }, never>
S.struct({ a: S.never })

// ---------------------------------------------
// optional { exact: true }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: boolean; }, { readonly a: string; readonly b: number; readonly c?: boolean; }, never>
S.struct({ a: S.string, b: S.number, c: S.optional(S.boolean, { exact: true }) })

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: number; }, { readonly a: string; readonly b: number; readonly c?: string; }, never>
S.struct({ a: S.string, b: S.number, c: S.optional(S.NumberFromString, { exact: true }) })

// $ExpectType Schema<{ readonly a?: never; }, { readonly a?: never; }, never>
S.struct({ a: S.optional(S.never, { exact: true }) })

// ---------------------------------------------
// optional
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: boolean | undefined; }, { readonly a: string; readonly b: number; readonly c?: boolean | undefined; }, never>
S.struct({ a: S.string, b: S.number, c: S.optional(S.boolean) })

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c?: number | undefined; }, { readonly a: string; readonly b: number; readonly c?: string | undefined; }, never>
S.struct({ a: S.string, b: S.number, c: S.optional(S.NumberFromString) })

// $ExpectType Schema<{ readonly a?: undefined; }, { readonly a?: undefined; }, never>
S.struct({ a: S.optional(S.never) })

// ---------------------------------------------
// optional { exact: true, default: () => A }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: boolean; }, { readonly a: string; readonly b: number; readonly c?: boolean; }, never>
S.struct({
  a: S.string,
  b: S.number,
  c: S.optional(S.boolean, { exact: true, default: () => false })
})

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: number; }, { readonly a: string; readonly b: number; readonly c?: string; }, never>
S.struct({
  a: S.string,
  b: S.number,
  c: S.optional(S.NumberFromString, { exact: true, default: () => 0 })
})

// @ts-expect-error
S.struct({ a: S.optional(S.literal("a", "b"), { default: () => "a", exact: true }) })

// ---------------------------------------------
// optional { default: () => A }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: boolean; }, { readonly a: string; readonly b: number; readonly c?: boolean | undefined; }, never>
S.struct({ a: S.string, b: S.number, c: S.optional(S.boolean, { default: () => false }) })

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: number; }, { readonly a: string; readonly b: number; readonly c?: string | undefined; }, never>
S.struct({ a: S.string, b: S.number, c: S.optional(S.NumberFromString, { default: () => 0 }) })

// @ts-expect-error
S.struct({ a: S.optional(S.literal("a", "b"), { default: () => "a" }) })

// ---------------------------------------------
// optional { nullable: true, default: () => A }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: number; }, { readonly a?: string | null | undefined; }, never>
S.struct({ a: S.optional(S.NumberFromString, { nullable: true, default: () => 0 }) })

// $ExpectType Schema<{ readonly a: number; }, { readonly a?: string | null; }, never>
S.struct({ a: S.optional(S.NumberFromString, { exact: true, nullable: true, default: () => 0 }) })

// @ts-expect-error
S.struct({ a: S.optional(S.literal("a", "b"), { default: () => "a", nullable: true }) })

// ---------------------------------------------
// optional { exact: true, as: "Option" }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: Option<boolean>; }, { readonly a: string; readonly b: number; readonly c?: boolean; }, never>
S.struct({ a: S.string, b: S.number, c: S.optional(S.boolean, { exact: true, as: "Option" }) })

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: Option<number>; }, { readonly a: string; readonly b: number; readonly c?: string; }, never>
S.struct({
  a: S.string,
  b: S.number,
  c: S.optional(S.NumberFromString, { exact: true, as: "Option" })
})

// ---------------------------------------------
// optional { as: "Option" }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: Option<boolean>; }, { readonly a: string; readonly b: number; readonly c?: boolean | undefined; }, never>
S.struct({ a: S.string, b: S.number, c: S.optional(S.boolean, { as: "Option" }) })

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: Option<number>; }, { readonly a: string; readonly b: number; readonly c?: string | undefined; }, never>
S.struct({ a: S.string, b: S.number, c: S.optional(S.NumberFromString, { as: "Option" }) })

// ---------------------------------------------
// optional { nullable: true, as: "Option" }
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: Option<number>; }, { readonly a?: string | null | undefined; }, never>
S.struct({ a: S.optional(S.NumberFromString, { nullable: true, as: "Option" }) })

// $ExpectType Schema<{ readonly a: Option<number>; }, { readonly a?: string | null; }, never>
S.struct({ a: S.optional(S.NumberFromString, { exact: true, nullable: true, as: "Option" }) })

// ---------------------------------------------
// pick
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
pipe(S.struct({ a: S.string, b: S.number, c: S.boolean }), S.pick("a", "b"))

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: string; }, never>
pipe(S.struct({ a: S.string, b: S.NumberFromString, c: S.boolean }), S.pick("a", "b"))

// ---------------------------------------------
// pick - optional
// ---------------------------------------------

// $ExpectType Schema<{ readonly a?: string; readonly b: number; }, { readonly a?: string; readonly b: number; }, never>
pipe(
  S.struct({ a: S.optional(S.string, { exact: true }), b: S.number, c: S.boolean }),
  S.pick("a", "b")
)

// $ExpectType Schema<{ readonly a?: string; readonly b: number; }, { readonly a?: string; readonly b: string; }, never>
pipe(
  S.struct({ a: S.optional(S.string, { exact: true }), b: S.NumberFromString, c: S.boolean }),
  S.pick("a", "b")
)

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a?: string; readonly b: string; }, never>
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

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
pipe(S.struct({ a: S.string, b: S.number, c: S.boolean }), S.omit("c"))

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: string; }, never>
pipe(S.struct({ a: S.string, b: S.NumberFromString, c: S.boolean }), S.omit("c"))

// ---------------------------------------------
// omit - optional
// ---------------------------------------------

// $ExpectType Schema<{ readonly a?: string; readonly b: number; }, { readonly a?: string; readonly b: number; }, never>
pipe(S.struct({ a: S.optional(S.string, { exact: true }), b: S.number, c: S.boolean }), S.omit("c"))

// $ExpectType Schema<{ readonly a?: string; readonly b: number; }, { readonly a?: string; readonly b: string; }, never>
pipe(
  S.struct({ a: S.optional(S.string, { exact: true }), b: S.NumberFromString, c: S.boolean }),
  S.omit("c")
)

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a?: string; readonly b: string; }, never>
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

// $ExpectType BrandSchema<number & Brand<"Int">, number>
pipe(S.number, S.int(), S.brand("Int"))

// $ExpectType BrandSchema<number & Brand<"Int">, string>
pipe(S.NumberFromString, S.int(), S.brand("Int"))

// $ExpectType BrandSchema<number & Brand<"Int">, number>
pipe(S.number, S.int(), S.brand("Int")).annotations({})

// $ExpectType Schema<number & Brand<"Int">, number, never>
S.number.pipe(S.int(), S.brand("Int"), S.annotations({}))

// $ExpectType Schema<number & Brand<"Int">, number, never>
S.annotations(S.number.pipe(S.int(), S.brand("Int")), {})

// $ExpectType Schema<never, never, never>
S.never.pipe(S.annotations({}))

// ---------------------------------------------
// Partial
// ---------------------------------------------

// $ExpectType Schema<{ readonly a?: string; readonly b?: number; }, { readonly a?: string; readonly b?: number; }, never>
S.partial(S.struct({ a: S.string, b: S.number }), { exact: true })

// $ExpectType Schema<{ readonly a?: string; readonly b?: number; }, { readonly a?: string; readonly b?: string; }, never>
S.partial(S.struct({ a: S.string, b: S.NumberFromString }), { exact: true })

// $ExpectType Schema<{ readonly a?: string | undefined; readonly b?: number | undefined; }, { readonly a?: string | undefined; readonly b?: number | undefined; }, never>
S.partial(S.struct({ a: S.string, b: S.number }))

// $ExpectType Schema<{ readonly a?: string | undefined; readonly b?: number | undefined; }, { readonly a?: string | undefined; readonly b?: string | undefined; }, never>
S.partial(S.struct({ a: S.string, b: S.NumberFromString }))

// ---------------------------------------------
// Required
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
S.required(
  S.struct({ a: S.optional(S.string, { exact: true }), b: S.optional(S.number, { exact: true }) })
)

// $ExpectType Schema<{ readonly b: number; readonly a: string; readonly c: number; }, { readonly b: string; readonly a: string; readonly c: string; }, never>
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

// $ExpectType Schema<{ readonly [x: string]: string; }, { readonly [x: string]: string; }, never>
S.record(S.string, S.string)

// $ExpectType Schema<{ readonly [x: string]: number; }, { readonly [x: string]: string; }, never>
S.record(S.string, S.NumberFromString)

// $ExpectType Schema<{ readonly [x: string]: string; }, { readonly [x: string]: string; }, never>
S.record(pipe(S.string, S.minLength(2)), S.string)

// $ExpectType Schema<{ readonly a: string; readonly b: string; }, { readonly a: string; readonly b: string; }, never>
S.record(S.union(S.literal("a"), S.literal("b")), S.string)

// $ExpectType Schema<{ readonly [x: symbol]: string; }, { readonly [x: symbol]: string; }, never>
S.record(S.symbolFromSelf, S.string)

// $ExpectType Schema<{ readonly [x: `a${string}`]: string; }, { readonly [x: `a${string}`]: string; }, never>
S.record(S.templateLiteral(S.literal("a"), S.string), S.string)

// $ExpectType Schema<{ readonly [x: string & Brand<"UserId">]: string; }, { readonly [x: string]: string; }, never>
S.record(S.string.pipe(S.brand("UserId")), S.string)

// $ExpectType Schema<{ readonly [x: string & Brand<symbol>]: string; }, { readonly [x: string]: string; }, never>
S.record(S.string.pipe(S.brand(Symbol.for("UserId"))), S.string)

// ---------------------------------------------
// Extend
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: string; readonly c: string; }, { readonly a: string; readonly b: string; readonly c: string; }, never>
pipe(
  S.struct({ a: S.string, b: S.string }),
  S.extend(S.struct({ c: S.string }))
)

// dual
// $ExpectType Schema<{ readonly a: string; readonly b: string; readonly c: string; }, { readonly a: string; readonly b: string; readonly c: string; }, never>
S.extend(S.struct({ a: S.string, b: S.string }), S.struct({ c: S.string }))

// rises an error in TypeScript@5.0
// // $ExpectType Schema<{ readonly [x: string]: string; readonly a: string; readonly b: string; readonly c: string; }, { readonly [x: string]: string; readonly a: string; readonly b: string; readonly c: string; }, never>
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
const lazy2: S.Schema<LazyTo2, LazyFrom2> = S.struct({
  a: S.NumberFromString,
  as: S.array(S.suspend(() => lazy2))
})

// ---------------------------------------------
// rename
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
S.rename(S.struct({ a: S.string, b: S.number }), {})

// $ExpectType Schema<{ readonly c: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
S.rename(S.struct({ a: S.string, b: S.number }), { a: "c" })

// $ExpectType Schema<{ readonly c: string; readonly d: number; }, { readonly a: string; readonly b: number; }, never>
S.rename(S.struct({ a: S.string, b: S.number }), { a: "c", b: "d" })

const a = Symbol.for("@effect/schema/dtslint/a")

// $ExpectType Schema<{ readonly [a]: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
S.rename(S.struct({ a: S.string, b: S.number }), { a })

// @ts-expect-error
S.rename(S.struct({ a: S.string, b: S.number }), { c: "d" })

// @ts-expect-error
S.rename(S.struct({ a: S.string, b: S.number }), { a: "c", d: "e" })

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
S.struct({ a: S.string, b: S.number }).pipe(S.rename({}))

// $ExpectType Schema<{ readonly c: string; readonly b: number; }, { readonly a: string; readonly b: number; }, never>
S.struct({ a: S.string, b: S.number }).pipe(S.rename({ a: "c" }))

// @ts-expect-error
S.struct({ a: S.string, b: S.number }).pipe(S.rename({ c: "d" }))

// @ts-expect-error
S.struct({ a: S.string, b: S.number }).pipe(S.rename({ a: "c", d: "e" }))

// ---------------------------------------------
// optionFromSelf
// ---------------------------------------------

// $ExpectType Schema<Option<number>, Option<number>, never>
S.optionFromSelf(S.number)

// $ExpectType Schema<Option<number>, Option<string>, never>
S.optionFromSelf(S.NumberFromString)

// ---------------------------------------------
// optionFromNullable
// ---------------------------------------------

// $ExpectType Schema<Option<number>, number | null, never>
S.optionFromNullable(S.number)

// $ExpectType Schema<Option<number>, string | null, never>
S.optionFromNullable(S.NumberFromString)

// ---------------------------------------------
// instanceOf
// ---------------------------------------------

class Test {
  constructor(readonly name: string) {}
}

// $ExpectType Schema<Test, Test, never>
S.instanceOf(Test)

// ---------------------------------------------
// Template literals
// ---------------------------------------------

// $ExpectType Schema<`a${string}`, `a${string}`, never>
S.templateLiteral(S.literal("a"), S.string)

// example from https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html
const EmailLocaleIDs = S.literal("welcome_email", "email_heading")
const FooterLocaleIDs = S.literal("footer_title", "footer_sendoff")

// $ExpectType Schema<"welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id", "welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id", never>
S.templateLiteral(S.union(EmailLocaleIDs, FooterLocaleIDs), S.literal("_id"))

// ---------------------------------------------
// attachPropertySignature
// ---------------------------------------------

// $ExpectType Schema<{ readonly radius: number; readonly kind: "circle"; }, { readonly radius: number; }, never>
pipe(S.struct({ radius: S.number }), S.attachPropertySignature("kind", "circle"))

// $ExpectType Schema<{ readonly radius: number; readonly kind: "circle"; }, { readonly radius: string; }, never>
pipe(S.struct({ radius: S.NumberFromString }), S.attachPropertySignature("kind", "circle"))

// ---------------------------------------------
// filter
// ---------------------------------------------

const predicateFilter1 = (u: unknown) => typeof u === "string"
const FromFilter = S.union(S.string, S.number)

// $ExpectType Schema<string | number, string | number, never>
pipe(FromFilter, S.filter(predicateFilter1))

const FromRefinement = S.struct({
  a: S.optional(S.string, { exact: true }),
  b: S.optional(S.number, { exact: true })
})

// $ExpectType Schema<{ readonly a?: string; readonly b?: number; } & { readonly b: number; }, { readonly a?: string; readonly b?: number; }, never>
pipe(FromRefinement, S.filter(S.is(S.struct({ b: S.number }))))

const LiteralFilter = S.literal("a", "b")
const predicateFilter2 = (u: unknown): u is "a" => typeof u === "string" && u === "a"

// $ExpectType Schema<"a", "a" | "b", never>
pipe(LiteralFilter, S.filter(predicateFilter2))

// $ExpectType Schema<"a", "a" | "b", never>
pipe(LiteralFilter, S.filter(S.is(S.literal("a"))))

// $ExpectType Schema<never, "a" | "b", never>
pipe(LiteralFilter, S.filter(S.is(S.literal("c"))))

declare const UnionFilter: S.Schema<
  { readonly a: string } | { readonly b: string },
  { readonly a: string } | { readonly b: string },
  never
>

// $ExpectType Schema<({ readonly a: string; } | { readonly b: string; }) & { readonly b: string; }, { readonly a: string; } | { readonly b: string; }, never>
pipe(UnionFilter, S.filter(S.is(S.struct({ b: S.string }))))

// $ExpectType Schema<number & Brand<"MyNumber">, number, never>
pipe(S.number, S.filter((n): n is number & Brand.Brand<"MyNumber"> => n > 0))

// $ExpectType Schema<string, string, never>
S.string.annotations({})

// $ExpectType Schema<string, string, never>
pipe(S.string, S.annotations({}))

// $ExpectType Schema<string, string, never>
S.string.pipe(S.annotations({}))

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

// $ExpectType Schema<readonly number[], string, never>
S.compose(S.split(","), S.array(S.NumberFromString))

// $ExpectType Schema<readonly number[], string, never>
S.split(",").pipe(S.compose(S.array(S.NumberFromString)))

// decoding (strict: false)

// $ExpectType Schema<number, string | null, never>
S.compose(S.union(S.null, S.string), S.NumberFromString, { strict: false })

// $ExpectType Schema<number, string | null, never>
S.union(S.null, S.string).pipe(S.compose(S.NumberFromString, { strict: false }))

// decoding (strict: true)

// @ts-expect-error
S.compose(S.union(S.null, S.string), S.NumberFromString)

// @ts-expect-error
S.union(S.null, S.string).pipe(S.compose(S.NumberFromString))

// encoding (strict: false)

// $ExpectType Schema<number | null, string, never>
S.compose(S.NumberFromString, S.union(S.null, S.number), { strict: false })

// $ExpectType Schema<number | null, string, never>
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

// $ExpectType Schema<number & Brand<"Eur">, number, never>
S.number.pipe(S.fromBrand(Eur))

// ---------------------------------------------
// mutable
// ---------------------------------------------

// $ExpectType Schema<string, string, never>
S.mutable(S.string)

// $ExpectType Schema<{ a: number; }, { a: number; }, never>
S.mutable(S.struct({ a: S.number }))

// $ExpectType Schema<{ [x: string]: number; }, { [x: string]: number; }, never>
S.mutable(S.record(S.string, S.number))

// $ExpectType Schema<string[], string[], never>
S.mutable(S.array(S.string))

// $ExpectType Schema<string[] | { a: number; }, string[] | { a: number; }, never>
S.mutable(S.union(S.struct({ a: S.number }), S.array(S.string)))

// $ExpectType Schema<string[], string[], never>
S.mutable(S.array(S.string).pipe(S.maxItems(2)))

// $ExpectType Schema<string[], string[], never>
S.mutable(S.suspend(() => S.array(S.string)))

// $ExpectType Schema<string[], string[], never>
S.mutable(S.transform(S.array(S.string), S.array(S.string), identity, identity))

// ---------------------------------------------
// transform
// ---------------------------------------------

// $ExpectType Schema<number, string, never>
S.string.pipe(S.transform(S.number, (s) => s.length, (n) => String(n)))

// $ExpectType Schema<number, string, never>
S.string.pipe(S.transform(S.number, (s) => s, (n) => n, { strict: false }))

// @ts-expect-error
S.string.pipe(S.transform(S.number, (s) => s, (n) => String(n)))

// @ts-expect-error
S.string.pipe(S.transform(S.number, (s) => s.length, (n) => n))

// ---------------------------------------------
// transformOrFail
// ---------------------------------------------

// $ExpectType Schema<number, string, never>
S.string.pipe(
  S.transformOrFail(
    S.number,
    (s) => ParseResult.succeed(s.length),
    (n) => ParseResult.succeed(String(n))
  )
)

// $ExpectType Schema<number, string, never>
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

// $ExpectType Schema<"a", 0, never>
S.transformLiteral(0, "a")

// ---------------------------------------------
// transformLiterals
// ---------------------------------------------

// $ExpectType Schema<"a" | "b", 0 | 1, never>
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

// $ExpectType Schema<{ readonly a: string; }, { readonly a: string; }, never>
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

// $ExpectType Schema<{ readonly _tag: "MyTaggedClass"; readonly a: string; }, { readonly _tag: "MyTaggedClass"; readonly a: string; }, never>
MyTaggedClass.struct

class VoidTaggedClass extends S.TaggedClass<VoidTaggedClass>()("VoidTaggedClass", {}) {}

// $ExpectType [props?: void | {}, disableValidation?: boolean | undefined]
export type VoidTaggedClassParams = ConstructorParameters<typeof VoidTaggedClass>

// ---------------------------------------------
// BigDecimal
// ---------------------------------------------

// $ExpectType Schema<BigDecimal, string, never>
S.BigDecimal

// $ExpectType Schema<BigDecimal, BigDecimal, never>
S.BigDecimalFromSelf

// $ExpectType Schema<BigDecimal, number, never>
S.BigDecimalFromNumber

// ---------------------------------------------
// Duration
// ---------------------------------------------

// $ExpectType Schema<Duration, readonly [seconds: number, nanos: number], never>
S.Duration

// $ExpectType Schema<Duration, Duration, never>
S.DurationFromSelf

// $ExpectType Schema<Duration, number, never>
S.DurationFromMillis

// $ExpectType Schema<Duration, bigint, never>
S.DurationFromNanos

// ---------------------------------------------
// Secret
// ---------------------------------------------

// $ExpectType Schema<Secret, string, never>
S.Secret

// $ExpectType Schema<Secret, Secret, never>
S.SecretFromSelf

// ---------------------------------------------
// propertySignatureAnnotations
// ---------------------------------------------

// $ExpectType PropertySignature<string, false, string, false, never>
S.string.pipe(S.propertySignatureAnnotations({ description: "description" }))

// $ExpectType PropertySignature<string | undefined, true, string | undefined, true, never>
S.optional(S.string).pipe(S.propertySignatureAnnotations({ description: "description" }))

// ---------------------------------------------
// pluck
// ---------------------------------------------

// $ExpectType Schema<string, { readonly a: string; readonly b: number; }, never>
S.pluck(S.struct({ a: S.string, b: S.number }), "a")

// $ExpectType Schema<string, { readonly a: string; readonly b: number; }, never>
pipe(S.struct({ a: S.string, b: S.number }), S.pluck("a"))

// ---------------------------------------------
// head
// ---------------------------------------------

// $ExpectType Schema<Option<number>, readonly number[], never>
S.head(S.array(S.number))

// ---------------------------------------------
// headOr
// ---------------------------------------------

// $ExpectType Schema<number, readonly number[], never>
S.headOr(S.array(S.number))

// ---------------------------------------------
// cause
// ---------------------------------------------

declare const defect: S.Schema<unknown, unknown, "defect">

// $ExpectType Schema<Cause<string>, CauseFrom<string>, never>
S.cause({ error: S.string })

// $ExpectType Schema<Cause<string>, CauseFrom<string>, "defect">
S.cause({ error: S.string, defect })

// ---------------------------------------------
// causeFromSelf
// ---------------------------------------------

// $ExpectType Schema<Cause<string>, Cause<string>, never>
S.causeFromSelf({ error: S.string })

// $ExpectType Schema<Cause<string>, Cause<string>, "defect">
S.causeFromSelf({ error: S.string, defect })
