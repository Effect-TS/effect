import { Context, Effect, Option } from "effect"
import { hole } from "effect/Function"
import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"

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

// $ExpectType SchemaClass<string, string, never>
S.declare((u): u is string => typeof u === "string")

// $ExpectType SchemaClass<string, number, "aContext" | "bContext">
S.declare(
  [aContext, bContext],
  { decode: (_a, _b) => () => ParseResult.succeed("a"), encode: (_a, _b) => () => ParseResult.succeed(1) },
  {
    arbitrary: (
      _a, // $ExpectType LazyArbitrary<string>
      _b // $ExpectType LazyArbitrary<number>
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

// @ts-expect-error
S.declare(
  [aContext, bContext],
  {
    decode: (_a, _b) => () => Taga.pipe(Effect.flatMap(ParseResult.succeed)),
    encode: (_a, _b) => () => ParseResult.succeed(1)
  }
)

// @ts-expect-error
S.declare(
  [aContext, bContext],
  {
    decode: (_a, _b) => () => ParseResult.succeed("a"),
    encode: (_a, _b) => () => Tagb.pipe(Effect.flatMap(ParseResult.succeed))
  }
)

S.declare(
  // @ts-expect-error
  [aContext, bContext],
  {
    decode: (_a, _b) => () => Taga.pipe(Effect.flatMap(ParseResult.succeed)),
    encode: (_a, _b) => () => Tagb.pipe(Effect.flatMap(ParseResult.succeed))
  }
)

// @ts-expect-error
S.declare(
  [],
  { decode: () => () => Tag1.pipe(Effect.flatMap(ParseResult.succeed)), encode: () => () => ParseResult.succeed(1) }
)

// @ts-expect-error
S.declare(
  [aContext, bContext],
  {
    decode: (_a, _b) => () => Tag1.pipe(Effect.flatMap(ParseResult.succeed)),
    encode: (_a, _b) => () => ParseResult.succeed(1)
  }
)

// @ts-expect-error
S.declare(
  [aContext, bContext],
  {
    decode: (_a, _b) => () => ParseResult.succeed("a"),
    encode: (_a, _b) => () => Tag2.pipe(Effect.flatMap(ParseResult.succeed))
  }
)

// ---------------------------------------------
// Union
// ---------------------------------------------

// $ExpectType Schema<string | number, string | number, "aContext" | "bContext">
S.asSchema(S.Union(aContext, bContext))

// $ExpectType Union<[aContext, bContext]>
S.Union(aContext, bContext)

// ---------------------------------------------
// Tuple
// ---------------------------------------------

// $ExpectType Schema<readonly [string, number], readonly [string, number], "aContext" | "bContext">
S.asSchema(S.Tuple(aContext, bContext))

// $ExpectType Tuple<[aContext, bContext]>
S.Tuple(aContext, bContext)

// ---------------------------------------------
// TupleType
// ---------------------------------------------

// $ExpectType Schema<readonly [string, ...number[]], readonly [string, ...number[]], "aContext" | "bContext">
S.asSchema(S.Tuple([aContext], bContext))

// $ExpectType TupleType<readonly [aContext], [bContext]>
S.Tuple([aContext], bContext)

// ---------------------------------------------
// OptionalElement
// ---------------------------------------------

// $ExpectType Schema<readonly [string, number?], readonly [string, number?], "aContext" | "bContext">
S.asSchema(S.Tuple(aContext, S.optionalElement(bContext)))

// $ExpectType Tuple<[aContext, Element<bContext, "?">]>
S.Tuple(aContext, S.optionalElement(bContext))

// ---------------------------------------------
// Array
// ---------------------------------------------

// $ExpectType Schema<readonly string[], readonly string[], "aContext">
S.asSchema(S.Array(aContext))

// $ExpectType Array$<aContext>
S.Array(aContext)

// ---------------------------------------------
// NonEmptyArray
// ---------------------------------------------

// $ExpectType Schema<readonly [string, ...string[]], readonly [string, ...string[]], "aContext">
S.asSchema(S.NonEmptyArray(aContext))

// $ExpectType NonEmptyArray<aContext>
S.NonEmptyArray(aContext)

// ---------------------------------------------
// propertySignatureDeclaration
// ---------------------------------------------

// $ExpectType propertySignature<aContext>
S.propertySignature(aContext)

// $ExpectType propertySignature<aContext>
S.propertySignature(aContext).annotations({})

// ---------------------------------------------
// optionalToOptional
// ---------------------------------------------

// $ExpectType PropertySignature<"?:", string, never, "?:", string, false, "aContext">
S.optionalToOptional(aContext, S.String, { decode: (o) => o, encode: (o) => o })

// ---------------------------------------------
// optionalToRequired
// ---------------------------------------------

// $ExpectType PropertySignature<":", string, never, "?:", string, false, "aContext">
S.optionalToRequired(aContext, S.String, { decode: Option.getOrElse(() => ""), encode: Option.some })

// ---------------------------------------------
// requiredToOptional
// ---------------------------------------------

// $ExpectType PropertySignature<"?:", string, never, ":", string, false, "aContext">
S.requiredToOptional(aContext, S.String, { decode: Option.some, encode: Option.getOrElse(() => "") })

// ---------------------------------------------
// optional
// ---------------------------------------------

// $ExpectType optional<aContext>
S.optional(aContext)

// ---------------------------------------------
// Struct
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, "aContext" | "bContext">
S.asSchema(S.Struct({ a: aContext, b: bContext }))

// $ExpectType Struct<{ a: aContext; b: bContext; }>
S.Struct({ a: aContext, b: bContext })

// ---------------------------------------------
// pick
// ---------------------------------------------

// $ExpectType SchemaClass<{ readonly a: string; }, { readonly a: string; }, "aContext" | "bContext">
S.Struct({ a: aContext, b: bContext }).pipe(S.pick("a"))

// ---------------------------------------------
// omit
// ---------------------------------------------

// $ExpectType SchemaClass<{ readonly a: string; }, { readonly a: string; }, "aContext" | "bContext">
S.Struct({ a: aContext, b: bContext }).pipe(S.omit("b"))

// ---------------------------------------------
// brand
// ---------------------------------------------

// @ts-expect-error
aContext.pipe(S.brand("a"))

// ---------------------------------------------
// partialWith
// ---------------------------------------------

// $ExpectType SchemaClass<{ readonly a?: string; readonly b?: number; }, { readonly a?: string; readonly b?: number; }, "aContext" | "bContext">
S.partialWith(S.Struct({ a: aContext, b: bContext }), { exact: true })

// ---------------------------------------------
// required
// ---------------------------------------------

// $ExpectType SchemaClass<{ readonly a: string; readonly b: number; }, { readonly a: string; readonly b: number; }, "aContext" | "bContext">
S.required(S.partialWith(S.Struct({ a: aContext, b: bContext }), { exact: true }))

// ---------------------------------------------
// mutable
// ---------------------------------------------

// $ExpectType Schema<{ a: string; b: number; }, { a: string; b: number; }, "aContext" | "bContext">
S.asSchema(S.mutable(S.Struct({ a: aContext, b: bContext })))

// $ExpectType mutable<Struct<{ a: aContext; b: bContext; }>>
S.mutable(S.Struct({ a: aContext, b: bContext }))

// ---------------------------------------------
// Record
// ---------------------------------------------

// $ExpectType Schema<{ readonly [x: string]: number; }, { readonly [x: string]: number; }, "aContext" | "bContext">
S.asSchema(S.Record({ key: aContext, value: bContext }))

// $ExpectType Record$<aContext, bContext>
S.Record({ key: aContext, value: bContext })

// ---------------------------------------------
// extend
// ---------------------------------------------

// $ExpectType Schema<{ readonly a: string; readonly b: number; } & { readonly c: boolean; }, { readonly a: string; readonly b: number; } & { readonly c: boolean; }, "aContext" | "bContext" | "cContext">
S.asSchema(S.Struct({ a: aContext, b: bContext }).pipe(S.extend(S.Struct({ c: cContext }))))

// $ExpectType extend<Struct<{ a: aContext; b: bContext; }>, Struct<{ c: cContext; }>>
S.Struct({ a: aContext, b: bContext }).pipe(S.extend(S.Struct({ c: cContext })))

// ---------------------------------------------
// compose
// ---------------------------------------------

// $ExpectType SchemaClass<number, string, "aContext" | "bContext">
aContext.pipe(S.compose(bContext, { strict: false }))

// ---------------------------------------------
// suspend
// ---------------------------------------------

// $ExpectType suspend<string, string, "aContext">
S.suspend(() => aContext)

// ---------------------------------------------
// filter
// ---------------------------------------------

// $ExpectType filter<aContext>
aContext.pipe(S.filter(() => false))

// ---------------------------------------------
// transformOrFail
// ---------------------------------------------

// $ExpectType Schema<number, string, "aContext" | "bContext">
S.asSchema(
  S.transformOrFail(aContext, bContext, { decode: () => ParseResult.succeed(1), encode: () => ParseResult.succeed("") })
)

// $ExpectType transformOrFail<aContext, bContext, never>
S.transformOrFail(aContext, bContext, { decode: () => ParseResult.succeed(1), encode: () => ParseResult.succeed("") })

// ---------------------------------------------
// transform
// ---------------------------------------------

// $ExpectType Schema<number, string, "aContext" | "bContext">
S.asSchema(S.transform(aContext, bContext, { decode: () => 1, encode: () => "" }))

// $ExpectType transform<aContext, bContext>
S.transform(aContext, bContext, { decode: () => 1, encode: () => "" })

// ---------------------------------------------
// attachPropertySignature
// ---------------------------------------------

// $ExpectType SchemaClass<{ readonly a: string; readonly _tag: "A"; }, { readonly a: string; }, "aContext">
S.Struct({ a: aContext }).pipe(S.attachPropertySignature("_tag", "A"))

// $ExpectType SchemaClass<{ readonly a: string; readonly _tag: "A"; }, { readonly a: string; }, "aContext">
S.attachPropertySignature(S.Struct({ a: aContext }), "_tag", "A")

// ---------------------------------------------
// annotations (method)
// ---------------------------------------------

// $ExpectType Schema<string, string, "aContext">
aContext.annotations({})

// ---------------------------------------------
// rename
// ---------------------------------------------

// $ExpectType SchemaClass<{ readonly c: string; readonly d: number; }, { readonly a: string; readonly b: number; }, "aContext" | "bContext">
S.rename(S.Struct({ a: aContext, b: bContext }), { a: "c", b: "d" })

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
  {
    decode: (i) => Tag1.pipe(Effect.flatMap((a) => ParseResult.succeed(i.a === a ? { ...i, b: 1 } : { ...i, b: 2 }))),
    encode: (a) => Tag2.pipe(Effect.flatMap((b) => ParseResult.succeed(a.b === b ? { a: "a1" } : { a: "a2" })))
  }
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
    {
      decode: (i) => Tag1.pipe(Effect.flatMap((a) => ParseResult.succeed(i.a === a ? { ...i, b: 1 } : { ...i, b: 2 }))),
      encode: (a) => Tag2.pipe(Effect.flatMap((b) => ParseResult.succeed(a.b === b ? { a: "a1" } : { a: "a2" })))
    }
  )
{}

// $ExpectType "aContext" | "bContext" | "Tag1" | "Tag2"
hole<S.Schema.Context<typeof MyClassWithTransformFrom>>()

// $ExpectType { readonly a: aContext; readonly b: bContext; }
MyClassWithTransformFrom.fields

// ---------------------------------------------
// TaggedRequest
// ---------------------------------------------

class MyRequest extends S.TaggedRequest<MyRequest>()("MyRequest", {
  failure: bContext,
  success: cContext,
  payload: {
    a: aContext
  }
}) {}

// $ExpectType "aContext"
hole<S.Schema.Context<typeof MyRequest>>()

// $ExpectType { readonly _tag: tag<"MyRequest">; readonly a: aContext; }
MyRequest.fields

declare const myRequest: MyRequest

// $ExpectType Schema<Exit<boolean, number>, ExitEncoded<boolean, number, unknown>, "bContext" | "cContext">
S.exitSchema(myRequest)

// ---------------------------------------------
// TemplateLiteralParser
// ---------------------------------------------

// $ExpectType Schema<readonly [string, "a", string], `${string}a${string}`, "a" | "b">
S.asSchema(S.TemplateLiteralParser(hole<S.Schema<string, string, "a">>(), "a", hole<S.Schema<string, string, "b">>()))
