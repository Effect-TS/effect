import * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import { Context, Effect, Option } from "effect"
import { hole } from "effect/Function"

declare const aContext: Schema.Schema<string, string, "aContext">
declare const bContext: Schema.Schema<number, number, "bContext">
declare const cContext: Schema.Schema<string, string, "cContext">

const Taga = Context.GenericTag<"Taga", string>("Taga")
const Tagb = Context.GenericTag<"Tagb", number>("Tagb")
const Tag1 = Context.GenericTag<"Tag1", string>("Tag1")
const Tag2 = Context.GenericTag<"Tag2", number>("Tag2")

// ---------------------------------------------
// declare
// ---------------------------------------------

// $ExpectType Schema<string, string, never>
Schema.declare((u): u is string => typeof u === "string")

// $ExpectType Schema<string, number, "aContext" | "bContext">
Schema.declare(
  [aContext, bContext],
  (_a, _b) => () => ParseResult.succeed("a"),
  (_a, _b) => () => ParseResult.succeed(1),
  {
    arbitrary: (
      _a, // $ExpectType Arbitrary<string>
      _b // $ExpectType Arbitrary<number>
    ) =>
    (fc) => fc.string(),
    pretty: (
      _a, // $ExpectType Pretty<string>
      _b // $ExpectType Pretty<number>
    ) =>
    (
      s // $ExpectType string
    ) => s,
    equivalence: () =>
    (
      _a, // $ExpectType string
      _b // $ExpectType string
    ) => true
  }
)

Schema.declare(
  [aContext, bContext],
  // @ts-expect-error
  (_a, _b) => () => Taga.pipe(Effect.flatMap(ParseResult.succeed)),
  (_a, _b) => () => ParseResult.succeed(1)
)

Schema.declare(
  [aContext, bContext],
  (_a, _b) => () => ParseResult.succeed("a"),
  // @ts-expect-error
  (_a, _b) => () => Tagb.pipe(Effect.flatMap(ParseResult.succeed))
)

Schema.declare(
  [aContext, bContext],
  // @ts-expect-error
  (_a, _b) => () => Taga.pipe(Effect.flatMap(ParseResult.succeed)),
  (_a, _b) => () => Tagb.pipe(Effect.flatMap(ParseResult.succeed))
)

Schema.declare(
  [],
  // @ts-expect-error
  () => () => Tag1.pipe(Effect.flatMap(ParseResult.succeed)),
  () => () => ParseResult.succeed(1)
)

Schema.declare(
  [aContext, bContext],
  // @ts-expect-error
  (_a, _b) => () => Tag1.pipe(Effect.flatMap(ParseResult.succeed)),
  (_a, _b) => () => ParseResult.succeed(1)
)

Schema.declare(
  [aContext, bContext],
  (_a, _b) => () => ParseResult.succeed("a"),
  // @ts-expect-error
  (_a, _b) => () => Tag2.pipe(Effect.flatMap(ParseResult.succeed))
)

// ---------------------------------------------
// union
// ---------------------------------------------

// $ExpectType Schema<string | number, string | number, "aContext" | "bContext">
Schema.union(aContext, bContext)

// ---------------------------------------------
// tuple
// ---------------------------------------------

// $ExpectType Schema<readonly [string, number], readonly [string, number], "aContext" | "bContext">
Schema.tuple(aContext, bContext)

// ---------------------------------------------
// rest
// ---------------------------------------------

// $ExpectType Schema<readonly [string, ...number[]], readonly [string, ...number[]], "aContext" | "bContext">
Schema.tuple(aContext).pipe(Schema.rest(bContext))

// ---------------------------------------------
// element
// ---------------------------------------------

// $ExpectType Schema<readonly [string, number], readonly [string, number], "aContext" | "bContext">
Schema.tuple(aContext).pipe(Schema.element(bContext))

// ---------------------------------------------
// optionalElement
// ---------------------------------------------

// $ExpectType Schema<readonly [string, number?], readonly [string, number?], "aContext" | "bContext">
Schema.tuple(aContext).pipe(Schema.optionalElement(bContext))

// ---------------------------------------------
// array
// ---------------------------------------------

// $ExpectType Schema<readonly string[], readonly string[], "aContext">
Schema.asSchema(Schema.array(aContext))

// $ExpectType array<Schema<string, string, "aContext">>
Schema.array(aContext)

// ---------------------------------------------
// nonEmptyArray
// ---------------------------------------------

// $ExpectType Schema<readonly [string, ...string[]], readonly [string, ...string[]], "aContext">
Schema.asSchema(Schema.nonEmptyArray(aContext))

// $ExpectType nonEmptyArray<Schema<string, string, "aContext">>
Schema.nonEmptyArray(aContext)

// ---------------------------------------------
// propertySignatureDeclaration
// ---------------------------------------------

// $ExpectType PropertySignature<never, ":", string, ":", string, "aContext">
aContext.pipe(Schema.propertySignatureDeclaration)

// ---------------------------------------------
// optionalToRequired
// ---------------------------------------------

// $ExpectType PropertySignature<never, ":", string, "?:", string, "aContext">
Schema.optionalToRequired(aContext, Schema.string, Option.getOrElse(() => ""), Option.some)

// ---------------------------------------------
// optional
// ---------------------------------------------

// $ExpectType PropertySignature<never, "?:", string | undefined, "?:", string | undefined, "aContext">
Schema.optional(aContext)

// ---------------------------------------------
// struct
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, "aContext" | "bContext">
Schema.asSchema(Schema.struct({ a: aContext, b: bContext }))

// $ExpectType struct<{ a: Schema<string, string, "aContext">; b: Schema<number, number, "bContext">; }>
Schema.struct({ a: aContext, b: bContext })

// ---------------------------------------------
// pick
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; }, { readonly a: string; }, "aContext" | "bContext">
Schema.struct({ a: aContext, b: bContext }).pipe(Schema.pick("a"))

// ---------------------------------------------
// omit
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; }, { readonly a: string; }, "aContext" | "bContext">
Schema.struct({ a: aContext, b: bContext }).pipe(Schema.omit("b"))

// ---------------------------------------------
// brand
// ---------------------------------------------

// @ts-expect-error
aContext.pipe(Schema.brand("a"))

// ---------------------------------------------
// partial
// ---------------------------------------------

// $ExpectType Schema<{ readonly a?: string; readonly b?: number; }, { readonly a?: string; readonly b?: number; }, "aContext" | "bContext">
Schema.partial(Schema.struct({ a: aContext, b: bContext }), { exact: true })

// ---------------------------------------------
// required
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, "aContext" | "bContext">
Schema.required(Schema.partial(Schema.struct({ a: aContext, b: bContext }), { exact: true }))

// ---------------------------------------------
// mutable
// ---------------------------------------------

// $ExpectType Schema<{ a: string; b: number; }, { a: string; b: number; }, "aContext" | "bContext">
Schema.mutable(Schema.struct({ a: aContext, b: bContext }))

// ---------------------------------------------
// record
// ---------------------------------------------

// $ExpectType Schema<{ readonly [x: string]: number; }, { readonly [x: string]: number; }, "aContext" | "bContext">
Schema.record(aContext, bContext)

// ---------------------------------------------
// extend
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, "aContext" | "bContext">
Schema.struct({ a: aContext, b: bContext }).pipe(Schema.extend(Schema.struct({ b: bContext })))

// ---------------------------------------------
// compose
// ---------------------------------------------

// $ExpectType Schema<number, string, "aContext" | "bContext">
aContext.pipe(Schema.compose(bContext, { strict: false }))

// ---------------------------------------------
// suspend
// ---------------------------------------------

// $ExpectType Schema<string, string, "aContext">
Schema.suspend(() => aContext)

// ---------------------------------------------
// filter
// ---------------------------------------------

// $ExpectType Schema<string, string, "aContext">
aContext.pipe(Schema.filter(() => false))

// ---------------------------------------------
// transformOrFail
// ---------------------------------------------

// $ExpectType Schema<number, string, "aContext" | "bContext">
Schema.transformOrFail(aContext, bContext, () => ParseResult.succeed(1), () => ParseResult.succeed(""))

// ---------------------------------------------
// transform
// ---------------------------------------------

// $ExpectType Schema<number, string, "aContext" | "bContext">
Schema.transform(aContext, bContext, () => 1, () => "")

// ---------------------------------------------
// attachPropertySignature
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly _tag: "A"; }, { readonly a: string; }, "aContext">
Schema.struct({ a: aContext }).pipe(Schema.attachPropertySignature("_tag", "A"))

// ---------------------------------------------
// annotations (method)
// ---------------------------------------------

// $ExpectType Schema<string, string, "aContext">
aContext.annotations({})

// ---------------------------------------------
// message
// ---------------------------------------------

// $ExpectType Schema<string, string, "aContext">
aContext.pipe(Schema.message(() => ""))

// ---------------------------------------------
// identifier
// ---------------------------------------------

// $ExpectType Schema<string, string, "aContext">
aContext.pipe(Schema.identifier(""))

// ---------------------------------------------
// title
// ---------------------------------------------

// $ExpectType Schema<string, string, "aContext">
aContext.pipe(Schema.title(""))

// ---------------------------------------------
// description
// ---------------------------------------------

// $ExpectType Schema<string, string, "aContext">
aContext.pipe(Schema.description(""))

// ---------------------------------------------
// examples
// ---------------------------------------------

// $ExpectType Schema<string, string, "aContext">
aContext.pipe(Schema.examples(["a"]))

// ---------------------------------------------
// documentation
// ---------------------------------------------

// $ExpectType Schema<string, string, "aContext">
aContext.pipe(Schema.documentation(""))

// ---------------------------------------------
// jsonSchema
// ---------------------------------------------

// $ExpectType Schema<string, string, "aContext">
aContext.pipe(Schema.jsonSchema({}))

// ---------------------------------------------
// equivalence
// ---------------------------------------------

// $ExpectType Schema<string, string, "aContext">
aContext.pipe(Schema.equivalence(() => true))

// ---------------------------------------------
// rename
// ---------------------------------------------

// $ExpectType Schema<{ readonly c: string; readonly d: number; }, { readonly a: string; readonly b: number; }, "aContext" | "bContext">
Schema.rename(Schema.struct({ a: aContext, b: bContext }), { a: "c", b: "d" })

// ---------------------------------------------
// Class
// ---------------------------------------------

export class MyClass extends Schema.Class<MyClass>()({
  a: aContext
}) {}

// $ExpectType "aContext"
hole<Schema.Schema.Context<typeof MyClass>>()

// ---------------------------------------------
// Class.transform
// ---------------------------------------------

export class MyClassWithTransform extends MyClass.transformOrFail<MyClassWithTransform>()(
  {
    b: bContext
  },
  (i) => Tag1.pipe(Effect.flatMap((a) => ParseResult.succeed(i.a === a ? { ...i, b: 1 } : { ...i, b: 2 }))),
  (a) => Tag2.pipe(Effect.flatMap((b) => ParseResult.succeed(a.b === b ? { a: "a1" } : { a: "a2" })))
) {}

// $ExpectType "aContext" | "bContext" | "Tag1" | "Tag2"
hole<Schema.Schema.Context<typeof MyClassWithTransform>>()

// $ExpectType { readonly a: Schema<string, string, "aContext">; readonly b: Schema<number, number, "bContext">; }
MyClassWithTransform.fields

// ---------------------------------------------
// Class.transformFrom
// ---------------------------------------------

export class MyClassWithTransformFrom extends MyClass.transformOrFailFrom<MyClassWithTransformFrom>()(
  {
    b: bContext
  },
  (i) => Tag1.pipe(Effect.flatMap((a) => ParseResult.succeed(i.a === a ? { ...i, b: 1 } : { ...i, b: 2 }))),
  (a) => Tag2.pipe(Effect.flatMap((b) => ParseResult.succeed(a.b === b ? { a: "a1" } : { a: "a2" })))
) {}

// $ExpectType "aContext" | "bContext" | "Tag1" | "Tag2"
hole<Schema.Schema.Context<typeof MyClassWithTransformFrom>>()

// $ExpectType { readonly a: Schema<string, string, "aContext">; readonly b: Schema<number, number, "bContext">; }
MyClassWithTransformFrom.fields

// ---------------------------------------------
// TaggedRequest
// ---------------------------------------------

class MyRequest extends Schema.TaggedRequest<MyRequest>()("MyRequest", bContext, cContext, {
  a: aContext
}) {}

// $ExpectType "aContext"
hole<Schema.Schema.Context<typeof MyRequest>>()

// $ExpectType { readonly _tag: literal<["MyRequest"]>; readonly a: Schema<string, string, "aContext">; }
MyRequest.fields

declare const myRequest: MyRequest

// $ExpectType Schema<Exit<string, number>, ExitFrom<string, number>, "bContext" | "cContext">
Serializable.exitSchema(myRequest)
