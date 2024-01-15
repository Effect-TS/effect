import * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Option from "effect/Option"

declare const aContext: Schema.Schema<"a", string>
declare const bContext: Schema.Schema<"b", number>

// ---------------------------------------------
// union
// ---------------------------------------------

// $ExpectType Schema<"a" | "b", string | number, string | number>
Schema.union(aContext, bContext)

// ---------------------------------------------
// tuple
// ---------------------------------------------

// $ExpectType Schema<"a" | "b", readonly [string, number], readonly [string, number]>
Schema.tuple(aContext, bContext)

// ---------------------------------------------
// rest
// ---------------------------------------------

// $ExpectType Schema<"a" | "b", readonly [string, ...number[]], readonly [string, ...number[]]>
Schema.tuple(aContext).pipe(Schema.rest(bContext))

// ---------------------------------------------
// element
// ---------------------------------------------

// $ExpectType Schema<"a" | "b", readonly [string, number], readonly [string, number]>
Schema.tuple(aContext).pipe(Schema.element(bContext))

// ---------------------------------------------
// optionalElement
// ---------------------------------------------

// $ExpectType Schema<"a" | "b", readonly [string, number?], readonly [string, number?]>
Schema.tuple(aContext).pipe(Schema.optionalElement(bContext))

// ---------------------------------------------
// array
// ---------------------------------------------

// $ExpectType Schema<"a", readonly string[], readonly string[]>
Schema.array(aContext)

// ---------------------------------------------
// nonEmptyArray
// ---------------------------------------------

// $ExpectType Schema<"a", readonly [string, ...string[]], readonly [string, ...string[]]>
Schema.nonEmptyArray(aContext)

// ---------------------------------------------
// propertySignatureAnnotations
// ---------------------------------------------

// $ExpectType PropertySignature<"a", string, false, string, false>
aContext.pipe(Schema.propertySignatureAnnotations({}))

// ---------------------------------------------
// optionalToRequired
// ---------------------------------------------

// $ExpectType PropertySignature<"a", string, true, string, false>
Schema.optionalToRequired(aContext, Schema.string, Option.getOrElse(() => ""), Option.some)

// ---------------------------------------------
// optional
// ---------------------------------------------

// $ExpectType PropertySignature<"a", string | undefined, true, string | undefined, true>
Schema.optional(aContext)

// ---------------------------------------------
// struct
// ---------------------------------------------

// $ExpectType Schema<"a" | "b", { readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }>
Schema.struct({ a: aContext, b: bContext })

// ---------------------------------------------
// pick
// ---------------------------------------------

// $ExpectType Schema<"a" | "b", { readonly a: string; }, { readonly a: string; }>
Schema.struct({ a: aContext, b: bContext }).pipe(Schema.pick("a"))

// ---------------------------------------------
// omit
// ---------------------------------------------

// $ExpectType Schema<"a" | "b", { readonly a: string; }, { readonly a: string; }>
Schema.struct({ a: aContext, b: bContext }).pipe(Schema.omit("b"))

// ---------------------------------------------
// brand
// ---------------------------------------------

// @ts-expect-error
aContext.pipe(Schema.brand("a"))

// ---------------------------------------------
// partial
// ---------------------------------------------

// $ExpectType Schema<"a" | "b", { readonly a?: string; readonly b?: number; }, { readonly a?: string; readonly b?: number; }>
Schema.partial(Schema.struct({ a: aContext, b: bContext }))

// ---------------------------------------------
// required
// ---------------------------------------------

// $ExpectType Schema<"a" | "b", { readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }>
Schema.required(Schema.partial(Schema.struct({ a: aContext, b: bContext })))

// ---------------------------------------------
// mutable
// ---------------------------------------------

// $ExpectType Schema<"a" | "b", { a: string; b: number; }, { a: string; b: number; }>
Schema.mutable(Schema.struct({ a: aContext, b: bContext }))

// ---------------------------------------------
// record
// ---------------------------------------------

// $ExpectType Schema<"a" | "b", { readonly [x: string]: number; }, { readonly [x: string]: number; }>
Schema.record(aContext, bContext)

// ---------------------------------------------
// extend
// ---------------------------------------------

// $ExpectType Schema<"a" | "b", { readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }>
Schema.struct({ a: aContext, b: bContext }).pipe(Schema.extend(Schema.struct({ b: bContext })))

// ---------------------------------------------
// compose
// ---------------------------------------------

// $ExpectType Schema<"a" | "b", string, number>
aContext.pipe(Schema.compose(bContext))

// ---------------------------------------------
// suspend
// ---------------------------------------------

// $ExpectType Schema<"a", string, string>
Schema.suspend(() => aContext)

// ---------------------------------------------
// filter
// ---------------------------------------------

// $ExpectType Schema<"a", string, string>
aContext.pipe(Schema.filter(() => false))

// ---------------------------------------------
// transformOrFail
// ---------------------------------------------

// $ExpectType Schema<"a" | "b", string, number>
Schema.transformOrFail(aContext, bContext, () => ParseResult.succeed(1), () => ParseResult.succeed(""))

// ---------------------------------------------
// transform
// ---------------------------------------------

// $ExpectType Schema<"a" | "b", string, number>
Schema.transform(aContext, bContext, () => 1, () => "")

// ---------------------------------------------
// attachPropertySignature
// ---------------------------------------------

// $ExpectType Schema<"a", { readonly a: string; }, { readonly a: string; readonly _tag: "A"; }>
Schema.struct({ a: aContext }).pipe(Schema.attachPropertySignature("_tag", "A"))

// ---------------------------------------------
// annotations
// ---------------------------------------------

// $ExpectType Schema<"a", string, string>
aContext.pipe(Schema.annotations({}))

// ---------------------------------------------
// message
// ---------------------------------------------

// $ExpectType Schema<"a", string, string>
aContext.pipe(Schema.message(() => ""))

// ---------------------------------------------
// identifier
// ---------------------------------------------

// $ExpectType Schema<"a", string, string>
aContext.pipe(Schema.identifier(""))

// ---------------------------------------------
// title
// ---------------------------------------------

// $ExpectType Schema<"a", string, string>
aContext.pipe(Schema.title(""))

// ---------------------------------------------
// description
// ---------------------------------------------

// $ExpectType Schema<"a", string, string>
aContext.pipe(Schema.description(""))

// ---------------------------------------------
// examples
// ---------------------------------------------

// $ExpectType Schema<"a", string, string>
aContext.pipe(Schema.examples([]))

// ---------------------------------------------
// documentation
// ---------------------------------------------

// $ExpectType Schema<"a", string, string>
aContext.pipe(Schema.documentation(""))

// ---------------------------------------------
// jsonSchema
// ---------------------------------------------

// $ExpectType Schema<"a", string, string>
aContext.pipe(Schema.jsonSchema({}))

// ---------------------------------------------
// equivalence
// ---------------------------------------------

// $ExpectType Schema<"a", string, string>
aContext.pipe(Schema.equivalence(() => true))

// ---------------------------------------------
// rename
// ---------------------------------------------

// $ExpectType Schema<"a" | "b", { readonly a: string; readonly b: number; }, { readonly c: string; readonly d: number; }>
Schema.rename(Schema.struct({ a: aContext, b: bContext }), { a: "c", b: "d" })

// ---------------------------------------------
// Class
// ---------------------------------------------

export class MyClass extends Schema.Class<MyClass>()({
  // @ts-expect-error
  a: aContext
}) {}
