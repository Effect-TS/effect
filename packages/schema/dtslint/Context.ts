import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import { Context, Effect, Option } from "effect"
import { hole } from "effect/Function"

interface aContext extends S.Schema<string, string, "aContext"> {}
interface bContext extends S.Schema<number, number, "bContext"> {}
interface cContext extends S.Schema<boolean, boolean, "cContext"> {}

declare const aContext: aContext
declare const bContext: bContext
declare const cContext: cContext

const Taga = Context.GenericTag<"Taga", string>("Taga")
const Tagb = Context.GenericTag<"Tagb", number>("Tagb")
const Tag1 = Context.GenericTag<"Tag1", string>("Tag1")
const Tag2 = Context.GenericTag<"Tag2", number>("Tag2")

// ---------------------------------------------
// declare
// ---------------------------------------------

// $ExpectType Schema<string, string, never>
S.declare((u): u is string => typeof u === "string")

// $ExpectType Schema<string, number, "aContext" | "bContext">
S.declare(
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

S.declare(
  [aContext, bContext],
  // @ts-expect-error
  (_a, _b) => () => Taga.pipe(Effect.flatMap(ParseResult.succeed)),
  (_a, _b) => () => ParseResult.succeed(1)
)

S.declare(
  [aContext, bContext],
  (_a, _b) => () => ParseResult.succeed("a"),
  // @ts-expect-error
  (_a, _b) => () => Tagb.pipe(Effect.flatMap(ParseResult.succeed))
)

S.declare(
  [aContext, bContext],
  // @ts-expect-error
  (_a, _b) => () => Taga.pipe(Effect.flatMap(ParseResult.succeed)),
  (_a, _b) => () => Tagb.pipe(Effect.flatMap(ParseResult.succeed))
)

S.declare(
  [],
  // @ts-expect-error
  () => () => Tag1.pipe(Effect.flatMap(ParseResult.succeed)),
  () => () => ParseResult.succeed(1)
)

S.declare(
  [aContext, bContext],
  // @ts-expect-error
  (_a, _b) => () => Tag1.pipe(Effect.flatMap(ParseResult.succeed)),
  (_a, _b) => () => ParseResult.succeed(1)
)

S.declare(
  [aContext, bContext],
  (_a, _b) => () => ParseResult.succeed("a"),
  // @ts-expect-error
  (_a, _b) => () => Tag2.pipe(Effect.flatMap(ParseResult.succeed))
)

// ---------------------------------------------
// union
// ---------------------------------------------

// $ExpectType Schema<string | number, string | number, "aContext" | "bContext">
S.asSchema(S.union(aContext, bContext))

// $ExpectType union<[aContext, bContext]>
S.union(aContext, bContext)

// ---------------------------------------------
// tuple
// ---------------------------------------------

// $ExpectType Schema<readonly [string, number], readonly [string, number], "aContext" | "bContext">
S.asSchema(S.tuple(aContext, bContext))

// $ExpectType tuple<[aContext, bContext]>
S.tuple(aContext, bContext)

// ---------------------------------------------
// tupleType
// ---------------------------------------------

// $ExpectType Schema<readonly [string, ...number[]], readonly [string, ...number[]], "aContext" | "bContext">
S.asSchema(S.tuple([aContext], bContext))

// $ExpectType tupleType<readonly [aContext], [bContext]>
S.tuple([aContext], bContext)

// ---------------------------------------------
// optionalElement
// ---------------------------------------------

// $ExpectType Schema<readonly [string, number?], readonly [string, number?], "aContext" | "bContext">
S.asSchema(S.tuple(aContext, S.optionalElement(bContext)))

// $ExpectType tuple<[aContext, OptionalElement<bContext>]>
S.tuple(aContext, S.optionalElement(bContext))

// ---------------------------------------------
// array
// ---------------------------------------------

// $ExpectType Schema<readonly string[], readonly string[], "aContext">
S.asSchema(S.array(aContext))

// $ExpectType array<aContext>
S.array(aContext)

// ---------------------------------------------
// nonEmptyArray
// ---------------------------------------------

// $ExpectType Schema<readonly [string, ...string[]], readonly [string, ...string[]], "aContext">
S.asSchema(S.nonEmptyArray(aContext))

// $ExpectType nonEmptyArray<aContext>
S.nonEmptyArray(aContext)

// ---------------------------------------------
// propertySignatureDeclaration
// ---------------------------------------------

// $ExpectType PropertySignature<":", string, never, ":", string, false, "aContext">
S.propertySignature(aContext)

// ---------------------------------------------
// optionalToRequired
// ---------------------------------------------

// $ExpectType PropertySignature<":", string, never, "?:", string, false, "aContext">
S.optionalToRequired(aContext, S.string, Option.getOrElse(() => ""), Option.some)

// ---------------------------------------------
// optional
// ---------------------------------------------

// $ExpectType PropertySignature<"?:", string | undefined, never, "?:", string | undefined, false, "aContext">
S.optional(aContext)

// ---------------------------------------------
// struct
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, "aContext" | "bContext">
S.asSchema(S.struct({ a: aContext, b: bContext }))

// $ExpectType struct<{ a: aContext; b: bContext; }>
S.struct({ a: aContext, b: bContext })

// ---------------------------------------------
// pick
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; }, { readonly a: string; }, "aContext" | "bContext">
S.struct({ a: aContext, b: bContext }).pipe(S.pick("a"))

// ---------------------------------------------
// omit
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; }, { readonly a: string; }, "aContext" | "bContext">
S.struct({ a: aContext, b: bContext }).pipe(S.omit("b"))

// ---------------------------------------------
// brand
// ---------------------------------------------

// @ts-expect-error
aContext.pipe(S.brand("a"))

// ---------------------------------------------
// partial
// ---------------------------------------------

// $ExpectType Schema<{ readonly a?: string; readonly b?: number; }, { readonly a?: string; readonly b?: number; }, "aContext" | "bContext">
S.partial(S.struct({ a: aContext, b: bContext }), { exact: true })

// ---------------------------------------------
// required
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, "aContext" | "bContext">
S.required(S.partial(S.struct({ a: aContext, b: bContext }), { exact: true }))

// ---------------------------------------------
// mutable
// ---------------------------------------------

// $ExpectType Schema<{ a: string; b: number; }, { a: string; b: number; }, "aContext" | "bContext">
S.asSchema(S.mutable(S.struct({ a: aContext, b: bContext })))

// $ExpectType mutable<struct<{ a: aContext; b: bContext; }>>
S.mutable(S.struct({ a: aContext, b: bContext }))

// ---------------------------------------------
// record
// ---------------------------------------------

// $ExpectType Schema<{ readonly [x: string]: number; }, { readonly [x: string]: number; }, "aContext" | "bContext">
S.asSchema(S.record(aContext, bContext))

// $ExpectType record<aContext, bContext>
S.record(aContext, bContext)

// ---------------------------------------------
// extend
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; readonly c: boolean; }, { readonly a: string; readonly b: number; readonly c: boolean; }, "aContext" | "bContext" | "cContext">
S.asSchema(S.struct({ a: aContext, b: bContext }).pipe(S.extend(S.struct({ c: cContext }))))

// $ExpectType extend<struct<{ a: aContext; b: bContext; }>, struct<{ c: cContext; }>>
S.struct({ a: aContext, b: bContext }).pipe(S.extend(S.struct({ c: cContext })))

// ---------------------------------------------
// compose
// ---------------------------------------------

// $ExpectType Schema<number, string, "aContext" | "bContext">
aContext.pipe(S.compose(bContext, { strict: false }))

// ---------------------------------------------
// suspend
// ---------------------------------------------

// $ExpectType suspend<string, string, "aContext">
S.suspend(() => aContext)

// ---------------------------------------------
// filter
// ---------------------------------------------

// $ExpectType Schema<string, string, "aContext">
aContext.pipe(S.filter(() => false))

// ---------------------------------------------
// transformOrFail
// ---------------------------------------------

// $ExpectType Schema<number, string, "aContext" | "bContext">
S.asSchema(S.transformOrFail(aContext, bContext, () => ParseResult.succeed(1), () => ParseResult.succeed("")))

// $ExpectType transformOrFail<aContext, bContext, never>
S.transformOrFail(aContext, bContext, () => ParseResult.succeed(1), () => ParseResult.succeed(""))

// ---------------------------------------------
// transform
// ---------------------------------------------

// $ExpectType Schema<number, string, "aContext" | "bContext">
S.asSchema(S.transform(aContext, bContext, () => 1, () => ""))

// $ExpectType transform<aContext, bContext>
S.transform(aContext, bContext, () => 1, () => "")

// ---------------------------------------------
// attachPropertySignature
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly _tag: "A"; }, { readonly a: string; }, "aContext">
S.struct({ a: aContext }).pipe(S.attachPropertySignature("_tag", "A"))

// ---------------------------------------------
// annotations (method)
// ---------------------------------------------

// $ExpectType Schema<string, string, "aContext">
aContext.annotations({})

// ---------------------------------------------
// message
// ---------------------------------------------

// $ExpectType Schema<string, string, "aContext">
aContext.pipe(S.message(() => ""))

// ---------------------------------------------
// identifier
// ---------------------------------------------

// $ExpectType Schema<string, string, "aContext">
aContext.pipe(S.identifier(""))

// ---------------------------------------------
// title
// ---------------------------------------------

// $ExpectType Schema<string, string, "aContext">
aContext.pipe(S.title(""))

// ---------------------------------------------
// description
// ---------------------------------------------

// $ExpectType Schema<string, string, "aContext">
aContext.pipe(S.description(""))

// ---------------------------------------------
// examples
// ---------------------------------------------

// $ExpectType Schema<string, string, "aContext">
aContext.pipe(S.examples(["a"]))

// ---------------------------------------------
// documentation
// ---------------------------------------------

// $ExpectType Schema<string, string, "aContext">
aContext.pipe(S.documentation(""))

// ---------------------------------------------
// jsonSchema
// ---------------------------------------------

// $ExpectType Schema<string, string, "aContext">
aContext.pipe(S.jsonSchema({}))

// ---------------------------------------------
// equivalence
// ---------------------------------------------

// $ExpectType Schema<string, string, "aContext">
aContext.pipe(S.equivalence(() => true))

// ---------------------------------------------
// rename
// ---------------------------------------------

// $ExpectType Schema<{ readonly c: string; readonly d: number; }, { readonly a: string; readonly b: number; }, "aContext" | "bContext">
S.rename(S.struct({ a: aContext, b: bContext }), { a: "c", b: "d" })

// ---------------------------------------------
// Class
// ---------------------------------------------

export class MyClass extends S.Class<MyClass>("MyClass")({
  a: aContext
}) {}

// $ExpectType "aContext"
hole<S.Schema.Context<typeof MyClass>>()

// ---------------------------------------------
// Class.transform
// ---------------------------------------------

export class MyClassWithTransform extends MyClass.transformOrFail<MyClassWithTransform>("MyClassWithTransform")(
  {
    b: bContext
  },
  (i) => Tag1.pipe(Effect.flatMap((a) => ParseResult.succeed(i.a === a ? { ...i, b: 1 } : { ...i, b: 2 }))),
  (a) => Tag2.pipe(Effect.flatMap((b) => ParseResult.succeed(a.b === b ? { a: "a1" } : { a: "a2" })))
) {}

// $ExpectType "aContext" | "bContext" | "Tag1" | "Tag2"
hole<S.Schema.Context<typeof MyClassWithTransform>>()

// $ExpectType { readonly a: aContext; readonly b: bContext; }
MyClassWithTransform.fields

// ---------------------------------------------
// Class.transformFrom
// ---------------------------------------------

export class MyClassWithTransformFrom
  extends MyClass.transformOrFailFrom<MyClassWithTransformFrom>("MyClassWithTransformFrom")(
    {
      b: bContext
    },
    (i) => Tag1.pipe(Effect.flatMap((a) => ParseResult.succeed(i.a === a ? { ...i, b: 1 } : { ...i, b: 2 }))),
    (a) => Tag2.pipe(Effect.flatMap((b) => ParseResult.succeed(a.b === b ? { a: "a1" } : { a: "a2" })))
  )
{}

// $ExpectType "aContext" | "bContext" | "Tag1" | "Tag2"
hole<S.Schema.Context<typeof MyClassWithTransformFrom>>()

// $ExpectType { readonly a: aContext; readonly b: bContext; }
MyClassWithTransformFrom.fields

// ---------------------------------------------
// TaggedRequest
// ---------------------------------------------

class MyRequest extends S.TaggedRequest<MyRequest>()("MyRequest", bContext, cContext, {
  a: aContext
}) {}

// $ExpectType "aContext"
hole<S.Schema.Context<typeof MyRequest>>()

// $ExpectType { readonly _tag: literal<["MyRequest"]>; readonly a: aContext; }
MyRequest.fields

declare const myRequest: MyRequest

// $ExpectType Schema<Exit<boolean, number>, ExitEncoded<boolean, number>, "bContext" | "cContext">
Serializable.exitSchema(myRequest)
