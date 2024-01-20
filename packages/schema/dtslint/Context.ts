import * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import { Context, Effect, Option } from "effect"

declare const aContext: Schema.Schema<"a", string>
declare const bContext: Schema.Schema<"b", number>
declare const cContext: Schema.Schema<"c", string>

const Taga = Context.Tag<"a", string>()
const Tagb = Context.Tag<"b", number>()
const Tag1 = Context.Tag<"Tag1", string>()
const Tag2 = Context.Tag<"Tag2", number>()

// ---------------------------------------------
// declare
// ---------------------------------------------

// $ExpectType Schema<never, string, string>
Schema.declare((u): u is string => typeof u === "string")

// $ExpectType Schema<"a" | "b", number, string>
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

// $ExpectType Schema<"a" | "b", number, string>
Schema.declare(
  [aContext, bContext],
  (_a, _b) => () => Taga.pipe(Effect.flatMap(ParseResult.succeed)),
  (_a, _b) => () => ParseResult.succeed(1)
)

// $ExpectType Schema<"a" | "b", number, string>
Schema.declare(
  [aContext, bContext],
  (_a, _b) => () => ParseResult.succeed("a"),
  (_a, _b) => () => Tagb.pipe(Effect.flatMap(ParseResult.succeed))
)

// $ExpectType Schema<"a" | "b", number, string>
Schema.declare(
  [aContext, bContext],
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
  a: aContext
}) {}

// $ExpectType "a"
export type MyClassContext = Schema.Schema.Context<typeof MyClass>

// $ExpectType Schema<"a", { readonly a: string; }, { readonly a: string; }>
MyClass.struct

// $ExpectType [props: { readonly a: string; }, disableValidation: true]
export type MyClassParams = ConstructorParameters<typeof MyClass>

// ---------------------------------------------
// Class.transform
// ---------------------------------------------

export class MyClassWithTransform extends MyClass.transform<MyClassWithTransform>()(
  {
    b: bContext
  },
  (i) => Tag1.pipe(Effect.flatMap((a) => ParseResult.succeed(i.a === a ? { ...i, b: 1 } : { ...i, b: 2 }))),
  (a) => Tag2.pipe(Effect.flatMap((b) => ParseResult.succeed(a.b === b ? { a: "a1" } : { a: "a2" })))
) {}

// $ExpectType "a" | "b" | "Tag1" | "Tag2"
export type MyClassWithTransformContext = Schema.Schema.Context<typeof MyClassWithTransform>

// $ExpectType Schema<"a" | "b" | "Tag1" | "Tag2", { readonly a: string; }, { readonly a: string; readonly b: number; }>
MyClassWithTransform.struct

// $ExpectType [props: { readonly a: string; readonly b: number; }, disableValidation: true]
export type MyClassWithTransformParams = ConstructorParameters<typeof MyClassWithTransform>

// ---------------------------------------------
// Class.transformFrom
// ---------------------------------------------

export class MyClassWithTransformFrom extends MyClass.transformFrom<MyClassWithTransformFrom>()(
  {
    b: bContext
  },
  (i) => Tag1.pipe(Effect.flatMap((a) => ParseResult.succeed(i.a === a ? { ...i, b: 1 } : { ...i, b: 2 }))),
  (a) => Tag2.pipe(Effect.flatMap((b) => ParseResult.succeed(a.b === b ? { a: "a1" } : { a: "a2" })))
) {}

// $ExpectType "a" | "b" | "Tag1" | "Tag2"
export type MyClassWithTransformFromContext = Schema.Schema.Context<typeof MyClassWithTransformFrom>

// $ExpectType Schema<"a" | "b" | "Tag1" | "Tag2", { readonly a: string; }, { readonly a: string; readonly b: number; }>
MyClassWithTransformFrom.struct

// $ExpectType [props: { readonly a: string; readonly b: number; }, disableValidation: true]
export type MyClassWithTransformFromParams = ConstructorParameters<typeof MyClassWithTransformFrom>

// ---------------------------------------------
// TaggedRequest
// ---------------------------------------------

class MyRequest extends Schema.TaggedRequest<MyRequest>()("MyRequest", bContext, cContext, {
  a: aContext
}) {}

// $ExpectType "a"
export type MyRequestContext = Schema.Schema.Context<typeof MyRequest>

// $ExpectType Schema<"a", { readonly _tag: "MyRequest"; readonly a: string; }, { readonly _tag: "MyRequest"; readonly a: string; }>
MyRequest.struct

declare const myRequest: MyRequest

// $ExpectType Schema<"b" | "c", ExitFrom<number, string>, Exit<number, string>>
Serializable.exitSchema(myRequest)
