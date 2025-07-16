import type { Exit } from "effect"
import { Context, Effect, Option } from "effect"
import { hole } from "effect/Function"
import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import { describe, expect, it } from "tstyche"

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

declare const myRequest: MyRequest

describe("Schema Context", () => {
  it("declare: simple predicate", () => {
    const schema = S.declare((u): u is string => typeof u === "string")
    expect(S.asSchema(schema)).type.toBe<S.Schema<string>>()
    expect(schema).type.toBe<S.declare<string>>()
  })

  it("declare: with contexts and options", () => {
    const schema = S.declare(
      [aContext, bContext],
      {
        decode: (_a, _b) => () => ParseResult.succeed("a"),
        encode: (_a, _b) => () => ParseResult.succeed(1)
      },
      {
        arbitrary: (_a, _b) => (fc) => fc.string(),
        pretty: (_a, _b) => (s) => s,
        equivalence: () => (_a, _b) => true
      }
    )
    expect(S.asSchema(schema)).type.toBe<S.Schema<string, number, "aContext" | "bContext">>()
    expect(schema).type.toBe<S.declare<string, number, readonly [aContext, bContext]>>()
  })

  it("declare errors", () => {
    expect(S.declare).type.not.toBeCallableWith(
      [aContext, bContext],
      {
        decode: (_a: S.Schema<string, string>, _b: S.Schema<number, number>) => () =>
          Taga.pipe(Effect.flatMap(ParseResult.succeed)),
        encode: (_a: S.Schema<string, string>, _b: S.Schema<number, number>) => () => ParseResult.succeed(1)
      }
    )

    expect(S.declare).type.not.toBeCallableWith(
      [aContext, bContext],
      {
        decode: (_a: S.Schema<string, string>, _b: S.Schema<number, number>) => () => ParseResult.succeed("a"),
        encode: (_a: S.Schema<string, string>, _b: S.Schema<number, number>) => () =>
          Tagb.pipe(Effect.flatMap(ParseResult.succeed))
      }
    )

    expect(S.declare).type.not.toBeCallableWith(
      [aContext, bContext],
      {
        decode: (_a: S.Schema<string, string>, _b: S.Schema<number, number>) => () =>
          Taga.pipe(Effect.flatMap(ParseResult.succeed)),
        encode: (_a: S.Schema<string, string>, _b: S.Schema<number, number>) => () =>
          Tagb.pipe(Effect.flatMap(ParseResult.succeed))
      }
    )

    expect(S.declare).type.not.toBeCallableWith(
      [],
      {
        decode: () => () => Tag1.pipe(Effect.flatMap(ParseResult.succeed)),
        encode: () => () => ParseResult.succeed(1)
      }
    )

    expect(S.declare).type.not.toBeCallableWith(
      [aContext, bContext],
      {
        decode: (_a: S.Schema<string, string>, _b: S.Schema<number, number>) => () =>
          Tag1.pipe(Effect.flatMap(ParseResult.succeed)),
        encode: (_a: S.Schema<string, string>, _b: S.Schema<number, number>) => () => ParseResult.succeed(1)
      }
    )

    expect(S.declare).type.not.toBeCallableWith(
      [aContext, bContext],
      {
        decode: (_a: S.Schema<string, string>, _b: S.Schema<number, number>) => () => ParseResult.succeed("a"),
        encode: (_a: S.Schema<string, string>, _b: S.Schema<number, number>) => () =>
          Tag2.pipe(Effect.flatMap(ParseResult.succeed))
      }
    )
  })

  it("Union", () => {
    expect(S.asSchema(S.Union(aContext, bContext)))
      .type.toBe<S.Schema<string | number, string | number, "aContext" | "bContext">>()
    expect(S.Union(aContext, bContext))
      .type.toBe<S.Union<[aContext, bContext]>>()
  })

  it("Tuple2", () => {
    const schema = S.Tuple(aContext, bContext)
    expect(S.asSchema(schema))
      .type.toBe<S.Schema<readonly [string, number], readonly [string, number], "aContext" | "bContext">>()
    expect(schema).type.toBe<S.Tuple2<aContext, bContext>>()
  })

  it("TupleType", () => {
    expect(S.asSchema(S.Tuple([aContext], bContext)))
      .type.toBe<
      S.Schema<readonly [string, ...Array<number>], readonly [string, ...Array<number>], "aContext" | "bContext">
    >()
    expect(S.Tuple([aContext], bContext))
      .type.toBe<S.TupleType<readonly [aContext], [bContext]>>()
  })

  it("OptionalElement", () => {
    expect(S.asSchema(S.Tuple(aContext, S.optionalElement(bContext))))
      .type.toBe<S.Schema<readonly [string, number?], readonly [string, number?], "aContext" | "bContext">>()
    expect(S.Tuple(aContext, S.optionalElement(bContext)))
      .type.toBe<S.Tuple<[aContext, S.Element<bContext, "?">]>>()
  })

  it("Array", () => {
    expect(S.asSchema(S.Array(aContext)))
      .type.toBe<S.Schema<ReadonlyArray<string>, ReadonlyArray<string>, "aContext">>()
    expect(S.Array(aContext))
      .type.toBe<S.Array$<aContext>>()
  })

  it("NonEmptyArray", () => {
    expect(S.asSchema(S.NonEmptyArray(aContext)))
      .type.toBe<S.Schema<readonly [string, ...Array<string>], readonly [string, ...Array<string>], "aContext">>()
    expect(S.NonEmptyArray(aContext))
      .type.toBe<S.NonEmptyArray<aContext>>()
  })

  it("propertySignatureDeclaration", () => {
    expect(S.propertySignature(aContext))
      .type.toBe<S.propertySignature<aContext>>()
    expect(S.propertySignature(aContext).annotations({}))
      .type.toBe<S.propertySignature<aContext>>()
  })

  it("optionalToOptional", () => {
    expect(S.optionalToOptional(aContext, S.String, { decode: (o) => o, encode: (o) => o }))
      .type.toBe<S.PropertySignature<"?:", string, never, "?:", string, false, "aContext">>()
  })

  it("optionalToRequired", () => {
    expect(
      S.optionalToRequired(aContext, S.String, { decode: Option.getOrElse(() => ""), encode: Option.some })
    ).type.toBe<S.PropertySignature<":", string, never, "?:", string, false, "aContext">>()
  })

  it("requiredToOptional", () => {
    expect(
      S.requiredToOptional(aContext, S.String, { decode: Option.some, encode: Option.getOrElse(() => "") })
    ).type.toBe<S.PropertySignature<"?:", string, never, ":", string, false, "aContext">>()
  })

  it("optional", () => {
    expect(S.optional(aContext))
      .type.toBe<S.optional<aContext>>()
  })

  it("Struct", () => {
    expect(S.asSchema(S.Struct({ a: aContext, b: bContext })))
      .type.toBe<
      S.Schema<
        { readonly a: string; readonly b: number },
        { readonly a: string; readonly b: number },
        "aContext" | "bContext"
      >
    >()
    expect(S.Struct({ a: aContext, b: bContext }))
      .type.toBe<S.Struct<{ a: aContext; b: bContext }>>()
  })

  it("pick", () => {
    expect(S.Struct({ a: aContext, b: bContext }).pipe(S.pick("a")))
      .type.toBe<S.SchemaClass<{ readonly a: string }, { readonly a: string }, "aContext" | "bContext">>()
  })

  it("omit", () => {
    expect(S.Struct({ a: aContext, b: bContext }).pipe(S.omit("b")))
      .type.toBe<S.SchemaClass<{ readonly a: string }, { readonly a: string }, "aContext" | "bContext">>()
  })

  it("partialWith", () => {
    expect(S.partialWith(S.Struct({ a: aContext, b: bContext }), { exact: true }))
      .type.toBe<
      S.SchemaClass<
        { readonly a?: string; readonly b?: number },
        { readonly a?: string; readonly b?: number },
        "aContext" | "bContext"
      >
    >()
  })

  it("required", () => {
    expect(S.required(S.partialWith(S.Struct({ a: aContext, b: bContext }), { exact: true })))
      .type.toBe<
      S.SchemaClass<
        { readonly a: string; readonly b: number },
        { readonly a: string; readonly b: number },
        "aContext" | "bContext"
      >
    >()
  })

  it("mutable", () => {
    expect(S.asSchema(S.mutable(S.Struct({ a: aContext, b: bContext }))))
      .type.toBe<S.Schema<{ a: string; b: number }, { a: string; b: number }, "aContext" | "bContext">>()
    expect(S.mutable(S.Struct({ a: aContext, b: bContext })))
      .type.toBe<S.mutable<S.Struct<{ a: aContext; b: bContext }>>>()
  })

  it("Record", () => {
    expect(S.asSchema(S.Record({ key: aContext, value: bContext })))
      .type.toBe<
      S.Schema<{ readonly [x: string]: number }, { readonly [x: string]: number }, "aContext" | "bContext">
    >()
    expect(S.Record({ key: aContext, value: bContext }))
      .type.toBe<S.Record$<aContext, bContext>>()
  })

  it("extend", () => {
    expect(
      S.asSchema(S.Struct({ a: aContext, b: bContext }).pipe(S.extend(S.Struct({ c: cContext }))))
    )
      .type.toBe<
      S.Schema<
        { readonly a: string; readonly b: number } & { readonly c: boolean },
        { readonly a: string; readonly b: number } & { readonly c: boolean },
        "aContext" | "bContext" | "cContext"
      >
    >()
    expect(S.Struct({ a: aContext, b: bContext }).pipe(S.extend(S.Struct({ c: cContext }))))
      .type.toBe<S.extend<S.Struct<{ a: aContext; b: bContext }>, S.Struct<{ c: cContext }>>>()
  })

  it("compose", () => {
    expect(S.asSchema(aContext.pipe(S.compose(bContext, { strict: false }))))
      .type.toBe<S.Schema<number, string, "aContext" | "bContext">>()
  })

  it("suspend", () => {
    expect(S.suspend(() => aContext))
      .type.toBe<S.suspend<string, string, "aContext">>()
  })

  it("filter", () => {
    expect(aContext.pipe(S.filter(() => false)))
      .type.toBe<S.filter<aContext>>()
  })

  it("transformOrFail", () => {
    expect(
      S.asSchema(
        S.transformOrFail(aContext, bContext, {
          decode: () => ParseResult.succeed(1),
          encode: () => ParseResult.succeed("")
        })
      )
    )
      .type.toBe<S.Schema<number, string, "aContext" | "bContext">>()
    expect(
      S.transformOrFail(aContext, bContext, {
        decode: () => ParseResult.succeed(1),
        encode: () => ParseResult.succeed("")
      })
    )
      .type.toBe<S.transformOrFail<aContext, bContext, never>>()
  })

  it("transform", () => {
    expect(S.asSchema(S.transform(aContext, bContext, { decode: () => 1, encode: () => "" })))
      .type.toBe<S.Schema<number, string, "aContext" | "bContext">>()
    expect(S.transform(aContext, bContext, { decode: () => 1, encode: () => "" }))
      .type.toBe<S.transform<aContext, bContext>>()
  })

  it("attachPropertySignature", () => {
    expect(S.Struct({ a: aContext }).pipe(S.attachPropertySignature("_tag", "A")))
      .type.toBe<S.SchemaClass<{ readonly a: string } & { readonly _tag: "A" }, { readonly a: string }, "aContext">>()
    expect(S.attachPropertySignature(S.Struct({ a: aContext }), "_tag", "A"))
      .type.toBe<S.SchemaClass<{ readonly a: string } & { readonly _tag: "A" }, { readonly a: string }, "aContext">>()
  })

  it("annotations", () => {
    expect(aContext.annotations({}))
      .type.toBe<S.Schema<string, string, "aContext">>()
  })

  it("rename", () => {
    expect(S.rename(S.Struct({ a: aContext, b: bContext }), { a: "c", b: "d" }))
      .type.toBe<
      S.SchemaClass<
        { readonly c: string; readonly d: number },
        { readonly a: string; readonly b: number },
        "aContext" | "bContext"
      >
    >()
  })
})

class MyClass extends S.Class<MyClass>("MyClass")({
  a: aContext
}) {}

describe("Class", () => {
  it("Class", () => {
    expect<S.Schema.Context<typeof MyClass>>()
      .type.toBe<"aContext">()
  })

  it("Class.transform", () => {
    class MyClassWithTransform extends MyClass.transformOrFail<MyClassWithTransform>(
      "MyClassWithTransform"
    )(
      { b: bContext },
      {
        decode: (i) =>
          Tag1.pipe(
            Effect.flatMap((a) => ParseResult.succeed(i.a === a ? { ...i, b: 1 } : { ...i, b: 2 }))
          ),
        encode: (a) =>
          Tag2.pipe(
            Effect.flatMap((b) => ParseResult.succeed(a.b === b ? { a: "a1" } : { a: "a2" }))
          )
      }
    ) {}
    expect<S.Schema.Context<typeof MyClassWithTransform>>()
      .type.toBe<"aContext" | "bContext" | "Tag1" | "Tag2">()
    expect(MyClassWithTransform.fields)
      .type.toBe<{ readonly a: aContext; readonly b: bContext }>()
  })

  it("Class.transformFrom", () => {
    class MyClassWithTransformFrom extends MyClass.transformOrFailFrom<MyClassWithTransformFrom>(
      "MyClassWithTransformFrom"
    )(
      { b: bContext },
      {
        decode: (i) =>
          Tag1.pipe(
            Effect.flatMap((a) => ParseResult.succeed(i.a === a ? { ...i, b: 1 } : { ...i, b: 2 }))
          ),
        encode: (a) =>
          Tag2.pipe(
            Effect.flatMap((b) => ParseResult.succeed(a.b === b ? { a: "a1" } : { a: "a2" }))
          )
      }
    ) {}
    expect<S.Schema.Context<typeof MyClassWithTransformFrom>>()
      .type.toBe<"aContext" | "bContext" | "Tag1" | "Tag2">()
    expect(MyClassWithTransformFrom.fields)
      .type.toBe<{ readonly a: aContext; readonly b: bContext }>()
  })
})

class MyRequest extends S.TaggedRequest<MyRequest>()("MyRequest", {
  failure: bContext,
  success: cContext,
  payload: { a: aContext }
}) {}

describe("TaggedRequest", () => {
  it("TaggedRequest", () => {
    expect<S.Schema.Context<typeof MyRequest>>()
      .type.toBe<"aContext">()
    expect(MyRequest.fields)
      .type.toBe<{ readonly _tag: S.tag<"MyRequest">; readonly a: aContext }>()
  })

  it("exitSchema", () => {
    expect(S.exitSchema(myRequest))
      .type.toBe<
      S.Schema<Exit.Exit<boolean, number>, S.ExitEncoded<boolean, number, unknown>, "bContext" | "cContext">
    >()
  })
})

describe("TemplateLiteralParser", () => {
  it("TemplateLiteralParser", () => {
    expect(
      S.asSchema(
        S.TemplateLiteralParser(
          hole<S.Schema<string, string, "a">>(),
          "a",
          hole<S.Schema<string, string, "b">>()
        )
      )
    )
      .type.toBe<S.Schema<readonly [string, "a", string], `${string}a${string}`, "a" | "b">>()
  })
})
