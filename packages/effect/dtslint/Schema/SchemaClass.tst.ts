import type { SchemaAST as AST } from "effect"
import { Schema as S } from "effect"
import { describe, expect, it } from "tstyche"

type HasFields<Fields extends S.Struct.Fields> = S.Struct<Fields> | {
  readonly [S.RefineSchemaId]: HasFields<Fields>
}

declare const checkForConflicts: <Fields extends S.Struct.Fields>(
  fieldsOr: Fields | HasFields<Fields>
) => S.Struct<Fields>

declare const aContext: S.Schema<string, string, "a">
declare const bContext: S.Schema<number, number, "b">
declare const cContext: S.Schema<boolean, boolean, "c">

class WithContext extends S.Class<WithContext>("WithContext")({ a: aContext, b: bContext }) {}

describe("Schema.Class", () => {
  it("should check conflicts with fields/from keys", () => {
    expect(checkForConflicts({ fields: S.String })).type.toBe<
      S.Struct<{ fields: typeof S.String }>
    >()
    expect(checkForConflicts({ from: S.String })).type.toBe<
      S.Struct<{ from: typeof S.String }>
    >()
    expect(checkForConflicts(S.Struct({ fields: S.String }))).type.toBe<
      S.Struct<{ fields: typeof S.String }>
    >()
    expect(checkForConflicts(S.Struct({ from: S.String }))).type.toBe<
      S.Struct<{ from: typeof S.String }>
    >()
    expect(checkForConflicts(S.Struct({ fields: S.String }).pipe(S.filter(() => true)))).type.toBe<
      S.Struct<{ fields: typeof S.String }>
    >()
    expect(checkForConflicts(S.Struct({ from: S.String }).pipe(S.filter(() => true)))).type.toBe<
      S.Struct<{ from: typeof S.String }>
    >()
    expect(
      checkForConflicts(S.Struct({ fields: S.String }).pipe(S.filter(() => true), S.filter(() => true)))
    ).type.toBe<S.Struct<{ fields: typeof S.String }>>()
    expect(
      checkForConflicts(S.Struct({ from: S.String }).pipe(S.filter(() => true), S.filter(() => true)))
    ).type.toBe<S.Struct<{ from: typeof S.String }>>()
    expect(checkForConflicts({ fields: S.Struct({ a: S.String }) })).type.toBe<
      S.Struct<{ fields: S.Struct<{ a: typeof S.String }> }>
    >()
    expect(checkForConflicts({ fields: S.Struct({ a: S.String }).pipe(S.filter(() => true)) })).type.toBe<
      S.Struct<{ fields: S.filter<S.Struct<{ a: typeof S.String }>> }>
    >()
    expect(
      checkForConflicts({ fields: S.Struct({ a: S.String }).pipe(S.filter(() => true), S.filter(() => true)) })
    ).type.toBe<S.Struct<{ fields: S.filter<S.filter<S.Struct<{ a: typeof S.String }>>> }>>()
    expect(checkForConflicts({ from: S.Struct({ a: S.String }) })).type.toBe<
      S.Struct<{ from: S.Struct<{ a: typeof S.String }> }>
    >()
    expect(checkForConflicts({ from: S.Struct({ a: S.String }).pipe(S.filter(() => true)) })).type.toBe<
      S.Struct<{ from: S.filter<S.Struct<{ a: typeof S.String }>> }>
    >()
    expect(
      checkForConflicts({ from: S.Struct({ a: S.String }).pipe(S.filter(() => true), S.filter(() => true)) })
    ).type.toBe<S.Struct<{ from: S.filter<S.filter<S.Struct<{ a: typeof S.String }>>> }>>()
  })

  it("A class with no fields should permit an empty argument in the constructor.", () => {
    class NoFields extends S.Class<NoFields>("NoFields")({}) {}

    expect(NoFields.ast).type.toBe<AST.Transformation>()

    expect<ConstructorParameters<typeof NoFields>>().type.toBe<
      [props?: void | {}, options?: S.MakeOptions | undefined]
    >()

    new NoFields()
    NoFields.make()
    new NoFields({})
    NoFields.make({})
  })

  it("should reject non existing props", () => {
    class A extends S.Class<A>("A")({
      a: S.String
    }) {}

    expect(A).type.not.toBeConstructableWith({ a: "a", b: "b" })
    expect(A.make).type.not.toBeCallableWith({ a: "a", b: "b" })
  })

  it("A class with all fields with a default should permit an empty argument in the constructor.", () => {
    class AllDefaultedFields extends S.Class<AllDefaultedFields>("AllDefaultedFields")({
      a: S.String.pipe(S.propertySignature, S.withConstructorDefault(() => ""))
    }) {}

    expect<ConstructorParameters<typeof AllDefaultedFields>>().type.toBe<
      [props?: void | { readonly a?: string }, options?: S.MakeOptions | undefined]
    >()

    new AllDefaultedFields()
    AllDefaultedFields.make()
    new AllDefaultedFields({})
    AllDefaultedFields.make({})
  })

  it("test Context", () => {
    expect<S.Schema.Type<typeof WithContext>>()
      .type.toBe<WithContext>()
    expect<S.Schema.Encoded<typeof WithContext>>()
      .type.toBe<{ readonly a: string; readonly b: number }>()
    expect<S.Schema.Context<typeof WithContext>>()
      .type.toBe<"a" | "b">()
  })

  it("should be a constructor", () => {
    expect<ConstructorParameters<typeof WithContext>>()
      .type.toBe<[props: { readonly a: string; readonly b: number }, options?: S.MakeOptions | undefined]>()
  })

  it("should expose a `fields` field", () => {
    expect(WithContext.fields).type.toBe<{ readonly a: typeof aContext; readonly b: typeof bContext }>()
  })

  it("can be extended with Class.extend", () => {
    class Extended extends WithContext.extend<Extended>("Extended")({
      c: cContext
    }) {}

    expect<S.Schema.Type<typeof Extended>>()
      .type.toBe<Extended>()

    expect<S.Schema.Encoded<typeof Extended>>()
      .type.toBe<{ readonly a: string; readonly b: number; readonly c: boolean }>()

    expect<S.Schema.Context<typeof Extended>>().type.toBe<"a" | "b" | "c">()

    expect(Extended.fields)
      .type.toBe<
      {
        readonly a: S.Schema<string, string, "a">
        readonly b: S.Schema<number, number, "b">
        readonly c: S.Schema<boolean, boolean, "c">
      }
    >()

    expect<ConstructorParameters<typeof Extended>>()
      .type.toBe<
      [props: { readonly a: string; readonly b: number; readonly c: boolean }, options?: S.MakeOptions | undefined]
    >()
  })

  it("can be extended with another Class `fields` field", () => {
    class ExtendedFromClassFields extends S.Class<ExtendedFromClassFields>("ExtendedFromClassFields")({
      ...WithContext.fields,
      b: S.String,
      c: cContext
    }) {}

    expect<S.Schema.Type<typeof ExtendedFromClassFields>>()
      .type.toBe<ExtendedFromClassFields>()

    expect<S.Schema.Encoded<typeof ExtendedFromClassFields>>()
      .type.toBe<{ readonly a: string; readonly b: string; readonly c: boolean }>()

    expect<S.Schema.Context<typeof ExtendedFromClassFields>>()
      .type.toBe<"a" | "c">()

    expect(ExtendedFromClassFields.fields)
      .type.toBe<
      {
        readonly b: typeof S.String
        readonly c: S.Schema<boolean, boolean, "c">
        readonly a: S.Schema<string, string, "a">
      }
    >()

    expect<ConstructorParameters<typeof ExtendedFromClassFields>>()
      .type.toBe<
      [props: { readonly a: string; readonly b: string; readonly c: boolean }, options?: S.MakeOptions | undefined]
    >()
  })

  it("can be extended with another TaggedClass `fields` field", () => {
    class ExtendedFromTaggedClassFields
      extends S.TaggedClass<ExtendedFromTaggedClassFields>()("ExtendedFromTaggedClassFields", {
        ...WithContext.fields,
        b: S.String,
        c: cContext
      })
    {}

    expect<S.Schema.Type<typeof ExtendedFromTaggedClassFields>>()
      .type.toBe<ExtendedFromTaggedClassFields>()

    expect<S.Schema.Encoded<typeof ExtendedFromTaggedClassFields>>()
      .type.toBe<
      { readonly a: string; readonly b: string; readonly c: boolean; readonly _tag: "ExtendedFromTaggedClassFields" }
    >()

    expect<S.Schema.Context<typeof ExtendedFromTaggedClassFields>>()
      .type.toBe<"a" | "c">()

    expect(ExtendedFromTaggedClassFields.fields)
      .type.toBe<
      {
        readonly _tag: S.tag<"ExtendedFromTaggedClassFields">
        readonly b: typeof S.String
        readonly c: S.Schema<boolean, boolean, "c">
        readonly a: S.Schema<string, string, "a">
      }
    >()

    expect<ConstructorParameters<typeof ExtendedFromTaggedClassFields>>()
      .type.toBe<
      [props: { readonly a: string; readonly b: string; readonly c: boolean }, options?: S.MakeOptions | undefined]
    >()
  })

  it("should accept a HasFields as argument", () => {
    class _A extends S.Class<_A>("A")(S.Struct({ a: S.String })) {}
    class _B extends S.Class<_B>("B")(S.Struct({ a: S.String }).pipe(S.filter(() => true))) {}
    class _C extends S.Class<_C>("C")(
      S.Struct({ a: S.String }).pipe(S.filter(() => true), S.filter(() => true))
    ) {}
  })

  it("users can override an instance member property", () => {
    class A extends S.Class<A>("A")(S.Struct({ a: S.String })) {
      readonly b: number = 1
    }

    class B extends A.extend<B>("B")({ c: S.String }) {
      override readonly b = 2
    }

    expect(new B({ a: "a", c: "c" }).b)
      .type.toBe<2>()
  })

  it("users can override an instance member function", () => {
    class A extends S.Class<A>("A")(S.Struct({ a: S.String })) {
      b(): number {
        return 1
      }
    }

    class B extends A.extend<B>("B")({ c: S.String }) {
      override b(): 2 {
        return 2
      }
    }

    expect(new B({ a: "a", c: "c" }).b())
      .type.toBe<2>()
  })

  it("users can override a field with an instance member property", () => {
    class A extends S.Class<A>("A")(S.Struct({ a: S.String })) {}

    class B extends A.extend<B>("B")({
      c: S.String
    }) {
      override readonly a = "default"
    }

    expect(new B({ a: "a", c: "c" }).a)
      .type.toBe<"default">()
  })

  it(`users can't override an instance member property with a field`, () => {
    class A extends S.Class<A>("A")(S.Struct({ a: S.String })) {
      readonly b = 1
    }

    class B extends A.extend<B>("B")({ b: S.Number }) {}

    expect(new B({ a: "a", b: 2 }).b)
      .type.toBe<1>()
  })
})
