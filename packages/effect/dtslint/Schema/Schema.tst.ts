/* eslint-disable @typescript-eslint/no-unused-vars */
import type { StandardSchemaV1 } from "@standard-schema/spec"
import type {
  Arbitrary,
  BigDecimal,
  Cause,
  Chunk,
  Config,
  DateTime,
  Duration,
  Either,
  Equivalence,
  Exit,
  FiberId,
  HashMap,
  HashSet,
  List,
  Pretty,
  Redacted,
  SchemaAST,
  SortedSet,
  Types
} from "effect"
import {
  Brand,
  Context,
  Effect,
  hole,
  identity,
  Number as N,
  Option,
  ParseResult,
  pipe,
  Schema as S,
  String as Str
} from "effect"
import { describe, expect, it, when } from "tstyche"

class A extends S.Class<A>("A")({ a: S.NonEmptyString }) {}
declare const anyNever: S.Schema<any>
declare const neverAny: S.Schema<never, any>
declare const anyNeverPropertySignature: S.PropertySignature<"?:", any, never, "?:", never, false>
declare const neverAnyPropertySignature: S.PropertySignature<"?:", never, never, "?:", any, false>
const ServiceA = Context.GenericTag<"ServiceA", string>("ServiceA")
declare const aContext: S.Schema<string, string, "a">
declare const bContext: S.Schema<number, number, "b">
declare const cContext: S.Schema<boolean, boolean, "c">

describe("Schema", () => {
  describe("SchemaClass", () => {
    it("the constructor should not be callable", () => {
      // @ts-expect-error! TODO use '.toHaveConstructSignatures()' when it will be implemented
      new S.String()
    })
  })

  describe("Type Level Helpers", () => {
    it("Schema.Encoded", () => {
      expect<S.Schema.Encoded<typeof S.Never>>().type.toBe<never>()
      expect<S.Schema.Encoded<typeof S.NumberFromString>>().type.toBe<string>()
    })

    it("Schema.Type", () => {
      expect<S.Schema.Type<typeof S.Never>>().type.toBe<never>()
      expect<S.Schema.Type<typeof S.NumberFromString>>().type.toBe<number>()
    })

    it("Schema.Context", () => {
      expect<S.Schema.Context<typeof S.Never>>().type.toBe<never>()
      expect<S.Schema.Context<S.Schema<number, string, "ctx">>>().type.toBe<"ctx">()
    })

    it("Struct.Type", () => {
      expect(hole<Types.Simplify<S.Struct.Type<{}>>>()).type.toBe<{}>()
      expect(hole<Types.Simplify<S.Struct.Type<{ a: S.Schema<number, string> }>>>()).type.toBe<{ readonly a: number }>()
      expect(hole<
        Types.Simplify<
          S.Struct.Type<{
            a: S.Schema<number, string>
            b: S.PropertySignature<":", number, never, ":", string, false, "context">
          }>
        >
      >()).type.toBe<{ readonly a: number; readonly b: number }>()
      expect(hole<
        Types.Simplify<
          S.Struct.Type<{
            a: S.Schema<number, string>
            b: S.PropertySignature<":", number, never, "?:", string, false, "context">
          }>
        >
      >()).type.toBe<{ readonly a: number; readonly b: number }>()
      expect(hole<
        Types.Simplify<
          S.Struct.Type<{
            a: S.Schema<number, string>
            b: S.PropertySignature<":", number, "c", ":", string, false, "context">
          }>
        >
      >()).type.toBe<{ readonly a: number; readonly b: number }>()
      expect(hole<
        Types.Simplify<
          S.Struct.Type<{
            a: S.Schema<number, string>
            b: S.PropertySignature<":", number, "c", "?:", string, false, "context">
          }>
        >
      >()).type.toBe<{ readonly a: number; readonly b: number }>()
      expect(hole<
        Types.Simplify<
          S.Struct.Type<{
            a: S.Schema<number, string>
            b: S.PropertySignature<"?:", number, never, ":", string, false, "context">
          }>
        >
      >()).type.toBe<{ readonly a: number; readonly b?: number }>()
      expect(hole<
        Types.Simplify<
          S.Struct.Type<{
            a: S.Schema<number, string>
            b: S.PropertySignature<"?:", number, never, "?:", string, false, "context">
          }>
        >
      >()).type.toBe<{ readonly a: number; readonly b?: number }>()
      expect(hole<
        Types.Simplify<
          S.Struct.Type<{
            a: S.Schema<number, string>
            b: S.PropertySignature<"?:", number, "c", ":", string, false, "context">
          }>
        >
      >()).type.toBe<{ readonly a: number; readonly b?: number }>()
      expect(hole<
        Types.Simplify<
          S.Struct.Type<{
            a: S.Schema<number, string>
            b: S.PropertySignature<"?:", number, "c", "?:", string, false, "context">
          }>
        >
      >()).type.toBe<{ readonly a: number; readonly b?: number }>()
    })

    it("Struct.Encoded", () => {
      expect(hole<Types.Simplify<S.Struct.Encoded<{}>>>()).type.toBe<{}>()
      expect(hole<Types.Simplify<S.Struct.Encoded<{ a: S.Schema<number, string> }>>>()).type.toBe<
        { readonly a: string }
      >()
      expect(hole<
        Types.Simplify<
          S.Struct.Encoded<{
            a: S.Schema<number, string>
            b: S.PropertySignature<":", number, never, ":", string, false, "context">
          }>
        >
      >()).type.toBe<{ readonly a: string; readonly b: string }>()
      expect(hole<
        Types.Simplify<
          S.Struct.Encoded<{
            a: S.Schema<number, string>
            b: S.PropertySignature<":", number, never, "?:", string, false, "context">
          }>
        >
      >()).type.toBe<{ readonly a: string; readonly b?: string }>()
      expect(hole<
        Types.Simplify<
          S.Struct.Encoded<{
            a: S.Schema<number, string>
            b: S.PropertySignature<":", number, "c", ":", string, false, "context">
          }>
        >
      >()).type.toBe<{ readonly a: string; readonly c: string }>()
      expect(hole<
        Types.Simplify<
          S.Struct.Encoded<{
            a: S.Schema<number, string>
            b: S.PropertySignature<":", number, "c", "?:", string, false, "context">
          }>
        >
      >()).type.toBe<{ readonly a: string; readonly c?: string }>()
      expect(hole<
        Types.Simplify<
          S.Struct.Encoded<{
            a: S.Schema<number, string>
            b: S.PropertySignature<"?:", number, never, ":", string, false, "context">
          }>
        >
      >()).type.toBe<{ readonly a: string; readonly b: string }>()
      expect(hole<
        Types.Simplify<
          S.Struct.Encoded<{
            a: S.Schema<number, string>
            b: S.PropertySignature<"?:", number, never, "?:", string, false, "context">
          }>
        >
      >()).type.toBe<{ readonly a: string; readonly b?: string }>()
      expect(hole<
        Types.Simplify<
          S.Struct.Encoded<{
            a: S.Schema<number, string>
            b: S.PropertySignature<"?:", number, "c", ":", string, false, "context">
          }>
        >
      >()).type.toBe<{ readonly a: string; readonly c: string }>()
      expect(hole<
        Types.Simplify<
          S.Struct.Encoded<{
            a: S.Schema<number, string>
            b: S.PropertySignature<"?:", number, "c", "?:", string, false, "context">
          }>
        >
      >()).type.toBe<{ readonly a: string; readonly c?: string }>()
    })

    it("Struct.Constructor", () => {
      expect(
        hole<
          S.Struct.Constructor<{
            a: S.PropertySignature<":", string, never, ":", string, true>
            b: typeof S.Number
            c: S.PropertySignature<":", boolean, never, ":", boolean, true>
          }>
        >()
      ).type.toBe<{ readonly a?: string } & { readonly b: number } & { readonly c?: boolean }>()
    })

    it("TupleType.Type", () => {
      expect(hole<S.TupleType.Type<[], []>>()).type.toBe<readonly []>()
      expect(hole<S.TupleType.Type<[typeof S.NumberFromString], []>>()).type.toBe<readonly [number]>()
      expect(hole<S.TupleType.Type<[], [typeof S.NumberFromString]>>()).type.toBe<ReadonlyArray<number>>()
      expect(hole<S.TupleType.Type<[typeof S.NumberFromString], [typeof S.NumberFromString]>>()).type.toBe<
        readonly [number, ...Array<number>]
      >()
      expect(
        hole<S.TupleType.Type<[typeof S.NumberFromString], [typeof S.NumberFromString, typeof S.NumberFromString]>>()
      ).type.toBe<readonly [number, ...Array<number>, number]>()
      expect(
        hole<S.TupleType.Type<[typeof S.NumberFromString, S.Element<typeof S.NumberFromString, "?">], []>>()
      ).type.toBe<readonly [number, number?]>()
      expect(
        hole<
          S.TupleType.Type<
            [typeof S.NumberFromString, S.Element<typeof S.NumberFromString, "?">],
            [typeof S.NumberFromString]
          >
        >()
      ).type.toBe<readonly [number, number?, ...Array<number>]>()
    })

    it("TupleType.Encoded", () => {
      expect(hole<S.TupleType.Encoded<[], []>>()).type.toBe<readonly []>()
      expect(hole<S.TupleType.Encoded<[typeof S.NumberFromString], []>>()).type.toBe<readonly [string]>()
      expect(hole<S.TupleType.Encoded<[], [typeof S.NumberFromString]>>()).type.toBe<ReadonlyArray<string>>()
      expect(hole<S.TupleType.Encoded<[typeof S.NumberFromString], [typeof S.NumberFromString]>>()).type.toBe<
        readonly [string, ...Array<string>]
      >()
      expect(
        hole<S.TupleType.Encoded<[typeof S.NumberFromString], [typeof S.NumberFromString, typeof S.NumberFromString]>>()
      ).type.toBe<readonly [string, ...Array<string>, string]>()
      expect(
        hole<S.TupleType.Encoded<[typeof S.NumberFromString, S.Element<typeof S.NumberFromString, "?">], []>>()
      ).type.toBe<readonly [string, string?]>()
      expect(
        hole<
          S.TupleType.Encoded<
            [typeof S.NumberFromString, S.Element<typeof S.NumberFromString, "?">],
            [typeof S.NumberFromString]
          >
        >()
      ).type.toBe<readonly [string, string?, ...Array<string>]>()
    })

    it("TupleType.Context", () => {
      expect(
        hole<S.Schema.Context<S.TupleType<[typeof aContext], [typeof bContext, typeof cContext]>>>()
      ).type.toBe<"a" | "b" | "c">()
    })
  })

  it("annotations", () => {
    // should allow to add custom string annotations to a schema
    expect(S.String.annotations({ a: 1 })).type.toBe<S.SchemaClass<string, string>>()
    // should allow to add custom symbol annotations to a schema
    expect(S.String.annotations({ [Symbol.for("a")]: 1 })).type.toBe<S.SchemaClass<string, string>>()

    interface AnnotatedString extends S.Annotable<AnnotatedString, string> {}
    const AnnotatedString = hole<AnnotatedString>()

    expect(hole<S.Schema<string>>().pipe(S.annotations({}))).type.toBe<S.Schema<string>>()
    expect(AnnotatedString.pipe(S.annotations({}))).type.toBe<AnnotatedString>()

    expect(S.Number.pipe(S.int(), S.brand("Int"), S.annotations({})))
      .type.toBe<S.brand<S.filter<typeof S.Number>, "Int">>()
    expect(S.Struct({ a: AnnotatedString }).pipe(S.annotations({}))).type.toBe<S.Struct<{ a: AnnotatedString }>>()
    expect(A.pipe(S.annotations({}))).type.toBe<S.SchemaClass<A, { readonly a: string }>>()
    expect(S.Number.pipe(S.int(), S.brand("Int")).make(1)).type.toBe<number & Brand.Brand<"Int">>()
  })

  it("Never", () => {
    expect(S.Never).type.toBeAssignableTo<S.Schema<never>>()
    expect(S.Never).type.toBeAssignableTo<S.SchemaClass<never>>()
  })

  it("Primitives", () => {
    expect(S.asSchema(S.Void)).type.toBe<S.Schema<void, void>>()
    expect(S.Void).type.toBe<typeof S.Void>()

    expect(S.asSchema(S.Undefined)).type.toBe<S.Schema<undefined, undefined>>()
    expect(S.Undefined).type.toBe<typeof S.Undefined>()

    expect(S.asSchema(S.String)).type.toBe<S.Schema<string>>()
    expect(S.String).type.toBe<typeof S.String>()

    expect(S.asSchema(S.Number)).type.toBe<S.Schema<number>>()
    expect(S.Number).type.toBe<typeof S.Number>()

    expect(S.asSchema(S.Boolean)).type.toBe<S.Schema<boolean, boolean>>()
    expect(S.Boolean).type.toBe<typeof S.Boolean>()

    expect(S.asSchema(S.BigIntFromSelf)).type.toBe<S.Schema<bigint, bigint>>()
    expect(S.BigIntFromSelf).type.toBe<typeof S.BigIntFromSelf>()

    expect(S.asSchema(S.BigInt)).type.toBe<S.Schema<bigint, string>>()
    expect(S.BigInt).type.toBe<typeof S.BigInt>()

    expect(S.asSchema(S.SymbolFromSelf)).type.toBe<S.Schema<symbol, symbol>>()
    expect(S.SymbolFromSelf).type.toBe<typeof S.SymbolFromSelf>()

    expect(S.asSchema(S.Symbol)).type.toBe<S.Schema<symbol, string>>()
    expect(S.Symbol).type.toBe<typeof S.Symbol>()

    expect(S.asSchema(S.Unknown)).type.toBe<S.Schema<unknown, unknown>>()
    expect(S.Unknown).type.toBe<typeof S.Unknown>()

    expect(S.asSchema(S.Any)).type.toBe<S.Schema<any, any>>()
    expect(S.Any).type.toBe<typeof S.Any>()

    expect(S.asSchema(S.Object)).type.toBe<S.Schema<object, object>>()
    expect(S.Object).type.toBe<typeof S.Object>()
  })

  it("Literal", () => {
    expect(S.asSchema(S.Null)).type.toBe<S.Schema<null, null>>()
    expect(S.Null).type.toBe<typeof S.Null>()

    expect(S.Literal()).type.toBe<S.Never>()
    expect(S.Literal(...[])).type.toBe<S.Never>()
    expect(S.Literal(...([] as Array<"a" | "b">))).type.toBe<S.SchemaClass<"a" | "b">>()
    expect(S.Literal(...([] as Array<never>))).type.toBe<S.SchemaClass<never>>()
    expect(S.asSchema(S.Literal("a"))).type.toBe<S.Schema<"a">>()
    expect(S.Literal("a")).type.toBe<S.Literal<["a"]>>()

    expect(S.asSchema(S.Literal("a", "b", "c"))).type.toBe<S.Schema<"a" | "b" | "c">>()
    expect(S.Literal("a", "b", "c")).type.toBe<S.Literal<["a", "b", "c"]>>()

    expect(S.Literal(1)).type.toBe<S.Literal<[1]>>()
    expect(S.Literal(2n)).type.toBe<S.Literal<[2n]>>()
    expect(S.Literal(true)).type.toBe<S.Literal<[true]>>()
    expect(S.Literal("A", "B")).type.toBe<S.Literal<["A", "B"]>>()
    expect(S.Literal("A", "B").literals).type.toBe<readonly ["A", "B"]>()
    expect(S.Literal("A", "B").annotations({})).type.toBe<S.Literal<["A", "B"]>>()
  })

  describe("Enums", () => {
    enum Fruits {
      Apple,
      Banana
    }

    const schema = S.Enums(Fruits)

    it("Schema Type", () => {
      expect(S.asSchema(schema)).type.toBeAssignableTo<S.Schema<Fruits>>()
      expect(schema).type.toBe<S.Enums<typeof Fruits>>()
    })

    it("should expose the enums field", () => {
      const enums = schema.enums
      expect(enums).type.toBe<typeof Fruits>()
      expect(enums.Apple).type.toBe<Fruits.Apple>()
      expect(enums.Banana).type.toBe<Fruits.Banana>()
    })
  })

  it("UndefinedOr", () => {
    expect(S.UndefinedOr(S.Never)).type.toBe<S.UndefinedOr<typeof S.Never>>()
  })

  it("NullishOr", () => {
    expect(S.NullishOr(S.Never)).type.toBe<S.NullishOr<typeof S.Never>>()
  })

  it("NullOr", () => {
    expect(S.NullOr(S.Never)).type.toBe<S.NullOr<typeof S.Never>>()
    expect(S.asSchema(S.NullOr(S.String))).type.toBe<S.Schema<string | null, string | null>>()
    expect(S.NullOr(S.String)).type.toBe<S.NullOr<typeof S.String>>()
    expect(S.asSchema(S.NullOr(S.NumberFromString))).type.toBe<S.Schema<number | null, string | null>>()
    expect(S.NullOr(S.NumberFromString)).type.toBe<S.NullOr<typeof S.NumberFromString>>()
  })

  describe("Union", () => {
    it("should allow Never members", () => {
      const schema = S.Union(S.String, S.Never)
      expect(S.asSchema(schema)).type.toBe<S.Schema<string>>()
      expect(schema).type.toBe<S.Union<[typeof S.String, typeof S.Never]>>()
    })

    it("union of primitives", () => {
      const schema = S.Union(S.String, S.Number)
      expect(S.asSchema(schema)).type.toBe<S.Schema<string | number, string | number>>()
      expect(schema).type.toBe<S.Union<[typeof S.String, typeof S.Number]>>()
      expect(schema.annotations({})).type.toBe<S.Union<[typeof S.String, typeof S.Number]>>()
      // should expose the members
      expect(schema.members).type.toBe<readonly [typeof S.String, typeof S.Number]>()
    })

    it("primitive + transformation", () => {
      const schema = S.Union(S.Boolean, S.NumberFromString)
      expect(S.asSchema(schema)).type.toBe<S.Schema<number | boolean, string | boolean>>()
      expect(schema).type.toBe<S.Union<[typeof S.Boolean, typeof S.NumberFromString]>>()
      expect(schema.annotations({
        pretty: () => (a) => {
          expect(a).type.toBe<number | boolean>()
          return "-"
        }
      })).type.toBe<S.Union<[typeof S.Boolean, typeof S.NumberFromString]>>()
    })
  })

  it("keyof", () => {
    expect(S.keyof(S.Struct({ a: S.String, b: S.NumberFromString }))).type.toBe<S.SchemaClass<"a" | "b", "a" | "b">>()
  })

  describe("Tuple", () => {
    it("required elements", () => {
      expect(S.asSchema(S.Tuple(S.String, S.Number)))
        .type.toBe<S.Schema<readonly [string, number], readonly [string, number]>>()
      expect(S.Tuple(S.String, S.Number)).type.toBe<S.Tuple2<typeof S.String, typeof S.Number>>()
      expect(S.asSchema(S.Tuple(S.String, S.NumberFromString)))
        .type.toBe<S.Schema<readonly [string, number], readonly [string, string]>>()
      expect(S.Tuple(S.String, S.NumberFromString)).type.toBe<S.Tuple2<typeof S.String, typeof S.NumberFromString>>()
      expect(S.Tuple(S.String, S.Number).elements).type.toBe<readonly [typeof S.String, typeof S.Number]>()
      expect(S.Tuple(S.String, S.Number).rest).type.toBe<readonly []>()
    })

    it("required elements + rest", () => {
      expect(S.asSchema(S.Tuple([S.String], S.Number, S.Boolean))).type.toBe<
        S.Schema<readonly [string, ...Array<number>, boolean], readonly [string, ...Array<number>, boolean]>
      >()
      expect(S.Tuple([S.String], S.Number, S.Boolean)).type.toBe<
        S.TupleType<readonly [typeof S.String], [typeof S.Number, typeof S.Boolean]>
      >()
      expect(S.Tuple([S.String], S.Number).elements).type.toBe<readonly [typeof S.String]>()
      expect(S.Tuple([S.String], S.Number).rest).type.toBe<readonly [typeof S.Number]>()
      expect(S.Tuple([S.String], S.Number, S.Boolean).rest).type.toBe<readonly [typeof S.Number, typeof S.Boolean]>()
    })

    it("optional elements", () => {
      expect(S.asSchema(S.Tuple(S.String, S.Number, S.optionalElement(S.Boolean))))
        .type.toBe<S.Schema<readonly [string, number, boolean?], readonly [string, number, boolean?]>>()
      expect(S.Tuple(S.String, S.Number, S.optionalElement(S.Boolean)))
        .type.toBe<S.Tuple<[typeof S.String, typeof S.Number, S.Element<typeof S.Boolean, "?">]>>()
      expect(
        S.asSchema(S.Tuple(S.String, S.NumberFromString, S.optionalElement(S.NumberFromString)))
      ).type.toBe<S.Schema<readonly [string, number, number?], readonly [string, string, string?]>>()
      expect(
        S.Tuple(S.String, S.NumberFromString, S.optionalElement(S.NumberFromString))
      ).type.toBe<S.Tuple<[typeof S.String, typeof S.NumberFromString, S.Element<typeof S.NumberFromString, "?">]>>()
    })

    it("Array", () => {
      expect(S.asSchema(S.Array(S.Number))).type.toBe<S.Schema<ReadonlyArray<number>, ReadonlyArray<number>>>()
      expect(S.Array(S.Number)).type.toBe<S.Array$<typeof S.Number>>()
      expect(pipe(S.Number, S.Array)).type.toBe<S.Array$<typeof S.Number>>()
      expect(S.asSchema(S.Array(S.NumberFromString)))
        .type.toBe<S.Schema<ReadonlyArray<number>, ReadonlyArray<string>>>()
      expect(S.Array(S.NumberFromString)).type.toBe<S.Array$<typeof S.NumberFromString>>()
      expect(S.Array(S.String).value).type.toBe<typeof S.String>()
      expect(S.Array(S.String).elements).type.toBe<readonly []>()
      expect(S.Array(S.String).rest).type.toBe<readonly [typeof S.String]>()
    })
  })

  it("NonEmptyArray", () => {
    const schema = S.NonEmptyArray(S.NumberFromString)
    expect(S.asSchema(schema))
      .type.toBe<S.Schema<readonly [number, ...Array<number>], readonly [string, ...Array<string>]>>()
    expect(schema).type.toBe<S.NonEmptyArray<typeof S.NumberFromString>>()
    expect(schema.annotations({
      pretty: () => (nea) => {
        expect(nea).type.toBe<readonly [number, ...Array<number>]>()
        return "-"
      }
    })).type.toBe<S.NonEmptyArray<typeof S.NumberFromString>>()

    // should support pipe
    expect(pipe(S.NumberFromString, S.NonEmptyArray)).type.toBe<S.NonEmptyArray<typeof S.NumberFromString>>()

    // should expose the value, elements and rest fields
    expect(schema.value).type.toBe<typeof S.NumberFromString>()
    expect(schema.elements).type.toBe<readonly [typeof S.NumberFromString]>()
    expect(schema.rest).type.toBe<readonly [typeof S.NumberFromString]>()
  })

  describe("Struct", () => {
    it("baseline", () => {
      const schema = S.Struct({ a: S.String, b: S.NumberFromString })
      expect(S.asSchema(schema))
        .type.toBe<S.Schema<{ readonly a: string; readonly b: number }, { readonly a: string; readonly b: string }>>()
      expect(schema).type.toBe<S.Struct<{ a: typeof S.String; b: typeof S.NumberFromString }>>()
      expect(schema.annotations({
        pretty: () => (a) => {
          expect(a).type.toBe<{
            readonly a: string
            readonly b: number
          }>()
          return "-"
        }
      })).type.toBe<S.Struct<{ a: typeof S.String; b: typeof S.NumberFromString }>>()

      // exposed fields
      expect(schema.fields).type.toBe<{ readonly a: typeof S.String; readonly b: typeof S.NumberFromString }>()
      expect(schema.records).type.toBe<readonly []>()
    })

    it("should accept Never as a field", () => {
      const schema = S.Struct({ a: S.Never, b: S.NumberFromString })
      expect(S.asSchema(schema))
        .type.toBe<S.Schema<{ readonly a: never; readonly b: number }, { readonly a: never; readonly b: string }>>()
      expect(schema).type.toBe<S.Struct<{ a: typeof S.Never; b: typeof S.NumberFromString }>>()
      expect(schema.annotations({
        pretty: () => (a) => {
          expect(a).type.toBe<{
            readonly a: never
            readonly b: number
          }>()
          return "-"
        }
      })).type.toBe<S.Struct<{ a: typeof S.Never; b: typeof S.NumberFromString }>>()

      expect(S.asSchema(S.Struct({ a: anyNever }))).type.toBe<S.Schema<{ readonly a: any }, { readonly a: any }>>()
      expect(S.asSchema(S.Struct({ a: neverAny }))).type.toBe<S.Schema<{ readonly a: never }, { readonly a: any }>>()
      expect(S.asSchema(S.Struct({ a: anyNeverPropertySignature })))
        .type.toBe<S.Schema<{ readonly a?: any }, { readonly a?: never }>>()
      expect(S.asSchema(S.Struct({ a: neverAnyPropertySignature })))
        .type.toBe<S.Schema<{ readonly a?: never }, { readonly a?: any }>>()
    })

    describe("make", () => {
      it("baseline", () => {
        const schema = S.Struct({ a: S.String, b: S.NumberFromString })
        expect(schema.make).type.toBe<
          (
            props: { readonly a: string; readonly b: number },
            options?: S.MakeOptions | undefined
          ) => { readonly a: string; readonly b: number }
        >()
        expect(schema.annotations({}).make).type.toBe<
          (
            props: { readonly a: string; readonly b: number },
            options?: S.MakeOptions | undefined
          ) => { readonly a: string; readonly b: number }
        >()
      })

      it("withConstructorDefault", () => {
        const schema = S.Struct({
          a: S.propertySignature(S.String).pipe(S.withConstructorDefault(() => "")),
          b: S.Number,
          c: S.propertySignature(S.Boolean).pipe(S.withConstructorDefault(() => true))
        })
        expect(schema.make).type.toBe<
          (
            props: { readonly a?: string; readonly b: number; readonly c?: boolean },
            options?: S.MakeOptions | undefined
          ) => { readonly a: string; readonly b: number; readonly c: boolean }
        >()
        expect(schema.annotations({}).make).type.toBe<
          (
            props: { readonly a?: string; readonly b: number; readonly c?: boolean },
            options?: S.MakeOptions | undefined
          ) => { readonly a: string; readonly b: number; readonly c: boolean }
        >()
      })
    })

    it("pick", () => {
      expect(S.Struct({ a: S.String }).pick).type.not.toBeCallableWith("c")
      expect(S.Struct({ a: S.propertySignature(S.String).pipe(S.fromKey("c")) }).pick)
        .type.not.toBeCallableWith("c")

      expect(S.Struct({ a: S.String, b: S.Number, c: S.Boolean }).pick("a", "b"))
        .type.toBe<S.Struct<{ a: typeof S.String; b: typeof S.Number }>>()

      const f = <Fields extends S.Struct.Fields, A extends { readonly a: string }>(
        schema: S.Struct<Fields> & S.Schema<A, S.Struct.Encoded<Fields>, S.Struct.Context<Fields>>
      ) => {
        expect(schema.fields).type.toBe<Readonly<Fields>>()
        const picked = schema.pick("a") // existing field
        expect(picked).type.toBe<S.Struct<{ a: Fields["a"] }>>()

        const e = S.encodeUnknown(schema)(null)
        expect(e).type.toBe<
          Effect.Effect<S.Struct.Encoded<Fields>, ParseResult.ParseError, S.Schema.Context<Fields[keyof Fields]>>
        >()

        return picked
      }

      when(f).isCalledWith(expect(S.Struct).type.not.toBeCallableWith({ b: S.String }))

      when(f).isCalledWith(expect(S.Struct).type.not.toBeCallableWith({ a: S.Number }))
    })

    it("omit", () => {
      expect(S.Struct({ a: S.String }).omit).type.not.toBeCallableWith("c")
      expect(S.Struct({ a: S.propertySignature(S.String).pipe(S.fromKey("c")) }).omit).type.not.toBeCallableWith("c")

      expect(S.Struct({ a: S.String, b: S.Number, c: S.Boolean }).omit("c"))
        .type.toBe<S.Struct<{ a: typeof S.String; b: typeof S.Number }>>()
      expect(S.Struct({ a: S.Number, b: S.Number.pipe(S.propertySignature, S.fromKey("c")) }).omit("b"))
        .type.toBe<S.Struct<{ a: typeof S.Number }>>()

      const f = <Fields extends S.Struct.Fields, A extends { readonly a: string }>(
        schema: S.Struct<Fields> & S.Schema<A, S.Struct.Encoded<Fields>, S.Struct.Context<Fields>>
      ) => {
        expect(schema.fields).type.toBe<Readonly<Fields>>()
        const omitted = schema.omit("a") // existing field
        expect(omitted).type.toBe<S.Struct<{ [K in keyof Omit<Fields, "a">]: Omit<Fields, "a">[K] }>>()

        const e = S.encodeUnknown(schema)(null)
        expect(e).type.toBe<
          Effect.Effect<S.Struct.Encoded<Fields>, ParseResult.ParseError, S.Schema.Context<Fields[keyof Fields]>>
        >()

        return omitted
      }

      when(f).isCalledWith(expect(S.Struct).type.not.toBeCallableWith({ b: S.String }))

      when(f).isCalledWith(expect(S.Struct).type.not.toBeCallableWith({ a: S.Number }))
    })
  })

  describe("Record", () => {
    it("baseline", () => {
      const schema = S.Record({ key: S.String, value: S.NumberFromString })
      expect(S.asSchema(schema)).type.toBe<
        S.Schema<{ readonly [x: string]: number }, { readonly [x: string]: string }>
      >()
      expect(schema).type.toBe<S.Record$<typeof S.String, typeof S.NumberFromString>>()
      expect(schema.annotations({
        pretty: () => (s) => {
          expect(s).type.toBe<{ readonly [x: string]: number }>()
          return "-"
        }
      })).type.toBe<S.Record$<typeof S.String, typeof S.NumberFromString>>()

      // exposed fields
      expect(schema.fields).type.toBe<{}>()
      expect(schema.records).type.toBe<
        readonly [{ readonly key: typeof S.String; readonly value: typeof S.NumberFromString }]
      >()
      expect(schema.key).type.toBe<typeof S.String>()
      expect(schema.value).type.toBe<typeof S.NumberFromString>()
    })

    it("make", () => {
      const schema = S.Record({ key: S.String, value: S.NumberFromString })
      const make = schema.make
      expect(make).type.toBe<
        (
          props: void | { readonly [x: string]: number },
          options?: S.MakeOptions | undefined
        ) => { readonly [x: string]: number }
      >()
    })

    it("keys as union of literals", () => {
      const schema = S.Record({ key: S.Union(S.Literal("a"), S.Literal("b")), value: S.NumberFromString })
      expect(S.asSchema(schema)).type.toBe<
        S.Schema<
          { readonly a: number; readonly b: number },
          { readonly a: string; readonly b: string }
        >
      >()
      expect(schema).type.toBe<S.Record$<S.Union<[S.Literal<["a"]>, S.Literal<["b"]>]>, typeof S.NumberFromString>>()
      expect(schema.annotations({
        pretty: () => (s) => {
          expect(s).type.toBe<{
            readonly a: number
            readonly b: number
          }>()
          return "-"
        }
      })).type.toBe<S.Record$<S.Union<[S.Literal<["a"]>, S.Literal<["b"]>]>, typeof S.NumberFromString>>()
    })

    it("keys as symbols", () => {
      const schema = S.Record({ key: S.SymbolFromSelf, value: S.NumberFromString })
      expect(S.asSchema(schema)).type.toBe<
        S.Schema<
          { readonly [x: symbol]: number },
          { readonly [x: symbol]: string }
        >
      >()
      expect(schema).type.toBe<S.Record$<typeof S.SymbolFromSelf, typeof S.NumberFromString>>()
      expect(schema.annotations({
        pretty: () => (s) => {
          expect(s).type.toBe<{ readonly [x: symbol]: number }>()
          return "-"
        }
      })).type.toBe<S.Record$<typeof S.SymbolFromSelf, typeof S.NumberFromString>>()
    })

    it("keys as template literals", () => {
      const schema = S.Record({ key: S.TemplateLiteral(S.Literal("a"), S.String), value: S.NumberFromString })
      expect(S.asSchema(schema)).type.toBe<
        S.Schema<{ readonly [x: `a${string}`]: number }, { readonly [x: `a${string}`]: string }>
      >()
      expect(schema).type.toBe<S.Record$<S.TemplateLiteral<`a${string}`>, typeof S.NumberFromString>>()
      expect(schema.annotations({
        pretty: () => (s) => {
          expect(s).type.toBe<{ readonly [x: `a${string}`]: number }>()
          return "-"
        }
      })).type.toBe<S.Record$<S.TemplateLiteral<`a${string}`>, typeof S.NumberFromString>>()
    })

    it("keys as branded types (string)", () => {
      const schema = S.Record({ key: S.String.pipe(S.brand("UserId")), value: S.NumberFromString })
      expect(S.asSchema(schema)).type.toBe<
        S.Schema<{ readonly [x: string & Brand.Brand<"UserId">]: number }, { readonly [x: string]: string }>
      >()
      expect(schema).type.toBe<S.Record$<S.brand<typeof S.String, "UserId">, typeof S.NumberFromString>>()
      expect(schema.annotations({
        pretty: () => (s) => {
          expect(s).type.toBe<{ readonly [x: string & Brand.Brand<"UserId">]: number }>()
          return "-"
        }
      })).type.toBe<S.Record$<S.brand<typeof S.String, "UserId">, typeof S.NumberFromString>>()
    })

    it("keys as branded types (symbol)", () => {
      const schema = S.Record({ key: S.String.pipe(S.brand(Symbol.for("UserId"))), value: S.NumberFromString })
      expect(S.asSchema(schema)).type.toBe<
        S.Schema<{ readonly [x: string & Brand.Brand<symbol>]: number }, { readonly [x: string]: string }>
      >()
      expect(schema).type.toBe<S.Record$<S.brand<typeof S.String, symbol>, typeof S.NumberFromString>>()
      expect(schema.annotations({
        pretty: () => (s) => {
          expect(s).type.toBe<{ readonly [x: string & Brand.Brand<symbol>]: number }>()
          return "-"
        }
      })).type.toBe<S.Record$<S.brand<typeof S.String, symbol>, typeof S.NumberFromString>>()
    })
  })

  describe("TypeLiteral", () => {
    it("1 index signature", () => {
      const schema = S.Struct({ a: S.NumberFromString }, { key: S.String, value: S.NumberFromString })
      expect(S.asSchema(schema)).type.toBe<
        S.Schema<
          { readonly [x: string]: number; readonly a: number },
          { readonly [x: string]: string; readonly a: string }
        >
      >()
      expect(schema).type.toBe<
        S.TypeLiteral<
          { a: typeof S.NumberFromString },
          readonly [{ readonly key: typeof S.String; readonly value: typeof S.NumberFromString }]
        >
      >()
      expect(schema.annotations({
        pretty: () => (s) => {
          expect(s).type.toBe<{ readonly [x: string]: number; readonly a: number }>()
          return "-"
        }
      })).type.toBe<
        S.TypeLiteral<
          { a: typeof S.NumberFromString },
          readonly [{ readonly key: typeof S.String; readonly value: typeof S.NumberFromString }]
        >
      >()

      // exposed fields
      expect(schema.fields).type.toBe<{ readonly a: typeof S.NumberFromString }>()
      expect(schema.records).type.toBe<
        readonly [{ readonly key: typeof S.String; readonly value: typeof S.NumberFromString }]
      >()
    })

    it("make", () => {
      const schema = S.Struct({ a: S.NumberFromString }, { key: S.String, value: S.NumberFromString })
      expect(schema.make).type.toBe<
        (
          props: void | { readonly [x: string]: number; readonly a: number },
          options?: S.MakeOptions | undefined
        ) => { readonly [x: string]: number; readonly a: number }
      >()
      expect(schema.annotations({}).make).type.toBe<
        (
          props: void | { readonly [x: string]: number; readonly a: number },
          options?: S.MakeOptions | undefined
        ) => { readonly [x: string]: number; readonly a: number }
      >()
    })

    it("2 index signatures", () => {
      const schema = S.Struct(
        { a: S.NumberFromString },
        { key: S.String, value: S.NumberFromString },
        { key: S.Symbol, value: S.NumberFromString }
      )
      expect(S.asSchema(schema)).type.toBe<
        S.Schema<
          { readonly [x: string]: number; readonly [x: symbol]: number; readonly a: number },
          { readonly [x: string]: string; readonly a: string }
        >
      >()
      expect(schema).type.toBe<
        S.TypeLiteral<
          { a: typeof S.NumberFromString },
          readonly [
            { readonly key: typeof S.String; readonly value: typeof S.NumberFromString },
            { readonly key: typeof S.Symbol; readonly value: typeof S.NumberFromString }
          ]
        >
      >()
      expect(schema.annotations({
        pretty: () => (s) => {
          expect(s).type.toBe<{ readonly [x: string]: number; readonly [x: symbol]: number; readonly a: number }>()
          return "-"
        }
      })).type.toBe<
        S.TypeLiteral<
          { a: typeof S.NumberFromString },
          readonly [
            { readonly key: typeof S.String; readonly value: typeof S.NumberFromString },
            { readonly key: typeof S.Symbol; readonly value: typeof S.NumberFromString }
          ]
        >
      >()

      // exposed fields
      expect(schema.fields).type.toBe<{ readonly a: typeof S.NumberFromString }>()
      expect(schema.records).type.toBe<
        readonly [
          { readonly key: typeof S.String; readonly value: typeof S.NumberFromString },
          { readonly key: typeof S.Symbol; readonly value: typeof S.NumberFromString }
        ]
      >()

      expect(schema.make).type.toBe<
        (
          props: void | { readonly [x: string]: number; readonly [x: symbol]: number; readonly a: number },
          options?: S.MakeOptions | undefined
        ) => { readonly [x: string]: number; readonly [x: symbol]: number; readonly a: number }
      >()
      expect(schema.annotations({}).make).type.toBe<
        (
          props: void | { readonly [x: string]: number; readonly [x: symbol]: number; readonly a: number },
          options?: S.MakeOptions | undefined
        ) => { readonly [x: string]: number; readonly [x: symbol]: number; readonly a: number }
      >()
    })
  })

  it("optional", () => {
    expect(S.optional(S.Never)).type.toBe<S.optional<typeof S.Never>>()
    expect(
      S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optional(S.Boolean) }))
    ).type.toBe<
      S.Schema<
        { readonly a: string; readonly b: number; readonly c?: boolean | undefined },
        { readonly a: string; readonly b: number; readonly c?: boolean | undefined },
        never
      >
    >()
    expect(S.Struct({ a: S.String, b: S.Number, c: S.optional(S.Boolean) }))
      .type.toBe<S.Struct<{ a: typeof S.String; b: typeof S.Number; c: S.optional<typeof S.Boolean> }>>()
    expect(
      S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optional(S.NumberFromString) }))
    ).type.toBe<
      S.Schema<
        { readonly a: string; readonly b: number; readonly c?: number | undefined },
        { readonly a: string; readonly b: number; readonly c?: string | undefined },
        never
      >
    >()
    expect(S.Struct({ a: S.String, b: S.Number, c: S.optional(S.NumberFromString) }))
      .type.toBe<S.Struct<{ a: typeof S.String; b: typeof S.Number; c: S.optional<typeof S.NumberFromString> }>>()
    expect(S.asSchema(S.Struct({ a: S.String.pipe(S.optional) })))
      .type.toBe<S.Schema<{ readonly a?: string | undefined }, { readonly a?: string | undefined }>>()
    expect(S.Struct({ a: S.String.pipe(S.optional) })).type.toBe<S.Struct<{ a: S.optional<typeof S.String> }>>()
  })

  describe("optionalWith", () => {
    it("{ exact: true }", () => {
      expect(
        S.asSchema(S.Struct({ a: S.optionalWith(S.Never, { exact: true }) }))
      ).type.toBe<S.Schema<{ readonly a?: never }, { readonly a?: never }>>()
      expect(S.Struct({ a: S.optionalWith(S.Never, { exact: true }) }))
        .type.toBe<S.Struct<{ a: S.optionalWith<typeof S.Never, { exact: true }> }>>()
      expect(
        S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.Boolean, { exact: true }) }))
      ).type.toBe<
        S.Schema<
          { readonly a: string; readonly b: number; readonly c?: boolean },
          { readonly a: string; readonly b: number; readonly c?: boolean },
          never
        >
      >()
      expect(
        S.asSchema(S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.NumberFromString, { exact: true }) }))
      ).type.toBe<
        S.Schema<
          { readonly a: string; readonly b: number; readonly c?: number },
          { readonly a: string; readonly b: number; readonly c?: string },
          never
        >
      >()
      expect(S.Struct({ a: S.Literal("a", "b").pipe(S.optionalWith({ exact: true })) }))
        .type.toBe<S.Struct<{ a: S.optionalWith<S.Literal<["a", "b"]>, { exact: true }> }>>()
    })

    it("Type Level Errors", () => {
      expect(S.optionalWith).type.not.toBeCallableWith(S.String, { as: "Option", default: () => "" })
      expect(S.optionalWith).type.not.toBeCallableWith(S.String, {
        as: "Option",
        exact: true,
        onNoneEncoding: () => Option.some(null)
      })
      expect(S.optionalWith).type.not.toBeCallableWith(
        { as: "Option", exact: true, onNoneEncoding: () => Option.some(null) }
      )
      expect(S.optionalWith).type.not.toBeCallableWith(S.String, {
        as: "Option",
        exact: true,
        nullable: true,
        onNoneEncoding: () => Option.some(1)
      })
      expect(S.optionalWith).type.not.toBeCallableWith(S.String, {
        as: "Option",
        onNoneEncoding: () => Option.some(null)
      })
      expect(S.optionalWith).type.not.toBeCallableWith({ as: "Option", onNoneEncoding: () => Option.some(null) })
      expect(S.optionalWith).type.not.toBeCallableWith(
        { as: "Option", exact: true, nullable: true, onNoneEncoding: () => Option.some(1) }
      )
      expect(S.optionalWith).type.not.toBeCallableWith(S.String, {
        as: "Option",
        nullable: true,
        onNoneEncoding: () => Option.some(1)
      })
      expect(S.optionalWith).type.not.toBeCallableWith(
        { as: "Option", nullable: true, onNoneEncoding: () => Option.some(1) }
      )
      expect(S.optionalWith).type.not.toBeCallableWith(S.String, { as: null })
      expect(S.optionalWith).type.not.toBeCallableWith(S.String, { default: null })
    })

    it("used in a generic context", () => {
      type TypeWithValue<Value extends S.Schema.Any> = { value: S.optionalWith<Value, { nullable: true }> }
      const makeTypeWithValue = <Value extends S.Schema.Any>(value: Value): TypeWithValue<Value> => ({
        value: S.optionalWith(value, { nullable: true })
      })
      expect(makeTypeWithValue(S.String)).type.toBe<TypeWithValue<typeof S.String>>()
    })

    it("{ exact: true, default: () => A }", () => {
      expect(
        S.asSchema(
          S.Struct({
            a: S.String,
            b: S.Number,
            c: S.optionalWith(S.Boolean, { exact: true, default: () => false })
          })
        )
      ).type.toBe<
        S.Schema<
          { readonly a: string; readonly b: number; readonly c: boolean },
          { readonly a: string; readonly b: number; readonly c?: boolean },
          never
        >
      >()

      expect(
        S.Struct({
          a: S.String,
          b: S.Number,
          c: S.optionalWith(S.Boolean, { exact: true, default: () => false })
        })
      ).type.toBe<
        S.Struct<{
          a: typeof S.String
          b: typeof S.Number
          c: S.optionalWith<typeof S.Boolean, { exact: true; default: () => false }>
        }>
      >()

      expect(
        S.asSchema(
          S.Struct({
            a: S.String,
            b: S.Number,
            c: S.optionalWith(S.NumberFromString, { exact: true, default: () => 0 })
          })
        )
      ).type.toBe<
        S.Schema<
          { readonly a: string; readonly b: number; readonly c: number },
          { readonly a: string; readonly b: number; readonly c?: string },
          never
        >
      >()

      expect(
        S.Struct({
          a: S.String,
          b: S.Number,
          c: S.optionalWith(S.NumberFromString, { exact: true, default: () => 0 })
        })
      ).type.toBe<
        S.Struct<{
          a: typeof S.String
          b: typeof S.Number
          c: S.optionalWith<typeof S.NumberFromString, { exact: true; default: () => number }>
        }>
      >()

      expect(
        S.Struct({ a: S.optionalWith(S.Literal("a", "b"), { default: () => "a", exact: true }) })
      ).type.toBe<
        S.Struct<{
          a: S.optionalWith<S.Literal<["a", "b"]>, { default: () => "a"; exact: true }>
        }>
      >()

      expect(
        S.asSchema(
          S.Struct({ a: S.Literal("a", "b").pipe(S.optionalWith({ default: () => "a", exact: true })) })
        )
      ).type.toBe<
        S.Schema<
          { readonly a: "a" | "b" },
          { readonly a?: "a" | "b" },
          never
        >
      >()

      expect(
        S.Struct({ a: S.Literal("a", "b").pipe(S.optionalWith({ default: () => "a", exact: true })) })
      ).type.toBe<
        S.Struct<{
          a: S.optionalWith<S.Literal<["a", "b"]>, { default: () => "a"; exact: true }>
        }>
      >()
    })

    it("{ default: () => A }", () => {
      expect(
        S.asSchema(
          S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.Boolean, { default: () => false }) })
        )
      ).type.toBe<
        S.Schema<
          { readonly a: string; readonly b: number; readonly c: boolean },
          { readonly a: string; readonly b: number; readonly c?: boolean | undefined },
          never
        >
      >()

      expect(
        S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.Boolean, { default: () => false }) })
      ).type.toBe<
        S.Struct<{
          a: typeof S.String
          b: typeof S.Number
          c: S.optionalWith<typeof S.Boolean, { default: () => false }>
        }>
      >()

      expect(
        S.asSchema(
          S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.NumberFromString, { default: () => 0 }) })
        )
      ).type.toBe<
        S.Schema<
          { readonly a: string; readonly b: number; readonly c: number },
          { readonly a: string; readonly b: number; readonly c?: string | undefined },
          never
        >
      >()

      expect(
        S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.NumberFromString, { default: () => 0 }) })
      ).type.toBe<
        S.Struct<{
          a: typeof S.String
          b: typeof S.Number
          c: S.optionalWith<typeof S.NumberFromString, { default: () => number }>
        }>
      >()

      expect(
        S.Struct({ a: S.optionalWith(S.Literal("a", "b"), { default: () => "a" }) })
      ).type.toBe<
        S.Struct<{
          a: S.optionalWith<S.Literal<["a", "b"]>, { default: () => "a" }>
        }>
      >()

      expect(
        S.asSchema(
          S.Struct({ a: S.Literal("a", "b").pipe(S.optionalWith({ default: () => "a" })) })
        )
      ).type.toBe<
        S.Schema<
          { readonly a: "a" | "b" },
          { readonly a?: "a" | "b" | undefined },
          never
        >
      >()

      expect(
        S.Struct({ a: S.Literal("a", "b").pipe(S.optionalWith({ default: () => "a" })) })
      ).type.toBe<
        S.Struct<{
          a: S.optionalWith<S.Literal<["a", "b"]>, { default: () => "a" }>
        }>
      >()
    })

    it("{ exact: true, nullable: true, default: () => A }", () => {
      expect(
        S.asSchema(
          S.Struct({ a: S.optionalWith(S.NumberFromString, { exact: true, nullable: true, default: () => 0 }) })
        )
      ).type.toBe<
        S.Schema<
          { readonly a: number },
          { readonly a?: string | null },
          never
        >
      >()

      expect(
        S.Struct({ a: S.optionalWith(S.NumberFromString, { exact: true, nullable: true, default: () => 0 }) })
      ).type.toBe<
        S.Struct<{
          a: S.optionalWith<typeof S.NumberFromString, { exact: true; nullable: true; default: () => number }>
        }>
      >()
    })

    it("{ nullable: true, default: () => A }", () => {
      expect(
        S.asSchema(
          S.Struct({ a: S.optionalWith(S.NumberFromString, { nullable: true, default: () => 0 }) })
        )
      ).type.toBe<
        S.Schema<
          { readonly a: number },
          { readonly a?: string | null | undefined },
          never
        >
      >()

      expect(
        S.Struct({ a: S.optionalWith(S.NumberFromString, { nullable: true, default: () => 0 }) })
      ).type.toBe<
        S.Struct<{
          a: S.optionalWith<typeof S.NumberFromString, { nullable: true; default: () => number }>
        }>
      >()

      expect(
        S.asSchema(
          S.Struct({ a: S.optionalWith(S.NumberFromString, { exact: true, nullable: true, default: () => 0 }) })
        )
      ).type.toBe<
        S.Schema<
          { readonly a: number },
          { readonly a?: string | null },
          never
        >
      >()

      expect(
        S.Struct({ a: S.optionalWith(S.NumberFromString, { exact: true, nullable: true, default: () => 0 }) })
      ).type.toBe<
        S.Struct<{
          a: S.optionalWith<typeof S.NumberFromString, { exact: true; nullable: true; default: () => number }>
        }>
      >()

      expect(
        S.Struct({ a: S.optionalWith(S.Literal("a", "b"), { default: () => "a", nullable: true }) })
      ).type.toBe<
        S.Struct<{
          a: S.optionalWith<S.Literal<["a", "b"]>, { default: () => "a"; nullable: true }>
        }>
      >()

      expect(
        S.asSchema(
          S.Struct({ a: S.Literal("a", "b").pipe(S.optionalWith({ default: () => "a", nullable: true })) })
        )
      ).type.toBe<
        S.Schema<
          { readonly a: "a" | "b" },
          { readonly a?: "a" | "b" | null | undefined },
          never
        >
      >()

      expect(
        S.Struct({ a: S.Literal("a", "b").pipe(S.optionalWith({ default: () => "a", nullable: true })) })
      ).type.toBe<
        S.Struct<{
          a: S.optionalWith<S.Literal<["a", "b"]>, { default: () => "a"; nullable: true }>
        }>
      >()
    })

    it("{ exact: true, as: 'Option' }", () => {
      expect(
        S.asSchema(
          S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.Boolean, { exact: true, as: "Option" }) })
        )
      ).type.toBe<
        S.Schema<
          { readonly a: string; readonly b: number; readonly c: Option.Option<boolean> },
          { readonly a: string; readonly b: number; readonly c?: boolean },
          never
        >
      >()

      expect(
        S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.Boolean, { exact: true, as: "Option" }) })
      ).type.toBe<
        S.Struct<{
          a: typeof S.String
          b: typeof S.Number
          c: S.optionalWith<typeof S.Boolean, { exact: true; as: "Option" }>
        }>
      >()

      expect(
        S.asSchema(
          S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.NumberFromString, { exact: true, as: "Option" }) })
        )
      ).type.toBe<
        S.Schema<
          { readonly a: string; readonly b: number; readonly c: Option.Option<number> },
          { readonly a: string; readonly b: number; readonly c?: string },
          never
        >
      >()

      expect(
        S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.NumberFromString, { exact: true, as: "Option" }) })
      ).type.toBe<
        S.Struct<{
          a: typeof S.String
          b: typeof S.Number
          c: S.optionalWith<typeof S.NumberFromString, { exact: true; as: "Option" }>
        }>
      >()

      expect(
        S.asSchema(S.Struct({ a: S.String.pipe(S.optionalWith({ exact: true, as: "Option" })) }))
      ).type.toBe<
        S.Schema<
          { readonly a: Option.Option<string> },
          { readonly a?: string },
          never
        >
      >()

      expect(
        S.Struct({ a: S.String.pipe(S.optionalWith({ exact: true, as: "Option" })) })
      ).type.toBe<
        S.Struct<{
          a: S.optionalWith<typeof S.String, { exact: true; as: "Option" }>
        }>
      >()
    })

    it("{ as: 'Option' }", () => {
      expect(
        S.asSchema(
          S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.Boolean, { as: "Option" }) })
        )
      ).type.toBe<
        S.Schema<
          { readonly a: string; readonly b: number; readonly c: Option.Option<boolean> },
          { readonly a: string; readonly b: number; readonly c?: boolean | undefined },
          never
        >
      >()
      expect(
        S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.Boolean, { as: "Option" }) })
      ).type.toBe<
        S.Struct<{
          a: typeof S.String
          b: typeof S.Number
          c: S.optionalWith<typeof S.Boolean, { as: "Option" }>
        }>
      >()
      expect(
        S.asSchema(
          S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.NumberFromString, { as: "Option" }) })
        )
      ).type.toBe<
        S.Schema<
          { readonly a: string; readonly b: number; readonly c: Option.Option<number> },
          { readonly a: string; readonly b: number; readonly c?: string | undefined },
          never
        >
      >()
      expect(
        S.Struct({ a: S.String, b: S.Number, c: S.optionalWith(S.NumberFromString, { as: "Option" }) })
      ).type.toBe<
        S.Struct<{
          a: typeof S.String
          b: typeof S.Number
          c: S.optionalWith<typeof S.NumberFromString, { as: "Option" }>
        }>
      >()
      expect(
        S.asSchema(S.Struct({ a: S.String.pipe(S.optionalWith({ as: "Option" })) }))
      ).type.toBe<
        S.Schema<
          { readonly a: Option.Option<string> },
          { readonly a?: string | undefined },
          never
        >
      >()
      expect(
        S.Struct({ a: S.String.pipe(S.optionalWith({ as: "Option" })) })
      ).type.toBe<
        S.Struct<{
          a: S.optionalWith<typeof S.String, { as: "Option" }>
        }>
      >()
    })

    it("{ nullable: true, as: 'Option' }", () => {
      expect(
        S.asSchema(
          S.Struct({ a: S.optionalWith(S.NumberFromString, { nullable: true, as: "Option" }) })
        )
      ).type.toBe<
        S.Schema<
          { readonly a: Option.Option<number> },
          { readonly a?: string | null | undefined },
          never
        >
      >()
      expect(
        S.Struct({ a: S.optionalWith(S.NumberFromString, { nullable: true, as: "Option" }) })
      ).type.toBe<
        S.Struct<{
          a: S.optionalWith<typeof S.NumberFromString, { nullable: true; as: "Option" }>
        }>
      >()
      expect(
        S.asSchema(S.Struct({ a: S.String.pipe(S.optionalWith({ nullable: true, as: "Option" })) }))
      ).type.toBe<
        S.Schema<
          { readonly a: Option.Option<string> },
          { readonly a?: string | null | undefined },
          never
        >
      >()
      expect(
        S.Struct({ a: S.String.pipe(S.optionalWith({ nullable: true, as: "Option" })) })
      ).type.toBe<
        S.Struct<{
          a: S.optionalWith<typeof S.String, { nullable: true; as: "Option" }>
        }>
      >()
    })

    it("{ exact: true, nullable: true, as: 'Option' }", () => {
      expect(
        S.asSchema(
          S.Struct({ a: S.optionalWith(S.NumberFromString, { exact: true, nullable: true, as: "Option" }) })
        )
      ).type.toBe<
        S.Schema<
          { readonly a: Option.Option<number> },
          { readonly a?: string | null },
          never
        >
      >()
      expect(
        S.Struct({ a: S.optionalWith(S.NumberFromString, { exact: true, nullable: true, as: "Option" }) })
      ).type.toBe<
        S.Struct<{
          a: S.optionalWith<typeof S.NumberFromString, { exact: true; nullable: true; as: "Option" }>
        }>
      >()
      expect(
        S.asSchema(S.Struct({ a: S.String.pipe(S.optionalWith({ exact: true, nullable: true, as: "Option" })) }))
      ).type.toBe<
        S.Schema<
          { readonly a: Option.Option<string> },
          { readonly a?: string | null },
          never
        >
      >()
      expect(
        S.Struct({ a: S.String.pipe(S.optionalWith({ exact: true, nullable: true, as: "Option" })) })
      ).type.toBe<
        S.Struct<{
          a: S.optionalWith<typeof S.String, { exact: true; nullable: true; as: "Option" }>
        }>
      >()
    })
  })

  describe("pick", () => {
    it("required fields", () => {
      when(pipe).isCalledWith(
        S.Struct({ a: S.propertySignature(S.Number).pipe(S.fromKey("c")) }),
        expect(S.pick).type.not.toBeCallableWith("a")
      )
      expect(
        pipe(S.Struct({ a: S.String, b: S.Number, c: S.Boolean }), S.pick("a", "b"))
      ).type.toBe<
        S.SchemaClass<{ readonly a: string; readonly b: number }, { readonly a: string; readonly b: number }>
      >()
      expect(
        pipe(S.Struct({ a: S.String, b: S.NumberFromString, c: S.Boolean }), S.pick("a", "b"))
      ).type.toBe<
        S.SchemaClass<{ readonly a: string; readonly b: number }, { readonly a: string; readonly b: string }>
      >()
    })

    it("optional fields", () => {
      expect(
        pipe(
          S.Struct({ a: S.optionalWith(S.String, { exact: true }), b: S.Number, c: S.Boolean }),
          S.pick("a", "b")
        )
      ).type.toBe<
        S.SchemaClass<{ readonly a?: string; readonly b: number }, { readonly a?: string; readonly b: number }>
      >()
      expect(
        pipe(
          S.Struct({ a: S.optionalWith(S.String, { exact: true }), b: S.NumberFromString, c: S.Boolean }),
          S.pick("a", "b")
        )
      ).type.toBe<
        S.SchemaClass<{ readonly a?: string; readonly b: number }, { readonly a?: string; readonly b: string }>
      >()
      expect(
        pipe(
          S.Struct({
            a: S.optionalWith(S.String, { exact: true, default: () => "" }),
            b: S.NumberFromString,
            c: S.Boolean
          }),
          S.pick("a", "b")
        )
      ).type.toBe<
        S.SchemaClass<{ readonly a: string; readonly b: number }, { readonly a?: string; readonly b: string }>
      >()
    })
  })

  describe("omit", () => {
    it("required fields", () => {
      when(pipe).isCalledWith(
        S.Struct({ a: S.propertySignature(S.Number).pipe(S.fromKey("c")) }),
        expect(S.omit).type.not.toBeCallableWith("a")
      )
      expect(
        pipe(S.Struct({ a: S.String, b: S.Number, c: S.Boolean }), S.omit("c"))
      ).type.toBe<
        S.SchemaClass<{ readonly a: string; readonly b: number }, { readonly a: string; readonly b: number }>
      >()
      expect(
        pipe(S.Struct({ a: S.String, b: S.NumberFromString, c: S.Boolean }), S.omit("c"))
      ).type.toBe<
        S.SchemaClass<{ readonly a: string; readonly b: number }, { readonly a: string; readonly b: string }>
      >()
    })

    it("optional fields", () => {
      expect(
        pipe(
          S.Struct({ a: S.optionalWith(S.String, { exact: true }), b: S.Number, c: S.Boolean }),
          S.omit("c")
        )
      ).type.toBe<
        S.SchemaClass<{ readonly a?: string; readonly b: number }, { readonly a?: string; readonly b: number }>
      >()
      expect(
        pipe(
          S.Struct({ a: S.optionalWith(S.String, { exact: true }), b: S.NumberFromString, c: S.Boolean }),
          S.omit("c")
        )
      ).type.toBe<
        S.SchemaClass<{ readonly a?: string; readonly b: number }, { readonly a?: string; readonly b: string }>
      >()
      expect(
        pipe(
          S.Struct({
            a: S.optionalWith(S.String, { exact: true, default: () => "" }),
            b: S.NumberFromString,
            c: S.Boolean
          }),
          S.omit("c")
        )
      ).type.toBe<
        S.SchemaClass<{ readonly a: string; readonly b: number }, { readonly a?: string; readonly b: string }>
      >()
    })
  })

  it("brand", () => {
    const schema = pipe(S.Number, S.int(), S.brand("Int"))
    expect(S.asSchema(schema)).type.toBe<S.Schema<number & Brand.Brand<"Int">, number>>()
    expect(schema).type.toBe<S.brand<S.filter<typeof S.Number>, "Int">>()
    expect(schema.annotations({})).type.toBe<S.brand<S.filter<typeof S.Number>, "Int">>()
    expect(schema.from).type.toBe<S.filter<typeof S.Number>>()

    const schema2 = pipe(S.NumberFromString, S.int(), S.brand("Int"))
    expect(S.asSchema(schema2)).type.toBe<S.Schema<number & Brand.Brand<"Int">, string>>()
    expect(schema2).type.toBe<S.brand<S.filter<typeof S.NumberFromString>, "Int">>()
  })

  it("partial", () => {
    expect(S.partial(S.Struct({ a: S.String, b: S.Number })))
      .type.toBe<
      S.SchemaClass<
        { readonly a?: string | undefined; readonly b?: number | undefined },
        { readonly a?: string | undefined; readonly b?: number | undefined },
        never
      >
    >()
    expect(S.partial(S.Struct({ a: S.String, b: S.NumberFromString })))
      .type.toBe<
      S.SchemaClass<
        { readonly a?: string | undefined; readonly b?: number | undefined },
        { readonly a?: string | undefined; readonly b?: string | undefined },
        never
      >
    >()
    expect(S.Struct({ a: S.String, b: S.Number }).pipe(S.partial))
      .type.toBe<
      S.SchemaClass<
        { readonly a?: string | undefined; readonly b?: number | undefined },
        { readonly a?: string | undefined; readonly b?: number | undefined },
        never
      >
    >()
  })

  it("partialWith", () => {
    expect(S.partialWith(S.Struct({ a: S.String, b: S.Number }), { exact: true }))
      .type.toBe<
      S.SchemaClass<
        { readonly a?: string; readonly b?: number },
        { readonly a?: string; readonly b?: number },
        never
      >
    >()
    expect(S.partialWith(S.Struct({ a: S.String, b: S.NumberFromString }), { exact: true }))
      .type.toBe<
      S.SchemaClass<
        { readonly a?: string; readonly b?: number },
        { readonly a?: string; readonly b?: string },
        never
      >
    >()
    expect(S.Struct({ a: S.String, b: S.Number }).pipe(S.partialWith({ exact: true })))
      .type.toBe<
      S.SchemaClass<
        { readonly a?: string; readonly b?: number },
        { readonly a?: string; readonly b?: number },
        never
      >
    >()
  })

  it("required with optionalWith", () => {
    expect(
      S.required(
        S.Struct({ a: S.optionalWith(S.String, { exact: true }), b: S.optionalWith(S.Number, { exact: true }) })
      )
    ).type.toBe<
      S.SchemaClass<
        { readonly a: string; readonly b: number },
        { readonly a: string; readonly b: number },
        never
      >
    >()
    expect(
      S.required(
        S.Struct({
          a: S.optionalWith(S.String, { exact: true }),
          b: S.NumberFromString,
          c: S.optionalWith(S.NumberFromString, { exact: true })
        })
      )
    ).type.toBe<
      S.SchemaClass<
        { readonly a: string; readonly b: number; readonly c: number },
        { readonly a: string; readonly b: string; readonly c: string },
        never
      >
    >()
  })

  it("extend", () => {
    expect(
      S.asSchema(
        pipe(
          S.Struct({ a: S.String, b: S.String }),
          S.extend(S.Struct({ c: S.String }))
        )
      )
    ).type.toBe<
      S.Schema<
        { readonly a: string; readonly b: string } & { readonly c: string },
        { readonly a: string; readonly b: string } & { readonly c: string },
        never
      >
    >()
    expect(
      pipe(
        S.Struct({ a: S.String, b: S.String }),
        S.extend(S.Struct({ c: S.String }))
      )
    ).type.toBe<S.extend<S.Struct<{ a: typeof S.String; b: typeof S.String }>, S.Struct<{ c: typeof S.String }>>>()
    expect(
      S.asSchema(S.extend(S.Struct({ a: S.String, b: S.String }), S.Struct({ c: S.String })))
    ).type.toBe<
      S.Schema<
        { readonly a: string; readonly b: string } & { readonly c: string },
        { readonly a: string; readonly b: string } & { readonly c: string },
        never
      >
    >()
    expect(
      S.extend(S.Struct({ a: S.String, b: S.String }), S.Struct({ c: S.String }))
    ).type.toBe<S.extend<S.Struct<{ a: typeof S.String; b: typeof S.String }>, S.Struct<{ c: typeof S.String }>>>()
    expect(
      S.asSchema(
        S.extend(S.Struct({ a: S.String }), S.Union(S.Struct({ b: S.Number }), S.Struct({ c: S.Boolean })))
      )
    ).type.toBe<
      S.Schema<
        { readonly a: string } & ({ readonly b: number } | { readonly c: boolean }),
        { readonly a: string } & ({ readonly b: number } | { readonly c: boolean }),
        never
      >
    >()
    expect(
      S.extend(S.Struct({ a: S.String }), S.Union(S.Struct({ b: S.Number }), S.Struct({ c: S.Boolean })))
    ).type.toBe<
      S.extend<
        S.Struct<{ a: typeof S.String }>,
        S.Union<[S.Struct<{ b: typeof S.Number }>, S.Struct<{ c: typeof S.Boolean }>]>
      >
    >()
    expect(
      S.asSchema(
        pipe(
          S.Struct({ a: S.String, b: S.String }),
          S.extend(S.Struct({ c: S.String })),
          S.extend(S.Record({ key: S.String, value: S.String }))
        )
      )
    ).type.toBe<
      S.Schema<
        { readonly a: string; readonly b: string } & { readonly c: string } & { readonly [x: string]: string }
      >
    >()
    expect(
      pipe(
        S.Struct({ a: S.String, b: S.String }),
        S.extend(S.Struct({ c: S.String })),
        S.extend(S.Record({ key: S.String, value: S.String }))
      )
    ).type.toBe<
      S.extend<
        S.extend<S.Struct<{ a: typeof S.String; b: typeof S.String }>, S.Struct<{ c: typeof S.String }>>,
        S.Record$<typeof S.String, typeof S.String>
      >
    >()
  })

  it("suspend", () => {
    interface SuspendIEqualA {
      readonly a: number
      readonly as: ReadonlyArray<SuspendIEqualA>
    }
    const SuspendIEqualA = S.Struct({
      a: S.Number,
      as: S.Array(S.suspend((): S.Schema<SuspendIEqualA> => SuspendIEqualA))
    })
    expect(SuspendIEqualA.fields)
      .type.toBe<
      { readonly a: typeof S.Number; readonly as: S.Array$<S.suspend<SuspendIEqualA, SuspendIEqualA, never>> }
    >()

    interface SuspendINotEqualA_A {
      readonly a: string
      readonly as: ReadonlyArray<SuspendINotEqualA_A>
    }
    interface SuspendINotEqualA_I {
      readonly a: number
      readonly as: ReadonlyArray<SuspendINotEqualA_I>
    }
    const SuspendINotEqualA = S.Struct({
      a: S.NumberFromString,
      as: S.Array(S.suspend((): S.Schema<SuspendINotEqualA_I, SuspendINotEqualA_A> => SuspendINotEqualA))
    })
    expect(SuspendINotEqualA.fields).type.toBe<
      {
        readonly a: typeof S.NumberFromString
        readonly as: S.Array$<S.suspend<SuspendINotEqualA_I, SuspendINotEqualA_A, never>>
      }
    >()
  })

  it("rename", () => {
    expect(S.rename(S.Struct({ a: S.String, b: S.Number }), {}))
      .type.toBe<
      S.SchemaClass<
        { readonly a: string; readonly b: number },
        { readonly a: string; readonly b: number },
        never
      >
    >()
    expect(S.rename(S.Struct({ a: S.String, b: S.Number }), { a: "c" }))
      .type.toBe<
      S.SchemaClass<
        { readonly c: string; readonly b: number },
        { readonly a: string; readonly b: number },
        never
      >
    >()
    expect(S.rename(S.Struct({ a: S.String, b: S.Number }), { a: "c", b: "d" }))
      .type.toBe<
      S.SchemaClass<
        { readonly c: string; readonly d: number },
        { readonly a: string; readonly b: number },
        never
      >
    >()
    const a = Symbol.for("effect/Schema/dtslint/a")
    expect(S.rename(S.Struct({ a: S.String, b: S.Number }), { a }))
      .type.toBe<
      S.SchemaClass<
        { readonly [a]: string; readonly b: number },
        { readonly a: string; readonly b: number },
        never
      >
    >()
    expect(S.rename).type.not.toBeCallableWith(S.Struct({ a: S.String, b: S.Number }), { c: "d" })
    expect(S.rename).type.not.toBeCallableWith(S.Struct({ a: S.String, b: S.Number }), { a: "c", d: "e" })
    expect(S.Struct({ a: S.String, b: S.Number }).pipe(S.rename({})))
      .type.toBe<
      S.SchemaClass<
        { readonly a: string; readonly b: number },
        { readonly a: string; readonly b: number },
        never
      >
    >()
    expect(S.Struct({ a: S.String, b: S.Number }).pipe(S.rename({ a: "c" })))
      .type.toBe<
      S.SchemaClass<
        { readonly c: string; readonly b: number },
        { readonly a: string; readonly b: number },
        never
      >
    >()
    when(S.Struct({ a: S.String, b: S.Number }).pipe).isCalledWith(
      expect(S.rename).type.not.toBeCallableWith({ c: "d" })
    )
    when(S.Struct({ a: S.String, b: S.Number }).pipe).isCalledWith(
      expect(S.rename).type.not.toBeCallableWith({ a: "c", d: "e" })
    )
  })

  describe("declare", () => {
    it("instanceOf", () => {
      class Test {
        constructor(readonly name: string) {}
      }
      const schema = S.instanceOf(Test)
      expect(S.asSchema(schema)).type.toBe<S.Schema<Test, Test>>()
      expect(schema).type.toBe<S.instanceOf<Test>>()
      expect(schema.annotations({})).type.toBe<S.instanceOf<Test>>()
      // should expose the type parameters
      expect(schema.typeParameters).type.toBe<readonly []>()
    })
  })

  it("TemplateLiteral", () => {
    expect(S.TemplateLiteral("a"))
      .type.toBe<S.TemplateLiteral<"a">>()
    expect(S.TemplateLiteral(S.Literal("a")))
      .type.toBe<S.TemplateLiteral<"a">>()
    expect(S.TemplateLiteral(1))
      .type.toBe<S.TemplateLiteral<"1">>()
    expect(S.TemplateLiteral(S.Literal(1)))
      .type.toBe<S.TemplateLiteral<"1">>()
    expect(S.TemplateLiteral(S.String))
      .type.toBe<S.TemplateLiteral<string>>()
    expect(S.TemplateLiteral(S.Number))
      .type.toBe<S.TemplateLiteral<`${number}`>>()
    expect(S.TemplateLiteral("a", "b"))
      .type.toBe<S.TemplateLiteral<"ab">>()
    expect(S.TemplateLiteral(S.Literal("a"), S.Literal("b")))
      .type.toBe<S.TemplateLiteral<"ab">>()
    expect(S.TemplateLiteral("a", S.String))
      .type.toBe<S.TemplateLiteral<`a${string}`>>()
    expect(S.TemplateLiteral(S.Literal("a"), S.String))
      .type.toBe<S.TemplateLiteral<`a${string}`>>()
    expect(S.TemplateLiteral("a", S.Number))
      .type.toBe<S.TemplateLiteral<`a${number}`>>()
    expect(S.TemplateLiteral(S.Literal("a"), S.Number))
      .type.toBe<S.TemplateLiteral<`a${number}`>>()
    expect(S.TemplateLiteral(S.String, "a"))
      .type.toBe<S.TemplateLiteral<`${string}a`>>()
    expect(S.TemplateLiteral(S.String, S.Literal("a")))
      .type.toBe<S.TemplateLiteral<`${string}a`>>()
    expect(S.TemplateLiteral(S.Number, "a"))
      .type.toBe<S.TemplateLiteral<`${number}a`>>()
    expect(S.TemplateLiteral(S.Number, S.Literal("a")))
      .type.toBe<S.TemplateLiteral<`${number}a`>>()
    expect(S.TemplateLiteral(S.String, 0))
      .type.toBe<S.TemplateLiteral<`${string}0`>>()
    expect(S.TemplateLiteral(S.String, true))
      .type.toBe<S.TemplateLiteral<`${string}true`>>()
    expect(S.TemplateLiteral(S.String, null))
      .type.toBe<S.TemplateLiteral<`${string}null`>>()
    expect(S.TemplateLiteral(S.String, 1n))
      .type.toBe<S.TemplateLiteral<`${string}1`>>()
    expect(S.TemplateLiteral(S.String, S.Literal("a", 0)))
      .type.toBe<S.TemplateLiteral<`${string}a` | `${string}0`>>()
    expect(S.TemplateLiteral(S.String, S.Literal("/"), S.Number))
      .type.toBe<S.TemplateLiteral<`${string}/${number}`>>()
    expect(S.TemplateLiteral(S.String, "/", S.Number))
      .type.toBe<S.TemplateLiteral<`${string}/${number}`>>()
    const EmailLocaleIDs = S.Literal("welcome_email", "email_heading")
    const FooterLocaleIDs = S.Literal("footer_title", "footer_sendoff")
    expect(S.asSchema(S.TemplateLiteral(S.Union(EmailLocaleIDs, FooterLocaleIDs), S.Literal("_id"))))
      .type.toBe<
      S.Schema<
        "welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id",
        "welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id",
        never
      >
    >()
    expect(S.TemplateLiteral(S.Union(EmailLocaleIDs, FooterLocaleIDs), "_id"))
      .type.toBe<
      S.TemplateLiteral<
        "welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id"
      >
    >()
    expect(S.TemplateLiteral(S.String.pipe(S.brand("MyBrand"))))
      .type.toBe<S.TemplateLiteral<`${string & Brand.Brand<"MyBrand">}`>>()
    expect(S.TemplateLiteral(S.Number.pipe(S.brand("MyBrand"))))
      .type.toBe<S.TemplateLiteral<`${number & Brand.Brand<"MyBrand">}`>>()
    expect(S.TemplateLiteral("a", S.String.pipe(S.brand("MyBrand"))))
      .type.toBe<S.TemplateLiteral<`a${string & Brand.Brand<"MyBrand">}`>>()
    expect(S.TemplateLiteral(S.Literal("a"), S.String.pipe(S.brand("MyBrand"))))
      .type.toBe<S.TemplateLiteral<`a${string & Brand.Brand<"MyBrand">}`>>()
    expect(S.TemplateLiteral(S.Literal("a").pipe(S.brand("L")), S.String.pipe(S.brand("MyBrand"))))
      .type.toBe<S.TemplateLiteral<`${"a" & Brand.Brand<"L">}${string & Brand.Brand<"MyBrand">}`>>()
    expect(S.TemplateLiteral("a", S.Number.pipe(S.brand("MyBrand"))))
      .type.toBe<S.TemplateLiteral<`a${number & Brand.Brand<"MyBrand">}`>>()
    expect(S.TemplateLiteral(S.Literal("a"), S.Number.pipe(S.brand("MyBrand"))))
      .type.toBe<S.TemplateLiteral<`a${number & Brand.Brand<"MyBrand">}`>>()
    expect(S.TemplateLiteral("a", S.Union(S.Number, S.String)))
      .type.toBe<S.TemplateLiteral<`a${string}` | `a${number}`>>()
  })

  it("attachPropertySignature", () => {
    expect(
      pipe(S.Struct({ radius: S.Number }), S.attachPropertySignature("kind", "circle"))
    ).type.toBe<
      S.SchemaClass<
        { readonly radius: number } & { readonly kind: "circle" },
        { readonly radius: number },
        never
      >
    >()
    expect(
      pipe(S.Struct({ radius: S.NumberFromString }), S.attachPropertySignature("kind", "circle"))
    ).type.toBe<
      S.SchemaClass<
        { readonly radius: number } & { readonly kind: "circle" },
        { readonly radius: string },
        never
      >
    >()
    expect(S.attachPropertySignature(S.Struct({ radius: S.Number }), "kind", "circle"))
      .type.toBe<
      S.SchemaClass<
        { readonly radius: number } & { readonly kind: "circle" },
        { readonly radius: number },
        never
      >
    >()
    expect(S.attachPropertySignature(S.Struct({ radius: S.NumberFromString }), "kind", "circle"))
      .type.toBe<
      S.SchemaClass<
        { readonly radius: number } & { readonly kind: "circle" },
        { readonly radius: string },
        never
      >
    >()
    const taggedStruct = <Name extends SchemaAST.LiteralValue | symbol, Fields extends S.Struct.Fields>(
      name: Name,
      fields: Fields
    ) => S.Struct(fields).pipe(S.attachPropertySignature("_tag", name))
    expect(taggedStruct("A", { a: S.String }))
      .type.toBe<
      S.SchemaClass<
        { readonly a: string } & { readonly _tag: "A" },
        { readonly a: string },
        never
      >
    >()
    // should work with generic code
    const _f = <A, I, R>(B: S.Schema<A, I, R>, input: unknown) => {
      const union = S.Union(
        S.Struct({ code: S.Number }).pipe(S.attachPropertySignature("ok", false)),
        B.pipe(S.attachPropertySignature("ok", true))
      )
      S.decodeUnknown(union)(input).pipe(Effect.flatMap((data) => {
        if (!data.ok) {
          expect(data.code).type.toBe<number>()
        }
        return Effect.succeed(data)
      }))
    }
  })

  it("filterEffect", () => {
    expect(
      S.String.pipe(S.filterEffect((s) => {
        expect(s).type.toBe<string>()
        return Effect.succeed(undefined)
      }))
    ).type.toBe<S.filterEffect<typeof S.String>>()
    expect(
      S.filterEffect(S.String, (s) => {
        expect(s).type.toBe<string>()
        return Effect.succeed(undefined)
      })
    ).type.toBe<S.filterEffect<typeof S.String>>()

    expect(
      S.String.pipe(
        S.filterEffect((s) =>
          Effect.gen(function*() {
            const str = yield* ServiceA
            return str === s
          })
        )
      )
    ).type.toBe<S.filterEffect<typeof S.String, "ServiceA">>()
    expect(
      S.filterEffect(S.String, (s) =>
        Effect.gen(function*() {
          const str = yield* ServiceA
          return str === s
        }))
    ).type.toBe<S.filterEffect<typeof S.String, "ServiceA">>()
  })

  describe("compose", () => {
    it("{ strict: true } should not allow incompatible types", () => {
      expect(S.compose).type.not.toBeCallableWith(
        S.String,
        S.Number
      )
      expect(S.compose).type.not.toBeCallableWith(
        S.String,
        S.Number,
        { strict: true }
      )
      when(S.String.pipe).isCalledWith(
        expect(S.compose).type.not.toBeCallableWith(S.Number, { strict: true })
      )
    })

    it("{ strict: false } should allow incompatible types", () => {
      S.compose(S.String, S.Number, { strict: false })
      S.String.pipe(S.compose(S.Number, { strict: false }))
    })

    it("data last", () => {
      // first overload
      const schema1_1 = S.split(",").pipe(S.compose(S.Array(S.NumberFromString)))
      expect(S.asSchema(schema1_1)).type.toBe<S.Schema<ReadonlyArray<number>, string>>()
      expect(schema1_1)
        .type.toBe<
        S.transform<
          S.transform<S.SchemaClass<string, string, never>, S.Array$<typeof S.String>>,
          S.Array$<typeof S.NumberFromString>
        >
      >()
      expect(schema1_1.annotations({}))
        .type.toBe<
        S.transform<
          S.transform<S.SchemaClass<string, string, never>, S.Array$<typeof S.String>>,
          S.Array$<typeof S.NumberFromString>
        >
      >()
      const schema1_2 = S.Union(S.Null, S.String).pipe(S.compose(S.NumberFromString))
      expect(S.asSchema(schema1_2)).type.toBe<S.Schema<number, string | null>>()
      expect(schema1_2)
        .type.toBe<S.transform<S.Union<[typeof S.Null, typeof S.String]>, typeof S.NumberFromString>>()
      expect(schema1_2.annotations({}))
        .type.toBe<S.transform<S.Union<[typeof S.Null, typeof S.String]>, typeof S.NumberFromString>>()
      expect(schema1_2.to).type.toBe<typeof S.NumberFromString>()

      // second overload
      const schema2 = S.NumberFromString.pipe(S.compose(S.Union(S.Null, S.Number)))
      expect(schema2)
        .type.toBe<S.transform<typeof S.NumberFromString, S.Union<[typeof S.Null, typeof S.Number]>>>()
      expect(schema2.annotations({}))
        .type.toBe<S.transform<typeof S.NumberFromString, S.Union<[typeof S.Null, typeof S.Number]>>>()

      // third overload
      const schema3 = S.split(",").pipe(S.compose(S.Array(S.NumberFromString), { strict: true }))
      expect(S.asSchema(schema3)).type.toBe<S.Schema<ReadonlyArray<number>, string>>()
      expect(schema3).type.toBe<
        S.transform<
          S.transform<S.SchemaClass<string, string, never>, S.Array$<typeof S.String>>,
          S.Array$<typeof S.NumberFromString>
        >
      >()
      expect(schema3.annotations({})).type.toBe<
        S.transform<
          S.transform<S.SchemaClass<string, string, never>, S.Array$<typeof S.String>>,
          S.Array$<typeof S.NumberFromString>
        >
      >()

      // fourth overload
      const schema4 = S.String.pipe(S.compose(S.Number, { strict: false }))
      expect(S.asSchema(schema4)).type.toBe<S.Schema<number, string>>()
      expect(schema4).type.toBe<S.transform<typeof S.String, typeof S.Number>>()
      expect(schema4.annotations({})).type.toBe<S.transform<typeof S.String, typeof S.Number>>()
      expect(schema4.from).type.toBe<typeof S.String>()
      expect(schema4.to).type.toBe<typeof S.Number>()
    })

    it("data first", () => {
      // first overload
      const schema1_1 = S.compose(S.split(","), S.Array(S.NumberFromString))
      expect(S.asSchema(schema1_1)).type.toBe<S.Schema<ReadonlyArray<number>, string>>()
      expect(schema1_1)
        .type.toBe<
        S.transform<
          S.transform<S.SchemaClass<string, string, never>, S.Array$<typeof S.String>>,
          S.Array$<typeof S.NumberFromString>
        >
      >()
      expect(schema1_1.annotations({}))
        .type.toBe<
        S.transform<
          S.transform<S.SchemaClass<string, string, never>, S.Array$<typeof S.String>>,
          S.Array$<typeof S.NumberFromString>
        >
      >()
      const schema1_2 = S.compose(S.Union(S.Null, S.String), S.NumberFromString)
      expect(S.asSchema(schema1_2)).type.toBe<S.Schema<number, string | null>>()
      expect(schema1_2)
        .type.toBe<S.transform<S.Union<[typeof S.Null, typeof S.String]>, typeof S.NumberFromString>>()
      expect(schema1_2.annotations({}))
        .type.toBe<S.transform<S.Union<[typeof S.Null, typeof S.String]>, typeof S.NumberFromString>>()
      expect(schema1_2.to).type.toBe<typeof S.NumberFromString>()

      // second overload
      const schema2 = S.compose(S.NumberFromString, S.Union(S.Null, S.Number))
      expect(schema2)
        .type.toBe<S.transform<typeof S.NumberFromString, S.Union<[typeof S.Null, typeof S.Number]>>>()
      expect(schema2.annotations({}))
        .type.toBe<S.transform<typeof S.NumberFromString, S.Union<[typeof S.Null, typeof S.Number]>>>()

      // third overload
      const schema3 = S.compose(S.split(","), S.Array(S.NumberFromString), { strict: true })
      expect(S.asSchema(schema3)).type.toBe<S.Schema<ReadonlyArray<number>, string>>()
      expect(schema3).type.toBe<
        S.transform<
          S.transform<S.SchemaClass<string, string, never>, S.Array$<typeof S.String>>,
          S.Array$<typeof S.NumberFromString>
        >
      >()
      expect(schema3.annotations({})).type.toBe<
        S.transform<
          S.transform<S.SchemaClass<string, string, never>, S.Array$<typeof S.String>>,
          S.Array$<typeof S.NumberFromString>
        >
      >()

      // fourth overload
      const schema4 = S.compose(S.String, S.Number, { strict: false })
      expect(S.asSchema(schema4)).type.toBe<S.Schema<number, string>>()
      expect(schema4).type.toBe<S.transform<typeof S.String, typeof S.Number>>()
      expect(schema4.annotations({})).type.toBe<S.transform<typeof S.String, typeof S.Number>>()
      expect(schema4.from).type.toBe<typeof S.String>()
      expect(schema4.to).type.toBe<typeof S.Number>()
    })
  })

  it("fromBrand", () => {
    type Eur = number & Brand.Brand<"Eur">
    const Eur = Brand.nominal<Eur>()
    expect(S.Number.pipe(S.fromBrand(Eur)))
      .type.toBe<S.BrandSchema<number & Brand.Brand<"Eur">, number>>()
  })

  it("mutable", () => {
    expect(S.asSchema(S.mutable(S.String)))
      .type.toBe<S.Schema<string>>()
    S.mutable(S.String)
    expect(S.asSchema(S.mutable(S.Struct({ a: S.Number }))))
      .type.toBe<S.Schema<{ a: number }, { a: number }>>()
    S.mutable(S.Struct({ a: S.Number }))
    expect(S.asSchema(S.mutable(S.Record({ key: S.String, value: S.Number }))))
      .type.toBe<S.Schema<{ [x: string]: number }, { [x: string]: number }>>()
    S.mutable(S.Record({ key: S.String, value: S.Number }))
    expect(S.asSchema(S.mutable(S.Array(S.String))))
      .type.toBe<S.Schema<Array<string>>>()
    S.mutable(S.Array(S.String))
    expect(S.asSchema(S.mutable(S.Union(S.Struct({ a: S.Number }), S.Array(S.String)))))
      .type.toBe<S.Schema<Array<string> | { a: number }, Array<string> | { a: number }>>()
    S.mutable(S.Union(S.Struct({ a: S.Number }), S.Array(S.String)))
    expect(S.asSchema(S.mutable(S.Array(S.String).pipe(S.maxItems(2)))))
      .type.toBe<S.Schema<Array<string>>>()
    expect(S.asSchema(S.mutable(S.NonEmptyArray(S.String).pipe(S.maxItems(2)))))
      .type.toBe<S.Schema<[string, ...Array<string>], [string, ...Array<string>]>>()
    expect(S.asSchema(S.mutable(S.suspend(() => S.Array(S.String)))))
      .type.toBe<S.Schema<Array<string>>>()
    S.mutable(S.suspend(() => S.Array(S.String)))
    expect(
      S.asSchema(S.mutable(S.transform(S.Array(S.String), S.Array(S.String), { decode: identity, encode: identity })))
    )
      .type.toBe<S.Schema<Array<string>>>()
    S.mutable(S.transform(S.Array(S.String), S.Array(S.String), { decode: identity, encode: identity }))
    expect(S.asSchema(S.extend(S.mutable(S.Struct({ a: S.String })), S.mutable(S.Struct({ b: S.Number })))))
      .type.toBe<S.Schema<{ a: string } & { b: number }, { a: string } & { b: number }>>()
    expect(S.asSchema(S.extend(S.mutable(S.Struct({ a: S.String })), S.Struct({ b: S.Number }))))
      .type.toBe<S.Schema<{ a: string } & { readonly b: number }, { a: string } & { readonly b: number }>>()
    expect(
      S.asSchema(
        S.extend(S.mutable(S.Struct({ a: S.String })), S.mutable(S.Record({ key: S.String, value: S.String })))
      )
    )
      .type.toBe<S.Schema<{ a: string } & { [x: string]: string }, { a: string } & { [x: string]: string }>>()
    expect(S.asSchema(S.extend(S.mutable(S.Struct({ a: S.String })), S.Record({ key: S.String, value: S.String }))))
      .type.toBe<
      S.Schema<
        { a: string } & { readonly [x: string]: string },
        { a: string } & { readonly [x: string]: string },
        never
      >
    >()
  })

  it("transform", () => {
    const transform1 = S.String.pipe(
      S.transform(S.Number, { decode: (s) => s.length, encode: (n) => String(n) })
    )
    expect(transform1.from).type.toBe<typeof S.String>()
    expect(transform1.to).type.toBe<typeof S.Number>()
    transform1.annotations({})
    expect(S.asSchema(transform1))
      .type.toBe<S.Schema<number, string>>()
    expect(
      S.asSchema(
        S.String.pipe(S.transform(S.Number, { strict: false, decode: (s) => s, encode: (n) => n }))
      )
    ).type.toBe<S.Schema<number, string>>()
    S.String.pipe(S.transform(S.Number, { strict: false, decode: (s) => s, encode: (n) => n }))
    when(S.String.pipe).isCalledWith(
      expect(S.transform).type.not.toBeCallableWith(S.Number, (s: any) => s, (n: any) => String(n))
    )
    when(S.String.pipe).isCalledWith(
      expect(S.transform).type.not.toBeCallableWith(S.Number, (s: any) => s.length, (n: any) => n)
    )

    // should receive the fromI value other than the fromA value
    S.transform(
      S.Struct({
        a: S.String,
        b: S.NumberFromString
      }),
      S.Struct({
        a: S.NumberFromString
      }),
      {
        strict: true,
        decode: ({ a, b }, i) => {
          expect(a).type.toBe<string>()
          expect(b).type.toBe<number>()
          expect(i).type.toBe<{ readonly a: string; readonly b: string }>()
          return { a: a + i.b }
        },
        encode: (i, a) => {
          expect(i).type.toBe<{ readonly a: string }>()
          expect(a).type.toBe<{ readonly a: number }>()
          return { ...i, b: a.a * 2 }
        }
      }
    )
  })

  it("transformOrFail", () => {
    const transformOrFail1 = S.String.pipe(
      S.transformOrFail(
        S.Number,
        { decode: (s) => ParseResult.succeed(s.length), encode: (n) => ParseResult.succeed(String(n)) }
      )
    )
    expect(transformOrFail1.from).type.toBe<typeof S.String>()
    expect(transformOrFail1.to).type.toBe<typeof S.Number>()
    transformOrFail1.annotations({})
    expect(S.asSchema(transformOrFail1))
      .type.toBe<S.Schema<number, string>>()
    expect(
      S.asSchema(
        S.String.pipe(
          S.transformOrFail(
            S.Number,
            { strict: false, decode: (s) => ParseResult.succeed(s), encode: (n) => ParseResult.succeed(String(n)) }
          )
        )
      )
    ).type.toBe<S.Schema<number, string>>()
    S.String.pipe(
      S.transformOrFail(
        S.Number,
        { strict: false, decode: (s) => ParseResult.succeed(s), encode: (n) => ParseResult.succeed(String(n)) }
      )
    )
    when(S.String.pipe).isCalledWith(
      expect(S.transformOrFail).type.not.toBeCallableWith(
        S.Number,
        (s: any) => ParseResult.succeed(s),
        (n: any) => ParseResult.succeed(String(n))
      )
    )
    when(S.String.pipe).isCalledWith(
      expect(S.transformOrFail).type.not.toBeCallableWith(
        S.Number,
        (s: any) => ParseResult.succeed(s.length),
        (n: any) => ParseResult.succeed(n)
      )
    )

    // should receive the fromI value other than the fromA value
    S.transformOrFail(
      S.Struct({
        a: S.String,
        b: S.NumberFromString
      }),
      S.Struct({
        a: S.NumberFromString
      }),
      {
        strict: true,
        decode: ({ a, b }, _options, _ast, i) => {
          expect(a).type.toBe<string>()
          expect(b).type.toBe<number>()
          expect(i).type.toBe<{ readonly a: string; readonly b: string }>()
          return ParseResult.succeed({ a: a + i.b })
        },
        encode: (i, _options, _ast, a) => {
          expect(i).type.toBe<{ readonly a: string }>()
          expect(a).type.toBe<{ readonly a: number }>()
          return ParseResult.succeed({ ...i, b: a.a * 2 })
        }
      }
    )
  })

  it("transformLiteral", () => {
    const schema = S.transformLiteral(0, "a")
    expect(S.asSchema(schema)).type.toBe<S.Schema<"a", 0>>()
    expect(schema).type.toBe<S.transformLiteral<"a", 0>>()
    expect(schema.annotations({})).type.toBe<S.transformLiteral<"a", 0>>()
    expect(schema.from).type.toBe<S.Literal<[0]>>()
    expect(schema.to).type.toBe<S.Literal<["a"]>>()
  })

  it("transformLiterals", () => {
    const schema = S.transformLiterals([0, "a"], [1, "b"])
    expect(S.asSchema(schema)).type.toBe<S.Schema<"a" | "b", 0 | 1>>()
    expect(schema).type.toBe<S.Union<[S.transformLiteral<"a", 0>, S.transformLiteral<"b", 1>]>>()
    expect(schema.annotations({})).type.toBe<S.Union<[S.transformLiteral<"a", 0>, S.transformLiteral<"b", 1>]>>()

    expect(S.transformLiterals([0, "a"])).type.toBe<S.transformLiteral<"a", 0>>()
    const pairs = hole<Array<readonly [0 | 1, "a" | "b"]>>()
    expect(S.transformLiterals(...pairs)).type.toBe<S.Schema<"a" | "b", 0 | 1>>()
  })

  it("propertySignature", () => {
    expect(S.propertySignature(S.String)).type.toBe<S.propertySignature<typeof S.String>>()
    expect(S.propertySignature(S.String).annotations({})).type.toBe<S.propertySignature<typeof S.String>>()
  })

  it("PropertySignature.annotations", () => {
    expect(S.optional(S.String).annotations({})).type.toBe<S.optional<typeof S.String>>()
  })

  it("TaggedClass", () => {
    class MyTaggedClass extends S.TaggedClass<MyTaggedClass>()("MyTaggedClass", {
      a: S.String
    }) {}
    expect(hole<ConstructorParameters<typeof MyTaggedClass>>()).type.toBe<
      [props: { readonly a: string }, options?: S.MakeOptions | undefined]
    >()
    expect(hole<S.Schema.Encoded<typeof MyTaggedClass>>()).type.toBe<
      { readonly a: string; readonly _tag: "MyTaggedClass" }
    >()
    expect(hole<S.Schema.Type<typeof MyTaggedClass>>()).type.toBe<MyTaggedClass>()
    class VoidTaggedClass extends S.TaggedClass<VoidTaggedClass>()("VoidTaggedClass", {}) {}
    expect(hole<ConstructorParameters<typeof VoidTaggedClass>>()).type.toBe<
      [props?: void | {}, options?: S.MakeOptions | undefined]
    >()
    expect(S.asSchema(S.Struct(MyTaggedClass.fields)))
      .type.toBe<
      S.Schema<
        { readonly a: string; readonly _tag: "MyTaggedClass" },
        { readonly a: string; readonly _tag: "MyTaggedClass" },
        never
      >
    >()
    expect(hole<Parameters<S.Struct<typeof MyTaggedClass.fields>["make"]>>()).type.toBe<
      [props: { readonly a: string; readonly _tag?: "MyTaggedClass" }, options?: S.MakeOptions | undefined]
    >()
  })

  it("TaggedError", () => {
    class MyTaggedError extends S.TaggedError<MyTaggedError>()("MyTaggedError", {
      a: S.String
    }) {}
    expect(S.asSchema(S.Struct(MyTaggedError.fields)))
      .type.toBe<
      S.Schema<
        { readonly a: string; readonly _tag: "MyTaggedError" },
        { readonly a: string; readonly _tag: "MyTaggedError" },
        never
      >
    >()
    expect(hole<Parameters<S.Struct<typeof MyTaggedError.fields>["make"]>>()).type.toBe<
      [props: { readonly a: string; readonly _tag?: "MyTaggedError" }, options?: S.MakeOptions | undefined]
    >()
  })

  it("TaggedRequest", () => {
    class MyTaggedRequest extends S.TaggedRequest<MyTaggedRequest>()("MyTaggedRequest", {
      failure: S.String,
      success: S.Number,
      payload: { a: S.String }
    }) {}
    expect(S.asSchema(S.Struct(MyTaggedRequest.fields)))
      .type.toBe<
      S.Schema<
        { readonly a: string; readonly _tag: "MyTaggedRequest" },
        { readonly a: string; readonly _tag: "MyTaggedRequest" },
        never
      >
    >()
    expect(hole<Parameters<S.Struct<typeof MyTaggedRequest.fields>["make"]>>()).type.toBe<
      [props: { readonly a: string; readonly _tag?: "MyTaggedRequest" }, options?: S.MakeOptions | undefined]
    >()
  })

  it("TypeLiteral", () => {
    expect(S.asSchema(hole<S.TypeLiteral<{ a: typeof S.String }, []>>()))
      .type.toBe<S.Schema<{ readonly a: string }, { readonly a: string }>>()
    expect(S.asSchema(hole<S.TypeLiteral<{}, [{ key: typeof S.String; value: typeof S.Unknown }]>>()))
      .type.toBe<S.Schema<{ readonly [x: string]: unknown }, { readonly [x: string]: unknown }>>()
    expect(
      S.asSchema(
        hole<
          S.TypeLiteral<
            {},
            [{ key: typeof S.String; value: typeof S.String }, { key: typeof S.Symbol; value: typeof S.Number }]
          >
        >()
      )
    ).type.toBe<
      S.Schema<
        { readonly [x: string]: string; readonly [x: symbol]: number },
        { readonly [x: string]: never },
        never
      >
    >()
    expect(
      S.asSchema(hole<S.TypeLiteral<{ a: typeof S.String }, [{ key: typeof S.String; value: typeof S.Unknown }]>>())
    )
      .type.toBe<
      S.Schema<
        { readonly [x: string]: unknown; readonly a: string },
        { readonly [x: string]: unknown; readonly a: string },
        never
      >
    >()
  })

  it("withConstructorDefault", () => {
    when(S.propertySignature(S.String).pipe).isCalledWith(
      expect(S.withConstructorDefault).type.not.toBeCallableWith(() => 1)
    )
    expect(S.propertySignature(S.String).pipe(S.withConstructorDefault(() => "a")))
      .type.toBe<S.PropertySignature<":", string, never, ":", string, true>>()
    expect(S.withConstructorDefault(S.propertySignature(S.String), () => "a"))
      .type.toBe<S.PropertySignature<":", string, never, ":", string, true>>()
  })

  it("withDecodingDefault", () => {
    when(S.Struct).isCalledWith({
      a: when(S.optional(S.String).pipe).isCalledWith(
        S.withConstructorDefault(() => undefined),
        expect(S.withDecodingDefault).type.not.toBeCallableWith(() => "")
      )
    })
    when(S.Struct).isCalledWith({
      a: when(S.optional(S.String).pipe).isCalledWith(
        expect(S.withDecodingDefault).type.not.toBeCallableWith(() => undefined)
      )
    })
    expect(
      S.asSchema(S.Struct({ a: S.optional(S.String).pipe(S.withDecodingDefault(() => "")) }))
    ).type.toBe<
      S.Schema<{ readonly a: string }, { readonly a?: string | undefined }>
    >()
    expect(S.Struct({ a: S.optional(S.String).pipe(S.withDecodingDefault(() => "")) }))
      .type.toBe<S.Struct<{ a: S.PropertySignature<":", string, never, "?:", string | undefined, false> }>>()
  })

  it("withDefaults", () => {
    when(S.Struct).isCalledWith({
      a: when(S.optional(S.String).pipe).isCalledWith(
        expect(S.withDefaults).type.not.toBeCallableWith({
          decoding: () => undefined,
          constructor: () => undefined
        })
      )
    })
    expect(
      S.asSchema(
        S.Struct({ a: S.optional(S.String).pipe(S.withDefaults({ decoding: () => "", constructor: () => "" })) })
      )
    ).type.toBe<
      S.Schema<{ readonly a: string }, { readonly a?: string | undefined }>
    >()
    expect(
      S.Struct({ a: S.optional(S.String).pipe(S.withDefaults({ decoding: () => "", constructor: () => "" })) })
    ).type.toBe<S.Struct<{ a: S.PropertySignature<":", string, never, "?:", string | undefined, true> }>>()
    const make4 =
      S.Struct({ a: S.optional(S.String).pipe(S.withDefaults({ decoding: () => "", constructor: () => "" })) }).make
    expect(hole<Parameters<typeof make4>[0]>()).type.toBe<void | { readonly a?: string } | undefined>()
  })

  it("Schema.AsSchema", () => {
    const MyStruct = <X extends S.Schema.All>(x: X) => S.Struct({ x })
    type MyStructReturnType<X extends S.Schema.All> = S.Schema.Type<ReturnType<typeof MyStruct<X>>>
    function _AsSchemaTest1<X extends S.Schema.All>(obj: MyStructReturnType<S.Schema.AsSchema<X>>) {
      expect(obj.x).type.toBe<S.Schema.Type<X>>()
    }
    type XStruct<X extends S.Schema.All> = S.Schema<
      S.Struct.Type<{
        expectedVersion: typeof S.Number
        props: X
      }>,
      S.Struct.Encoded<{
        expectedVersion: typeof S.Number
        props: X
      }>
    >
    const _AsSchemaTest2 = <X extends S.Schema.All>(
      domainEvent: S.Schema.Type<XStruct<S.Schema.AsSchema<X>>>
    ) => {
      expect(domainEvent.expectedVersion).type.toBe<number>()
      expect(domainEvent.props).type.toBe<S.Schema.Type<X>>()
    }
  })

  it("Schema.is", () => {
    expect(hole<Array<string | number>>().filter(S.is(S.String)))
      .type.toBe<Array<string>>()
    expect(hole<Array<string | number>>().find(S.is(S.String)))
      .type.toBe<string | undefined>()
  })

  it("TaggedStruct", () => {
    expect(S.tag("A")).type.toBe<S.tag<"A">>()
    const MyTaggedStruct = S.TaggedStruct("Product", {
      category: S.tag("Electronics"),
      name: S.String,
      price: S.Number
    })
    expect(S.asSchema(MyTaggedStruct))
      .type.toBe<
      S.Schema<
        { readonly _tag: "Product"; readonly name: string; readonly category: "Electronics"; readonly price: number },
        { readonly _tag: "Product"; readonly name: string; readonly category: "Electronics"; readonly price: number },
        never
      >
    >()
    expect(hole<Parameters<typeof MyTaggedStruct["make"]>>()).type.toBe<
      [
        props: {
          readonly _tag?: "Product"
          readonly name: string
          readonly category?: "Electronics"
          readonly price: number
        },
        options?: S.MakeOptions | undefined
      ]
    >()
  })

  describe("Optional Primitives", () => {
    it("optionalToOptional", () => {
      expect(
        S.asSchema(S.Struct({ a: S.optionalToOptional(aContext, S.String, { decode: (o) => o, encode: (o) => o }) }))
      ).type.toBe<S.Schema<{ readonly a?: string }, { readonly a?: string }, "a">>()
      expect(
        S.Struct({ a: S.optionalToOptional(aContext, S.String, { decode: (o) => o, encode: (o) => o }) })
      ).type.toBe<S.Struct<{ a: S.PropertySignature<"?:", string, never, "?:", string, false, "a"> }>>()
    })

    it("optionalToRequired", () => {
      expect(
        S.asSchema(
          S.Struct({
            a: S.optionalToRequired(aContext, S.String, { decode: Option.getOrElse(() => ""), encode: Option.some })
          })
        )
      ).type.toBe<S.Schema<{ readonly a: string }, { readonly a?: string }, "a">>()
      expect(
        S.Struct({
          a: S.optionalToRequired(aContext, S.String, { decode: Option.getOrElse(() => ""), encode: Option.some })
        })
      ).type.toBe<S.Struct<{ a: S.PropertySignature<":", string, never, "?:", string, false, "a"> }>>()
    })

    it("requiredToOptional", () => {
      expect(
        S.asSchema(
          S.Struct({
            a: S.requiredToOptional(aContext, S.String, { decode: Option.some, encode: Option.getOrElse(() => "") })
          })
        )
      ).type.toBe<S.Schema<{ readonly a?: string }, { readonly a: string }, "a">>()
      expect(
        S.Struct({
          a: S.requiredToOptional(aContext, S.String, { decode: Option.some, encode: Option.getOrElse(() => "") })
        })
      ).type.toBe<S.Struct<{ a: S.PropertySignature<"?:", string, never, ":", string, false, "a"> }>>()
    })
  })

  it("TemplateLiteralParser", () => {
    expect(S.asSchema(S.TemplateLiteralParser("a")))
      .type.toBe<S.Schema<readonly ["a"], "a">>()
    expect(S.asSchema(S.TemplateLiteralParser(S.Literal("a"))))
      .type.toBe<S.Schema<readonly ["a"], "a">>()
    expect(S.asSchema(S.TemplateLiteralParser(1)))
      .type.toBe<S.Schema<readonly [1], "1">>()
    expect(S.asSchema(S.TemplateLiteralParser(S.Literal(1))))
      .type.toBe<S.Schema<readonly [1], "1">>()
    expect(S.asSchema(S.TemplateLiteralParser(S.String)))
      .type.toBe<S.Schema<readonly [string], string>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.Number)))
      .type.toBe<S.Schema<readonly [number], `${number}`>>()
    expect(S.asSchema(S.TemplateLiteralParser("a", "b")))
      .type.toBe<S.Schema<readonly ["a", "b"], "ab">>()
    expect(S.asSchema(S.TemplateLiteralParser(S.Literal("a"), S.Literal("b"))))
      .type.toBe<S.Schema<readonly ["a", "b"], "ab">>()
    expect(S.asSchema(S.TemplateLiteralParser("a", S.String)))
      .type.toBe<S.Schema<readonly ["a", string], `a${string}`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.Literal("a"), S.String)))
      .type.toBe<S.Schema<readonly ["a", string], `a${string}`>>()
    expect(S.asSchema(S.TemplateLiteralParser("a", S.Number)))
      .type.toBe<S.Schema<readonly ["a", number], `a${number}`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.Literal("a"), S.Number)))
      .type.toBe<S.Schema<readonly ["a", number], `a${number}`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.String, "a")))
      .type.toBe<S.Schema<readonly [string, "a"], `${string}a`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.String, S.Literal("a"))))
      .type.toBe<S.Schema<readonly [string, "a"], `${string}a`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.Number, "a")))
      .type.toBe<S.Schema<readonly [number, "a"], `${number}a`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.Number, S.Literal("a"))))
      .type.toBe<S.Schema<readonly [number, "a"], `${number}a`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.String, 0)))
      .type.toBe<S.Schema<readonly [string, 0], `${string}0`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.String, true)))
      .type.toBe<S.Schema<readonly [string, true], `${string}true`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.String, null)))
      .type.toBe<S.Schema<readonly [string, null], `${string}null`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.String, 1n)))
      .type.toBe<S.Schema<readonly [string, 1n], `${string}1`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.String, S.Literal("a", 0))))
      .type.toBe<S.Schema<readonly [string, 0 | "a"], `${string}a` | `${string}0`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.String, S.Literal("/"), S.Number)))
      .type.toBe<S.Schema<readonly [string, "/", number], `${string}/${number}`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.String, "/", S.Number)))
      .type.toBe<S.Schema<readonly [string, "/", number], `${string}/${number}`>>()
    const EmailLocaleIDs = S.Literal("welcome_email", "email_heading")
    const FooterLocaleIDs = S.Literal("footer_title", "footer_sendoff")
    expect(S.asSchema(S.TemplateLiteralParser(S.Union(EmailLocaleIDs, FooterLocaleIDs), S.Literal("_id"))))
      .type.toBe<
      S.Schema<
        readonly ["welcome_email" | "email_heading" | "footer_title" | "footer_sendoff", "_id"],
        "welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id",
        never
      >
    >()
    expect(S.asSchema(S.TemplateLiteralParser(S.Union(EmailLocaleIDs, FooterLocaleIDs), "_id")))
      .type.toBe<
      S.Schema<
        readonly ["welcome_email" | "email_heading" | "footer_title" | "footer_sendoff", "_id"],
        "welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id",
        never
      >
    >()
    expect(S.asSchema(S.TemplateLiteralParser(S.String.pipe(S.brand("MyBrand")))))
      .type.toBe<S.Schema<readonly [string & Brand.Brand<"MyBrand">], string>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.Number.pipe(S.brand("MyBrand")))))
      .type.toBe<S.Schema<readonly [number & Brand.Brand<"MyBrand">], `${number}`>>()
    expect(S.asSchema(S.TemplateLiteralParser("a", S.String.pipe(S.brand("MyBrand")))))
      .type.toBe<S.Schema<readonly ["a", string & Brand.Brand<"MyBrand">], `a${string}`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.Literal("a"), S.String.pipe(S.brand("MyBrand")))))
      .type.toBe<S.Schema<readonly ["a", string & Brand.Brand<"MyBrand">], `a${string}`>>()
    expect(
      S.asSchema(
        S.TemplateLiteralParser(S.Literal("a").pipe(S.brand("L")), S.String.pipe(S.brand("MyBrand")))
      )
    ).type.toBe<
      S.Schema<readonly [("a" & Brand.Brand<"L">), string & Brand.Brand<"MyBrand">], `a${string}`>
    >()
    expect(S.asSchema(S.TemplateLiteralParser("a", S.Number.pipe(S.brand("MyBrand")))))
      .type.toBe<S.Schema<readonly ["a", number & Brand.Brand<"MyBrand">], `a${number}`>>()
    expect(S.asSchema(S.TemplateLiteralParser(S.Literal("a"), S.Number.pipe(S.brand("MyBrand")))))
      .type.toBe<S.Schema<readonly ["a", number & Brand.Brand<"MyBrand">], `a${number}`>>()
    expect(S.asSchema(S.TemplateLiteralParser("a", S.Union(S.Number, S.String))))
      .type.toBe<S.Schema<readonly ["a", string | number], `a${string}` | `a${number}`>>()
  })

  describe("Filters", () => {
    it("filter", () => {
      S.String.pipe(S.filter((s, options, ast) => {
        expect(s).type.toBe<string>()
        expect(options).type.toBe<SchemaAST.ParseOptions>()
        expect(ast).type.toBe<SchemaAST.Refinement>()
        return undefined
      }))
      const predicateFilter1 = (u: unknown): boolean => typeof u === "string"
      const FromFilter = S.Union(S.String, S.Number)
      expect(pipe(FromFilter, S.filter(predicateFilter1)))
        .type.toBe<S.filter<S.Union<[typeof S.String, typeof S.Number]>>>()
      const FromRefinement = S.Struct({
        a: S.optionalWith(S.String, { exact: true }),
        b: S.optionalWith(S.Number, { exact: true })
      })
      expect(pipe(FromRefinement, S.filter(S.is(S.Struct({ b: S.Number })))))
        .type.toBe<
        S.refine<
          { readonly a?: string; readonly b?: number } & { readonly b: number },
          S.Schema<unknown, { readonly a?: string; readonly b?: number }>
        >
      >()
      const LiteralFilter = S.Literal("a", "b")
      const predicateFilter2 = (u: unknown): u is "a" => typeof u === "string" && u === "a"
      expect(pipe(LiteralFilter, S.filter(predicateFilter2)))
        .type.toBe<S.refine<"a", S.Schema<unknown, "a" | "b">>>()
      expect(pipe(LiteralFilter, S.filter(S.is(S.Literal("a")))))
        .type.toBe<S.refine<"a", S.Schema<unknown, "a" | "b">>>()
      expect(pipe(LiteralFilter, S.filter(S.is(S.Literal("c")))))
        .type.toBe<S.refine<never, S.Schema<unknown, "a" | "b">>>()
      const UnionFilter = hole<
        S.Schema<
          { readonly a: string } | { readonly b: string },
          { readonly a: string } | { readonly b: string },
          never
        >
      >()
      expect(pipe(UnionFilter, S.filter(S.is(S.Struct({ b: S.String })))))
        .type.toBe<
        S.refine<
          ({ readonly a: string } | { readonly b: string }) & { readonly b: string },
          S.Schema<unknown, { readonly a: string } | { readonly b: string }>
        >
      >()
      expect(pipe(S.Number, S.filter((n): n is number & Brand.Brand<"MyNumber"> => n > 0)))
        .type.toBe<S.refine<number & Brand.Brand<"MyNumber">, S.Schema<number>>>()
      // annotations
      pipe(
        S.String,
        S.filter(
          (s) => {
            expect(s).type.toBe<string>()
            return true
          },
          {
            arbitrary: (from, ctx) => (fc) => {
              expect(from).type.toBe<Arbitrary.LazyArbitrary<string>>()
              expect(ctx).type.toBe<Arbitrary.ArbitraryGenerationContext>()
              return fc.string()
            },
            pretty: (from) => (s) => {
              expect(from).type.toBe<Pretty.Pretty<string>>()
              expect(s).type.toBe<string>()
              return s
            },
            equivalence: (from) => (a, b) => {
              expect(from).type.toBe<Equivalence.Equivalence<string>>()
              expect(a).type.toBe<string>()
              expect(b).type.toBe<string>()
              return true
            }
          }
        )
      )
      pipe(
        S.String,
        S.filter((s) => {
          expect(s).type.toBe<string>()
          return true
        })
      ).annotations({
        arbitrary: (...x) => (fc) => {
          expect(x).type.toBe<Array<any>>()
          return fc.string()
        },
        pretty: (...x) => (s) => {
          expect(x).type.toBe<Array<any>>()
          return s
        },
        equivalence: (...x) => (a, b) => {
          expect(x).type.toBe<Array<any>>()
          expect(a).type.toBe<string>()
          expect(b).type.toBe<string>()
          return true
        }
      })
    })

    describe("String Filters", () => {
      it("maxLength", () => {
        when(pipe).isCalledWith(S.Null, expect(S.maxLength).type.not.toBeCallableWith(5))
        // should allow generic context
        const _f1 = <A extends string>(schema: S.Schema<A>) => schema.pipe(S.maxLength(5))
        const _f2 = <A extends string>(schema: S.Schema<A>) =>
          when(schema.pipe).isCalledWith(
            expect(S.greaterThan).type.not.toBeCallableWith(5)
          )
        // should allow string subtypes
        pipe(
          S.TemplateLiteral("a", S.String),
          S.maxLength(5, {
            pretty: () => (s) => {
              expect(s).type.toBe<`a${string}`>()
              return "-"
            }
          })
        )

        const schema = pipe(
          S.String,
          S.maxLength(5, {
            pretty: () => (s) => {
              expect(s).type.toBe<string>()
              return "-"
            }
          })
        )
        expect(S.asSchema(schema)).type.toBe<S.Schema<string>>()
        expect(schema).type.toBe<S.filter<typeof S.String>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.String>>()
        expect(schema.from).type.toBe<typeof S.String>()
      })

      it("minLength", () => {
        when(pipe).isCalledWith(S.Null, expect(S.minLength).type.not.toBeCallableWith(5))

        const schema = pipe(S.String, S.minLength(5))
        expect(S.asSchema(schema)).type.toBe<S.Schema<string>>()
        expect(schema).type.toBe<S.filter<typeof S.String>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.String>>()
        expect(schema.from).type.toBe<typeof S.String>()
      })

      it("length", () => {
        when(pipe).isCalledWith(S.Null, expect(S.length).type.not.toBeCallableWith(5))

        const schema = pipe(S.String, S.length(5))
        expect(S.asSchema(schema)).type.toBe<S.Schema<string>>()
        expect(schema).type.toBe<S.filter<typeof S.String>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.String>>()
        expect(schema.from).type.toBe<typeof S.String>()
      })

      it("pattern", () => {
        when(pipe).isCalledWith(S.Null, expect(S.pattern).type.not.toBeCallableWith(/a/))

        const schema = pipe(S.String, S.pattern(/a/))
        expect(S.asSchema(schema)).type.toBe<S.Schema<string>>()
        expect(schema).type.toBe<S.filter<typeof S.String>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.String>>()
        expect(schema.from).type.toBe<typeof S.String>()
      })

      it("startsWith", () => {
        when(pipe).isCalledWith(S.Null, expect(S.startsWith).type.not.toBeCallableWith("a"))

        const schema = pipe(S.String, S.startsWith("a"))
        expect(S.asSchema(schema)).type.toBe<S.Schema<string>>()
        expect(schema).type.toBe<S.filter<typeof S.String>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.String>>()
        expect(schema.from).type.toBe<typeof S.String>()
      })

      it("endsWith", () => {
        when(pipe).isCalledWith(S.Null, expect(S.endsWith).type.not.toBeCallableWith("a"))

        const schema = pipe(S.String, S.endsWith("a"))
        expect(S.asSchema(schema)).type.toBe<S.Schema<string>>()
        expect(schema).type.toBe<S.filter<typeof S.String>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.String>>()
        expect(schema.from).type.toBe<typeof S.String>()
      })

      it("includes", () => {
        when(pipe).isCalledWith(S.Null, expect(S.includes).type.not.toBeCallableWith("a"))

        const schema = pipe(S.String, S.includes("a"))
        expect(S.asSchema(schema)).type.toBe<S.Schema<string>>()
        expect(schema).type.toBe<S.filter<typeof S.String>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.String>>()
        expect(schema.from).type.toBe<typeof S.String>()
      })

      it("lowercased", () => {
        when(pipe).isCalledWith(S.Null, expect(S.lowercased).type.not.toBeCallableWith())

        const schema = pipe(S.String, S.lowercased())
        expect(S.asSchema(schema)).type.toBe<S.Schema<string>>()
        expect(schema).type.toBe<S.filter<typeof S.String>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.String>>()
        expect(schema.from).type.toBe<typeof S.String>()
      })

      it("uppercased", () => {
        when(pipe).isCalledWith(S.Null, expect(S.uppercased).type.not.toBeCallableWith())

        const schema = pipe(S.String, S.uppercased())
        expect(S.asSchema(schema)).type.toBe<S.Schema<string>>()
        expect(schema).type.toBe<S.filter<typeof S.String>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.String>>()
        expect(schema.from).type.toBe<typeof S.String>()
      })

      it("capitalized", () => {
        when(pipe).isCalledWith(S.Null, expect(S.capitalized).type.not.toBeCallableWith())

        const schema = pipe(S.String, S.capitalized())
        expect(S.asSchema(schema)).type.toBe<S.Schema<string>>()
        expect(schema).type.toBe<S.filter<typeof S.String>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.String>>()
        expect(schema.from).type.toBe<typeof S.String>()
      })

      it("uncapitalized", () => {
        when(pipe).isCalledWith(S.Null, expect(S.uncapitalized).type.not.toBeCallableWith())

        const schema = pipe(S.String, S.uncapitalized())
        expect(S.asSchema(schema)).type.toBe<S.Schema<string>>()
        expect(schema).type.toBe<S.filter<typeof S.String>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.String>>()
        expect(schema.from).type.toBe<typeof S.String>()
      })

      it("nonEmptyString", () => {
        when(pipe).isCalledWith(S.Null, expect(S.nonEmptyString).type.not.toBeCallableWith())

        const schema = pipe(S.String, S.nonEmptyString())
        expect(S.asSchema(schema)).type.toBe<S.Schema<string>>()
        expect(schema).type.toBe<S.filter<typeof S.String>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.String>>()
        expect(schema.from).type.toBe<typeof S.String>()
      })

      it("trimmed", () => {
        when(pipe).isCalledWith(S.Null, expect(S.trimmed).type.not.toBeCallableWith())

        const schema = pipe(S.String, S.trimmed())
        expect(S.asSchema(schema)).type.toBe<S.Schema<string>>()
        expect(schema).type.toBe<S.filter<typeof S.String>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.String>>()
        expect(schema.from).type.toBe<typeof S.String>()
      })
    })

    describe("Number Filters", () => {
      it("finite", () => {
        when(pipe).isCalledWith(S.Null, expect(S.finite).type.not.toBeCallableWith())

        const schema = pipe(S.Number, S.finite())
        expect(S.asSchema(schema)).type.toBe<S.Schema<number>>()
        expect(schema).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.from).type.toBe<typeof S.Number>()
      })

      it("greaterThan", () => {
        when(pipe).isCalledWith(S.Null, expect(S.greaterThan).type.not.toBeCallableWith(5))

        const schema = pipe(S.Number, S.greaterThan(5))
        expect(S.asSchema(schema)).type.toBe<S.Schema<number>>()
        expect(schema).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.from).type.toBe<typeof S.Number>()
      })

      it("greaterThanOrEqualTo", () => {
        when(pipe).isCalledWith(S.Null, expect(S.greaterThanOrEqualTo).type.not.toBeCallableWith(5))

        const schema = pipe(S.Number, S.greaterThanOrEqualTo(5))
        expect(S.asSchema(schema)).type.toBe<S.Schema<number>>()
        expect(schema).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.from).type.toBe<typeof S.Number>()
      })

      it("lessThan", () => {
        when(pipe).isCalledWith(S.Null, expect(S.lessThan).type.not.toBeCallableWith(5))

        const schema = pipe(S.Number, S.lessThan(5))
        expect(S.asSchema(schema)).type.toBe<S.Schema<number>>()
        expect(schema).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.from).type.toBe<typeof S.Number>()
      })

      it("lessThanOrEqualTo", () => {
        when(pipe).isCalledWith(S.Null, expect(S.lessThanOrEqualTo).type.not.toBeCallableWith(5))

        const schema = pipe(S.Number, S.lessThanOrEqualTo(5))
        expect(S.asSchema(schema)).type.toBe<S.Schema<number>>()
        expect(schema).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.from).type.toBe<typeof S.Number>()
      })

      it("int", () => {
        when(pipe).isCalledWith(S.Null, expect(S.int).type.not.toBeCallableWith())

        const schema = pipe(S.Number, S.int())
        expect(S.asSchema(schema)).type.toBe<S.Schema<number>>()
        expect(schema).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.from).type.toBe<typeof S.Number>()
      })

      it("multipleOf", () => {
        when(pipe).isCalledWith(S.Null, expect(S.multipleOf).type.not.toBeCallableWith(5))

        const schema = pipe(S.Number, S.multipleOf(5))
        expect(S.asSchema(schema)).type.toBe<S.Schema<number>>()
        expect(schema).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.from).type.toBe<typeof S.Number>()
      })

      it("between", () => {
        when(pipe).isCalledWith(S.Null, expect(S.between).type.not.toBeCallableWith(1, 5))

        const schema = pipe(S.Number, S.between(1, 5))
        expect(S.asSchema(schema)).type.toBe<S.Schema<number>>()
        expect(schema).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.from).type.toBe<typeof S.Number>()
      })

      it("nonNaN", () => {
        when(pipe).isCalledWith(S.Null, expect(S.nonNaN).type.not.toBeCallableWith())

        const schema = pipe(S.Number, S.nonNaN())
        expect(S.asSchema(schema)).type.toBe<S.Schema<number>>()
        expect(schema).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.from).type.toBe<typeof S.Number>()
      })

      it("positive", () => {
        when(pipe).isCalledWith(S.Null, expect(S.positive).type.not.toBeCallableWith())

        const schema = pipe(S.Number, S.positive())
        expect(S.asSchema(schema)).type.toBe<S.Schema<number>>()
        expect(schema).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.from).type.toBe<typeof S.Number>()
      })

      it("negative", () => {
        when(pipe).isCalledWith(S.Null, expect(S.negative).type.not.toBeCallableWith())

        const schema = pipe(S.Number, S.negative())
        expect(S.asSchema(schema)).type.toBe<S.Schema<number>>()
        expect(schema).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.from).type.toBe<typeof S.Number>()
      })

      it("nonPositive", () => {
        when(pipe).isCalledWith(S.Null, expect(S.nonPositive).type.not.toBeCallableWith())

        const schema = pipe(S.Number, S.nonPositive())
        expect(S.asSchema(schema)).type.toBe<S.Schema<number>>()
        expect(schema).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.from).type.toBe<typeof S.Number>()
      })

      it("nonNegative", () => {
        when(pipe).isCalledWith(S.Null, expect(S.nonNegative).type.not.toBeCallableWith())

        const schema = pipe(S.Number, S.nonNegative())
        expect(S.asSchema(schema)).type.toBe<S.Schema<number>>()
        expect(schema).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.Number>>()
        expect(schema.from).type.toBe<typeof S.Number>()
      })
    })

    describe("BigInt Filters", () => {
      it("greaterThanBigInt", () => {
        when(pipe).isCalledWith(S.Null, expect(S.greaterThanBigInt).type.not.toBeCallableWith(5n))

        const schema = pipe(S.BigIntFromSelf, S.greaterThanBigInt(5n))
        expect(S.asSchema(schema)).type.toBe<S.Schema<bigint>>()
        expect(schema).type.toBe<S.filter<typeof S.BigIntFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.BigIntFromSelf>>()
        expect(schema.from).type.toBe<typeof S.BigIntFromSelf>()
      })

      it("greaterThanOrEqualToBigInt", () => {
        when(pipe).isCalledWith(S.Null, expect(S.greaterThanOrEqualToBigInt).type.not.toBeCallableWith(5n))

        const schema = pipe(S.BigIntFromSelf, S.greaterThanOrEqualToBigInt(5n))
        expect(S.asSchema(schema)).type.toBe<S.Schema<bigint>>()
        expect(schema).type.toBe<S.filter<typeof S.BigIntFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.BigIntFromSelf>>()
        expect(schema.from).type.toBe<typeof S.BigIntFromSelf>()
      })

      it("lessThanBigInt", () => {
        when(pipe).isCalledWith(S.Null, expect(S.lessThanBigInt).type.not.toBeCallableWith(5n))

        const schema = pipe(S.BigIntFromSelf, S.lessThanBigInt(5n))
        expect(S.asSchema(schema)).type.toBe<S.Schema<bigint>>()
        expect(schema).type.toBe<S.filter<typeof S.BigIntFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.BigIntFromSelf>>()
        expect(schema.from).type.toBe<typeof S.BigIntFromSelf>()
      })

      it("lessThanOrEqualToBigInt", () => {
        when(pipe).isCalledWith(S.Null, expect(S.lessThanOrEqualToBigInt).type.not.toBeCallableWith(5n))

        const schema = pipe(S.BigIntFromSelf, S.lessThanOrEqualToBigInt(5n))
        expect(S.asSchema(schema)).type.toBe<S.Schema<bigint>>()
        expect(schema).type.toBe<S.filter<typeof S.BigIntFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.BigIntFromSelf>>()
        expect(schema.from).type.toBe<typeof S.BigIntFromSelf>()
      })

      it("betweenBigInt", () => {
        when(pipe).isCalledWith(S.Null, expect(S.betweenBigInt).type.not.toBeCallableWith(1n, 5n))

        const schema = pipe(S.BigIntFromSelf, S.betweenBigInt(1n, 5n))
        expect(S.asSchema(schema)).type.toBe<S.Schema<bigint>>()
        expect(schema).type.toBe<S.filter<typeof S.BigIntFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.BigIntFromSelf>>()
        expect(schema.from).type.toBe<typeof S.BigIntFromSelf>()
      })

      it("positiveBigInt", () => {
        when(pipe).isCalledWith(S.Null, expect(S.positiveBigInt).type.not.toBeCallableWith())

        const schema = pipe(S.BigIntFromSelf, S.positiveBigInt())
        expect(S.asSchema(schema)).type.toBe<S.Schema<bigint>>()
        expect(schema).type.toBe<S.filter<typeof S.BigIntFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.BigIntFromSelf>>()
        expect(schema.from).type.toBe<typeof S.BigIntFromSelf>()
      })

      it("negativeBigInt", () => {
        when(pipe).isCalledWith(S.Null, expect(S.negativeBigInt).type.not.toBeCallableWith())

        const schema = pipe(S.BigIntFromSelf, S.negativeBigInt())
        expect(S.asSchema(schema)).type.toBe<S.Schema<bigint>>()
        expect(schema).type.toBe<S.filter<typeof S.BigIntFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.BigIntFromSelf>>()
        expect(schema.from).type.toBe<typeof S.BigIntFromSelf>()
      })

      it("nonNegativeBigInt", () => {
        expect(pipe).type.not.toBeCallableWith(S.Null, S.nonNegativeBigInt())

        const schema = pipe(S.BigIntFromSelf, S.nonNegativeBigInt())
        expect(S.asSchema(schema)).type.toBe<S.Schema<bigint>>()
        expect(schema).type.toBe<S.filter<typeof S.BigIntFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.BigIntFromSelf>>()
        expect(schema.from).type.toBe<typeof S.BigIntFromSelf>()
      })

      it("nonPositiveBigInt", () => {
        expect(pipe).type.not.toBeCallableWith(S.Null, S.negativeBigInt())

        const schema = pipe(S.BigIntFromSelf, S.nonPositiveBigInt())
        expect(S.asSchema(schema)).type.toBe<S.Schema<bigint>>()
        expect(schema).type.toBe<S.filter<typeof S.BigIntFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.BigIntFromSelf>>()
        expect(schema.from).type.toBe<typeof S.BigIntFromSelf>()
      })
    })

    describe("Duration filters", () => {
      it("lessThanDuration", () => {
        when(pipe).isCalledWith(S.Null, expect(S.lessThanDuration).type.not.toBeCallableWith("10 millis"))

        const schema = pipe(S.DurationFromSelf, S.lessThanDuration("10 millis"))
        expect(S.asSchema(schema)).type.toBe<S.Schema<Duration.Duration>>()
        expect(schema).type.toBe<S.filter<typeof S.DurationFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.DurationFromSelf>>()
        expect(schema.from).type.toBe<typeof S.DurationFromSelf>()
      })

      it("lessThanOrEqualToDuration", () => {
        when(pipe).isCalledWith(S.Null, expect(S.lessThanOrEqualToDuration).type.not.toBeCallableWith("10 millis"))

        const schema = pipe(S.DurationFromSelf, S.lessThanOrEqualToDuration("10 millis"))
        expect(S.asSchema(schema)).type.toBe<S.Schema<Duration.Duration>>()
        expect(schema).type.toBe<S.filter<typeof S.DurationFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.DurationFromSelf>>()
        expect(schema.from).type.toBe<typeof S.DurationFromSelf>()
      })

      it("greaterThanDuration", () => {
        when(pipe).isCalledWith(S.Null, expect(S.greaterThanDuration).type.not.toBeCallableWith("10 millis"))

        const schema = pipe(S.DurationFromSelf, S.greaterThanDuration("10 millis"))
        expect(S.asSchema(schema)).type.toBe<S.Schema<Duration.Duration>>()
        expect(schema).type.toBe<S.filter<typeof S.DurationFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.DurationFromSelf>>()
        expect(schema.from).type.toBe<typeof S.DurationFromSelf>()
      })

      it("greaterThanOrEqualToDuration", () => {
        when(pipe).isCalledWith(S.Null, expect(S.greaterThanOrEqualToDuration).type.not.toBeCallableWith("10 millis"))

        const schema = pipe(S.DurationFromSelf, S.greaterThanOrEqualToDuration("10 millis"))
        expect(S.asSchema(schema)).type.toBe<S.Schema<Duration.Duration>>()
        expect(schema).type.toBe<S.filter<typeof S.DurationFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.DurationFromSelf>>()
        expect(schema.from).type.toBe<typeof S.DurationFromSelf>()
      })

      it("betweenDuration", () => {
        when(pipe).isCalledWith(S.Null, expect(S.betweenDuration).type.not.toBeCallableWith("10 millis", "50 millis"))

        const schema = pipe(S.DurationFromSelf, S.betweenDuration("10 millis", "50 millis"))
        expect(S.asSchema(schema)).type.toBe<S.Schema<Duration.Duration>>()
        expect(schema).type.toBe<S.filter<typeof S.DurationFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.DurationFromSelf>>()
        expect(schema.from).type.toBe<typeof S.DurationFromSelf>()
      })
    })

    describe("Array Filters", () => {
      describe("Array", () => {
        it("minItems", () => {
          when(pipe).isCalledWith(S.Null, expect(S.minItems).type.not.toBeCallableWith(2))

          const schema = S.Array(S.String).pipe(S.minItems(2))
          expect(S.asSchema(schema)).type.toBe<S.Schema<ReadonlyArray<string>>>()
          expect(schema).type.toBe<S.filter<S.Array$<typeof S.String>>>()
          expect(schema.annotations({})).type.toBe<S.filter<S.Array$<typeof S.String>>>()
          expect(schema.from).type.toBe<S.Array$<typeof S.String>>()
        })

        it("maxItems", () => {
          when(pipe).isCalledWith(S.Null, expect(S.maxItems).type.not.toBeCallableWith(2))

          const schema = S.Array(S.String).pipe(S.maxItems(2))
          expect(S.asSchema(schema)).type.toBe<S.Schema<ReadonlyArray<string>>>()
          expect(schema).type.toBe<S.filter<S.Array$<typeof S.String>>>()
          expect(schema.annotations({})).type.toBe<S.filter<S.Array$<typeof S.String>>>()
          expect(schema.from).type.toBe<S.Array$<typeof S.String>>()
        })

        it("itemsCount", () => {
          when(pipe).isCalledWith(S.Null, expect(S.itemsCount).type.not.toBeCallableWith(2))

          const schema = S.Array(S.String).pipe(S.itemsCount(2))
          expect(S.asSchema(schema)).type.toBe<S.Schema<ReadonlyArray<string>>>()
          expect(schema).type.toBe<S.filter<S.Array$<typeof S.String>>>()
          expect(schema.annotations({})).type.toBe<S.filter<S.Array$<typeof S.String>>>()
          expect(schema.from).type.toBe<S.Array$<typeof S.String>>()
        })
      })

      describe("NonEmptyArray", () => {
        it("minItems", () => {
          const schema = S.NonEmptyArray(S.String).pipe(S.minItems(2))
          expect(S.asSchema(schema)).type.toBe<S.Schema<readonly [string, ...Array<string>]>>()
          expect(schema).type.toBe<S.filter<S.NonEmptyArray<typeof S.String>>>()
          expect(schema.annotations({})).type.toBe<S.filter<S.NonEmptyArray<typeof S.String>>>()
          expect(schema.from).type.toBe<S.NonEmptyArray<typeof S.String>>()
        })

        it("maxItems", () => {
          const schema = S.NonEmptyArray(S.String).pipe(S.maxItems(2))
          expect(S.asSchema(schema)).type.toBe<S.Schema<readonly [string, ...Array<string>]>>()
          expect(schema).type.toBe<S.filter<S.NonEmptyArray<typeof S.String>>>()
          expect(schema.annotations({})).type.toBe<S.filter<S.NonEmptyArray<typeof S.String>>>()
          expect(schema.from).type.toBe<S.NonEmptyArray<typeof S.String>>()
        })

        it("itemsCount", () => {
          const schema = S.NonEmptyArray(S.String).pipe(S.itemsCount(2))
          expect(S.asSchema(schema)).type.toBe<S.Schema<readonly [string, ...Array<string>]>>()
          expect(schema).type.toBe<S.filter<S.NonEmptyArray<typeof S.String>>>()
          expect(schema.annotations({})).type.toBe<S.filter<S.NonEmptyArray<typeof S.String>>>()
          expect(schema.from).type.toBe<S.NonEmptyArray<typeof S.String>>()
        })
      })
    })

    describe("Date Filters", () => {
      it("validDate", () => {
        when(pipe).isCalledWith(S.Null, expect(S.validDate).type.not.toBeCallableWith())

        const schema = pipe(S.DateFromSelf, S.validDate())
        expect(S.asSchema(schema)).type.toBe<S.Schema<Date>>()
        expect(schema).type.toBe<S.filter<typeof S.DateFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.DateFromSelf>>()
        expect(schema.from).type.toBe<typeof S.DateFromSelf>()
      })

      it("lessThanDate", () => {
        when(pipe).isCalledWith(S.Null, expect(S.lessThanDate).type.not.toBeCallableWith(new Date()))

        const schema = pipe(S.DateFromSelf, S.lessThanDate(new Date()))
        expect(S.asSchema(schema)).type.toBe<S.Schema<Date>>()
        expect(schema).type.toBe<S.filter<typeof S.DateFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.DateFromSelf>>()
        expect(schema.from).type.toBe<typeof S.DateFromSelf>()
      })

      it("lessThanOrEqualToDate", () => {
        when(pipe).isCalledWith(S.Null, expect(S.lessThanOrEqualToDate).type.not.toBeCallableWith(new Date()))

        const schema = pipe(S.DateFromSelf, S.lessThanOrEqualToDate(new Date()))
        expect(S.asSchema(schema)).type.toBe<S.Schema<Date>>()
        expect(schema).type.toBe<S.filter<typeof S.DateFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.DateFromSelf>>()
        expect(schema.from).type.toBe<typeof S.DateFromSelf>()
      })

      it("greaterThanDate", () => {
        when(pipe).isCalledWith(S.Null, expect(S.greaterThanDate).type.not.toBeCallableWith(new Date()))

        const schema = pipe(S.DateFromSelf, S.greaterThanDate(new Date()))
        expect(S.asSchema(schema)).type.toBe<S.Schema<Date>>()
        expect(schema).type.toBe<S.filter<typeof S.DateFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.DateFromSelf>>()
        expect(schema.from).type.toBe<typeof S.DateFromSelf>()
      })

      it("greaterThanOrEqualToDate", () => {
        when(pipe).isCalledWith(S.Null, expect(S.greaterThanOrEqualToDate).type.not.toBeCallableWith(new Date()))

        const schema = pipe(S.DateFromSelf, S.greaterThanOrEqualToDate(new Date()))
        expect(S.asSchema(schema)).type.toBe<S.Schema<Date>>()
        expect(schema).type.toBe<S.filter<typeof S.DateFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.DateFromSelf>>()
        expect(schema.from).type.toBe<typeof S.DateFromSelf>()
      })

      it("betweenDate", () => {
        when(pipe).isCalledWith(S.Null, expect(S.betweenDate).type.not.toBeCallableWith(new Date(0), new Date(100)))

        const schema = pipe(S.DateFromSelf, S.betweenDate(new Date(0), new Date(100)))
        expect(S.asSchema(schema)).type.toBe<S.Schema<Date>>()
        expect(schema).type.toBe<S.filter<typeof S.DateFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.DateFromSelf>>()
        expect(schema.from).type.toBe<typeof S.DateFromSelf>()
      })
    })

    describe("BigDecimal Filters", () => {
      const bd = hole<BigDecimal.BigDecimal>()

      it("greaterThanBigDecimal", () => {
        when(pipe).isCalledWith(S.Null, expect(S.greaterThanBigDecimal).type.not.toBeCallableWith(bd))

        const schema = pipe(S.BigDecimalFromSelf, S.greaterThanBigDecimal(bd))
        expect(S.asSchema(schema)).type.toBe<S.Schema<BigDecimal.BigDecimal>>()
        expect(schema).type.toBe<S.filter<typeof S.BigDecimalFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.BigDecimalFromSelf>>()
        expect(schema.from).type.toBe<typeof S.BigDecimalFromSelf>()
      })

      it("greaterThanOrEqualToBigDecimal", () => {
        when(pipe).isCalledWith(S.Null, expect(S.greaterThanOrEqualToBigDecimal).type.not.toBeCallableWith(bd))

        const schema = pipe(S.BigDecimalFromSelf, S.greaterThanOrEqualToBigDecimal(bd))
        expect(S.asSchema(schema)).type.toBe<S.Schema<BigDecimal.BigDecimal>>()
        expect(schema).type.toBe<S.filter<typeof S.BigDecimalFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.BigDecimalFromSelf>>()
        expect(schema.from).type.toBe<typeof S.BigDecimalFromSelf>()
      })

      it("lessThanBigDecimal", () => {
        when(pipe).isCalledWith(S.Null, expect(S.lessThanBigDecimal).type.not.toBeCallableWith(bd))

        const schema = pipe(S.BigDecimalFromSelf, S.lessThanBigDecimal(bd))
        expect(S.asSchema(schema)).type.toBe<S.Schema<BigDecimal.BigDecimal>>()
        expect(schema).type.toBe<S.filter<typeof S.BigDecimalFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.BigDecimalFromSelf>>()
        expect(schema.from).type.toBe<typeof S.BigDecimalFromSelf>()
      })

      it("lessThanOrEqualToBigDecimal", () => {
        when(pipe).isCalledWith(S.Null, expect(S.lessThanOrEqualToBigDecimal).type.not.toBeCallableWith(bd))

        const schema = pipe(S.BigDecimalFromSelf, S.lessThanOrEqualToBigDecimal(bd))
        expect(S.asSchema(schema)).type.toBe<S.Schema<BigDecimal.BigDecimal>>()
        expect(schema).type.toBe<S.filter<typeof S.BigDecimalFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.BigDecimalFromSelf>>()
        expect(schema.from).type.toBe<typeof S.BigDecimalFromSelf>()
      })

      it("positiveBigDecimal", () => {
        when(pipe).isCalledWith(S.Null, expect(S.positiveBigDecimal).type.not.toBeCallableWith())

        const schema = pipe(S.BigDecimalFromSelf, S.positiveBigDecimal())
        expect(S.asSchema(schema)).type.toBe<S.Schema<BigDecimal.BigDecimal>>()
        expect(schema).type.toBe<S.filter<typeof S.BigDecimalFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.BigDecimalFromSelf>>()
        expect(schema.from).type.toBe<typeof S.BigDecimalFromSelf>()
      })

      it("nonNegativeBigDecimal", () => {
        when(pipe).isCalledWith(S.Null, expect(S.nonNegativeBigDecimal).type.not.toBeCallableWith())

        const schema = pipe(S.BigDecimalFromSelf, S.nonNegativeBigDecimal())
        expect(S.asSchema(schema)).type.toBe<S.Schema<BigDecimal.BigDecimal>>()
        expect(schema).type.toBe<S.filter<typeof S.BigDecimalFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.BigDecimalFromSelf>>()
        expect(schema.from).type.toBe<typeof S.BigDecimalFromSelf>()
      })

      it("negativeBigDecimal", () => {
        when(pipe).isCalledWith(S.Null, expect(S.negativeBigDecimal).type.not.toBeCallableWith())

        const schema = pipe(S.BigDecimalFromSelf, S.negativeBigDecimal())
        expect(S.asSchema(schema)).type.toBe<S.Schema<BigDecimal.BigDecimal>>()
        expect(schema).type.toBe<S.filter<typeof S.BigDecimalFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.BigDecimalFromSelf>>()
        expect(schema.from).type.toBe<typeof S.BigDecimalFromSelf>()
      })

      it("nonPositiveBigDecimal", () => {
        when(pipe).isCalledWith(S.Null, expect(S.nonPositiveBigDecimal).type.not.toBeCallableWith())

        const schema = pipe(S.BigDecimalFromSelf, S.nonPositiveBigDecimal())
        expect(S.asSchema(schema)).type.toBe<S.Schema<BigDecimal.BigDecimal>>()
        expect(schema).type.toBe<S.filter<typeof S.BigDecimalFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.BigDecimalFromSelf>>()
        expect(schema.from).type.toBe<typeof S.BigDecimalFromSelf>()
      })

      it("betweenBigDecimal", () => {
        when(pipe).isCalledWith(S.Null, expect(S.betweenBigDecimal).type.not.toBeCallableWith(bd, bd))

        const schema = pipe(S.BigDecimalFromSelf, S.betweenBigDecimal(bd, bd))
        expect(S.asSchema(schema)).type.toBe<S.Schema<BigDecimal.BigDecimal>>()
        expect(schema).type.toBe<S.filter<typeof S.BigDecimalFromSelf>>()
        expect(schema.annotations({})).type.toBe<S.filter<typeof S.BigDecimalFromSelf>>()
        expect(schema.from).type.toBe<typeof S.BigDecimalFromSelf>()
      })
    })
  })

  describe("Data Types", () => {
    it("Uint8ArrayFromSelf", () => {
      const schema = S.Uint8ArrayFromSelf
      expect(S.asSchema(schema)).type.toBe<S.Schema<Uint8Array>>()
      expect(schema).type.toBe<typeof S.Uint8ArrayFromSelf>()
      // TODO: should be typeof S.Uint8ArrayFromSelf
      expect(schema.annotations({})).type.toBe<S.declare<Uint8Array>>()
    })

    it("DateFromSelf", () => {
      const schema = S.DateFromSelf
      expect(S.asSchema(schema)).type.toBe<S.Schema<Date>>()
      expect(schema).type.toBe<typeof S.DateFromSelf>()
      // TODO: should be typeof S.DateFromSelf
      expect(schema.annotations({})).type.toBe<S.declare<Date>>()
    })

    it("DateTimeUtcFromSelf", () => {
      const schema = S.DateTimeUtcFromSelf
      expect(S.asSchema(schema)).type.toBe<S.Schema<DateTime.Utc>>()
      expect(schema).type.toBe<typeof S.DateTimeUtcFromSelf>()
      // TODO: should be typeof S.DateTimeUtcFromSelf
      expect(schema.annotations({})).type.toBe<S.declare<DateTime.Utc>>()
    })

    it("TimeZoneOffsetFromSelf", () => {
      const schema = S.TimeZoneOffsetFromSelf
      expect(S.asSchema(schema)).type.toBe<S.Schema<DateTime.TimeZone.Offset>>()
      expect(schema).type.toBe<typeof S.TimeZoneOffsetFromSelf>()
      // TODO: should be typeof S.TimeZoneOffsetFromSelf
      expect(schema.annotations({})).type.toBe<S.declare<DateTime.TimeZone.Offset>>()
    })

    it("TimeZoneNamedFromSelf", () => {
      const schema = S.TimeZoneNamedFromSelf
      expect(S.asSchema(schema)).type.toBe<S.Schema<DateTime.TimeZone.Named>>()
      expect(schema).type.toBe<typeof S.TimeZoneNamedFromSelf>()
      // TODO: should be typeof S.TimeZoneNamedFromSelf
      expect(schema.annotations({})).type.toBe<S.declare<DateTime.TimeZone.Named>>()
    })

    it("DateTimeZonedFromSelf", () => {
      const schema = S.DateTimeZonedFromSelf
      expect(S.asSchema(schema)).type.toBe<S.Schema<DateTime.Zoned>>()
      expect(schema).type.toBe<typeof S.DateTimeZonedFromSelf>()
      // TODO: should be typeof S.DateTimeZonedFromSelf
      expect(schema.annotations({})).type.toBe<S.declare<DateTime.Zoned>>()
    })

    it("DurationFromSelf", () => {
      const schema = S.DurationFromSelf
      expect(S.asSchema(schema)).type.toBe<S.Schema<Duration.Duration>>()
      expect(schema).type.toBe<typeof S.DurationFromSelf>()
      // TODO: should be typeof S.DurationFromSelf
      expect(schema.annotations({})).type.toBe<S.declare<Duration.Duration>>()
    })

    it("Duration", () => {
      expect(S.asSchema(S.Duration))
        .type.toBe<S.Schema<Duration.Duration, S.DurationEncoded | readonly [seconds: number, nanos: number]>>()
    })

    it("DurationFromMillis", () => {
      expect(S.asSchema(S.DurationFromMillis)).type.toBe<S.Schema<Duration.Duration, number>>()
    })

    it("DurationFromNanos", () => {
      expect(S.asSchema(S.DurationFromNanos)).type.toBe<S.Schema<Duration.Duration, bigint>>()
    })

    it("BigDecimalFromSelf", () => {
      const schema = S.BigDecimalFromSelf
      expect(S.asSchema(schema)).type.toBe<S.Schema<BigDecimal.BigDecimal>>()
      expect(schema).type.toBe<typeof S.BigDecimalFromSelf>()
      // TODO: should be typeof S.BigDecimalFromSelf
      expect(schema.annotations({})).type.toBe<S.declare<BigDecimal.BigDecimal>>()
    })

    it("FiberIdFromSelf", () => {
      const schema = S.FiberIdFromSelf
      expect(S.asSchema(schema)).type.toBe<S.Schema<FiberId.FiberId>>()
      expect(schema).type.toBe<typeof S.FiberIdFromSelf>()
      // TODO: should be typeof S.FiberIdFromSelf
      expect(schema.annotations({})).type.toBe<S.declare<FiberId.FiberId>>()
    })

    it("BigDecimal", () => {
      expect(S.asSchema(S.BigDecimal)).type.toBe<S.Schema<BigDecimal.BigDecimal, string>>()
    })

    it("BigDecimalFromNumber", () => {
      expect(S.asSchema(S.BigDecimalFromNumber)).type.toBe<S.Schema<BigDecimal.BigDecimal, number>>()
    })

    it("ChunkFromSelf", () => {
      const schema = S.ChunkFromSelf(S.NumberFromString)
      expect(S.asSchema(schema)).type.toBe<S.Schema<Chunk.Chunk<number>, Chunk.Chunk<string>>>()
      expect(schema).type.toBe<S.ChunkFromSelf<typeof S.NumberFromString>>()
      expect(schema.annotations({})).type.toBe<S.ChunkFromSelf<typeof S.NumberFromString>>()
      // should expose the type parameters
      expect(schema.typeParameters).type.toBe<readonly [typeof S.NumberFromString]>()
    })

    it("Chunk", () => {
      const schema = S.Chunk(S.NumberFromString)
      expect(S.asSchema(schema)).type.toBe<S.Schema<Chunk.Chunk<number>, ReadonlyArray<string>>>()
      expect(schema).type.toBe<S.Chunk<typeof S.NumberFromString>>()
      expect(schema.annotations({})).type.toBe<S.Chunk<typeof S.NumberFromString>>()
      expect(schema.from).type.toBe<S.Array$<typeof S.NumberFromString>>()
      expect(schema.to).type.toBe<S.ChunkFromSelf<S.SchemaClass<number>>>()
    })

    it("NonEmptyChunkFromSelf", () => {
      const schema = S.NonEmptyChunkFromSelf(S.NumberFromString)
      expect(S.asSchema(schema)).type.toBe<S.Schema<Chunk.NonEmptyChunk<number>, Chunk.NonEmptyChunk<string>>>()
      expect(schema).type.toBe<S.NonEmptyChunkFromSelf<typeof S.NumberFromString>>()
      expect(schema.annotations({})).type.toBe<S.NonEmptyChunkFromSelf<typeof S.NumberFromString>>()
      // should expose the type parameters
      expect(schema.typeParameters).type.toBe<readonly [typeof S.NumberFromString]>()
    })

    it("NonEmptyChunk", () => {
      const schema = S.NonEmptyChunk(S.NumberFromString)
      expect(S.asSchema(schema)).type.toBe<S.Schema<Chunk.NonEmptyChunk<number>, readonly [string, ...Array<string>]>>()
      expect(schema).type.toBe<S.NonEmptyChunk<typeof S.NumberFromString>>()
      expect(schema.annotations({})).type.toBe<S.NonEmptyChunk<typeof S.NumberFromString>>()
      expect(schema.from).type.toBe<S.NonEmptyArray<typeof S.NumberFromString>>()
      expect(schema.to).type.toBe<S.NonEmptyChunkFromSelf<S.SchemaClass<number>>>()
    })

    it("DataFromSelf", () => {
      expect(S.DataFromSelf).type.not.toBeCallableWith(hole<S.Schema<string>>())
      expect(S.DataFromSelf).type.not.toBeCallableWith(hole<S.Schema<{}, number>>())

      // should allow generic context
      const _f1 = <A extends Readonly<Record<string, unknown>> | ReadonlyArray<unknown>>(schema: S.Schema<A>) =>
        S.DataFromSelf(schema)
      const _f2 = <
        A extends Readonly<Record<string, unknown>> | ReadonlyArray<unknown>,
        I extends Readonly<Record<string, unknown>> | ReadonlyArray<unknown>
      >(schema: S.Schema<A, I>) => S.DataFromSelf(schema)
      const _f3 = <A extends Readonly<Record<string, unknown>> | ReadonlyArray<unknown>, I extends number>(
        schema: S.Schema<A, I>
      ) => expect(S.DataFromSelf).type.not.toBeCallableWith(schema)
      const _f4 = <A extends string>(schema: S.Schema<A>) => expect(S.DataFromSelf).type.not.toBeCallableWith(schema)

      // should allow mutable arguments
      S.DataFromSelf(S.mutable(S.Struct({ a: S.NumberFromString })))

      const schema = S.DataFromSelf(S.Struct({ a: S.NumberFromString }))
      expect(schema)
        .type.toBe<
        S.DataFromSelf<
          S.Struct<{
            a: typeof S.NumberFromString
          }>
        >
      >()
      expect(schema.annotations({}))
        .type.toBe<
        S.DataFromSelf<
          S.Struct<{
            a: typeof S.NumberFromString
          }>
        >
      >()
      // should expose the type parameters
      expect(schema.typeParameters).type.toBe<
        readonly [
          S.Struct<{
            a: typeof S.NumberFromString
          }>
        ]
      >()
    })

    it("Data", () => {
      expect(S.Data).type.not.toBeCallableWith(hole<S.Schema<string>>())
      expect(S.Data).type.not.toBeCallableWith(hole<S.Schema<{}, number>>())

      const schema = S.Data(S.Struct({ a: S.NumberFromString }))
      expect(schema)
        .type.toBe<
        S.Data<
          S.Struct<{
            a: typeof S.NumberFromString
          }>
        >
      >()
      expect(schema.annotations({}))
        .type.toBe<
        S.Data<
          S.Struct<{
            a: typeof S.NumberFromString
          }>
        >
      >()
      expect(schema.from).type.toBe<
        S.Struct<{
          a: typeof S.NumberFromString
        }>
      >()
      expect(schema.to).type.toBe<S.DataFromSelf<S.SchemaClass<{ readonly a: number }>>>()
    })

    it("RedactedFromSelf", () => {
      const schema = S.RedactedFromSelf(S.NumberFromString)
      expect(S.asSchema(schema)).type.toBe<S.Schema<Redacted.Redacted<number>, Redacted.Redacted<string>>>()
      expect(schema).type.toBe<S.RedactedFromSelf<typeof S.NumberFromString>>()
      expect(schema.annotations({})).type.toBe<S.RedactedFromSelf<typeof S.NumberFromString>>()
      // should expose the type parameters
      expect(schema.typeParameters).type.toBe<readonly [typeof S.NumberFromString]>()
    })

    it("Redacted", () => {
      const schema = S.Redacted(S.NumberFromString)
      expect(S.asSchema(schema)).type.toBe<S.Schema<Redacted.Redacted<number>, string>>()
      expect(schema).type.toBe<S.Redacted<typeof S.NumberFromString>>()
      expect(schema.annotations({})).type.toBe<S.Redacted<typeof S.NumberFromString>>()
      expect(schema.from).type.toBe<typeof S.NumberFromString>()
      expect(schema.to).type.toBe<S.RedactedFromSelf<S.SchemaClass<number>>>()
    })

    it("OptionFromSelf", () => {
      const schema = S.OptionFromSelf(S.NumberFromString)
      expect(S.asSchema(schema)).type.toBe<S.Schema<Option.Option<number>, Option.Option<string>>>()
      expect(schema).type.toBe<S.OptionFromSelf<typeof S.NumberFromString>>()
      expect(schema.annotations({})).type.toBe<S.OptionFromSelf<typeof S.NumberFromString>>()
      // should expose the type parameters
      expect(schema.typeParameters).type.toBe<readonly [typeof S.NumberFromString]>()
    })

    it("Option", () => {
      const schema = S.Option(S.NumberFromString)
      expect(S.asSchema(schema)).type.toBe<S.Schema<Option.Option<number>, S.OptionEncoded<string>>>()
      expect(schema).type.toBe<S.Option<typeof S.NumberFromString>>()
      expect(schema.annotations({})).type.toBe<S.Option<typeof S.NumberFromString>>()
      expect(schema.from).type.toBe<
        S.Union<
          [
            S.Struct<{ _tag: S.Literal<["None"]> }>,
            S.Struct<{ _tag: S.Literal<["Some"]>; value: typeof S.NumberFromString }>
          ]
        >
      >()
      expect(schema.to).type.toBe<S.OptionFromSelf<S.SchemaClass<number>>>()
    })

    it("OptionFromNullOr", () => {
      const schema = S.OptionFromNullOr(S.NumberFromString)
      expect(S.asSchema(schema)).type.toBe<S.Schema<Option.Option<number>, string | null>>()
      expect(schema).type.toBe<S.OptionFromNullOr<typeof S.NumberFromString>>()
      expect(schema.annotations({})).type.toBe<S.OptionFromNullOr<typeof S.NumberFromString>>()
      expect(schema.from).type.toBe<S.NullOr<typeof S.NumberFromString>>()
      expect(schema.to).type.toBe<S.OptionFromSelf<S.SchemaClass<number>>>()
    })

    it("OptionFromUndefinedOr", () => {
      const schema = S.OptionFromUndefinedOr(S.NumberFromString)
      expect(S.asSchema(schema)).type.toBe<S.Schema<Option.Option<number>, string | undefined>>()
      expect(schema).type.toBe<S.OptionFromUndefinedOr<typeof S.NumberFromString>>()
      expect(schema.annotations({})).type.toBe<S.OptionFromUndefinedOr<typeof S.NumberFromString>>()
      expect(schema.from).type.toBe<S.UndefinedOr<typeof S.NumberFromString>>()
      expect(schema.to).type.toBe<S.OptionFromSelf<S.SchemaClass<number>>>()
    })

    it("OptionFromNullishOr", () => {
      const schema = S.OptionFromNullishOr(S.NumberFromString, null)
      expect(S.asSchema(schema)).type.toBe<S.Schema<Option.Option<number>, string | null | undefined>>()
      expect(schema).type.toBe<S.OptionFromNullishOr<typeof S.NumberFromString>>()
      expect(schema.annotations({})).type.toBe<S.OptionFromNullishOr<typeof S.NumberFromString>>()
      expect(schema.from).type.toBe<S.NullishOr<typeof S.NumberFromString>>()
      expect(schema.to).type.toBe<S.OptionFromSelf<S.SchemaClass<number>>>()
    })

    it("EitherFromSelf", () => {
      const schema = S.EitherFromSelf({ right: S.NumberFromString, left: S.String })
      expect(S.asSchema(schema)).type.toBe<S.Schema<Either.Either<number, string>, Either.Either<string, string>>>()
      expect(schema).type.toBe<S.EitherFromSelf<typeof S.NumberFromString, typeof S.String>>()
      expect(schema.annotations({})).type.toBe<S.EitherFromSelf<typeof S.NumberFromString, typeof S.String>>()
      // should expose the type parameters
      expect(schema.typeParameters).type.toBe<readonly [typeof S.NumberFromString, typeof S.String]>()

      // should allow never as right
      expect(S.EitherFromSelf({ right: S.Never, left: S.String }))
        .type.toBe<S.EitherFromSelf<typeof S.Never, typeof S.String>>()
      // should allow never as left
      expect(S.EitherFromSelf({ right: S.String, left: S.Never }))
        .type.toBe<S.EitherFromSelf<typeof S.String, typeof S.Never>>()
    })

    it("Either", () => {
      const schema = S.Either({ right: S.NumberFromString, left: S.String })
      expect(S.asSchema(schema)).type.toBe<S.Schema<Either.Either<number, string>, S.EitherEncoded<string, string>>>()
      expect(schema).type.toBe<S.Either<typeof S.NumberFromString, typeof S.String>>()
      expect(schema.annotations({})).type.toBe<S.Either<typeof S.NumberFromString, typeof S.String>>()
      expect(schema.from).type.toBe<
        S.Union<[
          S.Struct<{
            _tag: S.Literal<["Right"]>
            right: typeof S.NumberFromString
          }>,
          S.Struct<{
            _tag: S.Literal<["Left"]>
            left: typeof S.String
          }>
        ]>
      >()
      expect(schema.to).type.toBe<S.EitherFromSelf<S.SchemaClass<number>, S.SchemaClass<string>>>()

      // should allow never as right
      expect(S.Either({ right: S.Never, left: S.String })).type.toBe<S.Either<typeof S.Never, typeof S.String>>()
      // should allow never as left
      expect(S.Either({ right: S.String, left: S.Never })).type.toBe<S.Either<typeof S.String, typeof S.Never>>()
    })

    it("EitherFromUnion", () => {
      const schema = S.EitherFromUnion({ right: S.NumberFromString, left: S.Boolean })
      expect(S.asSchema(schema)).type.toBe<S.Schema<Either.Either<number, boolean>, string | boolean>>()
      expect(schema).type.toBe<S.EitherFromUnion<typeof S.NumberFromString, typeof S.Boolean>>()
      expect(schema.annotations({})).type.toBe<S.EitherFromUnion<typeof S.NumberFromString, typeof S.Boolean>>()
      expect(schema.from).type.toBe<
        S.Union<[
          S.transform<
            typeof S.NumberFromString,
            S.Struct<{
              _tag: S.Literal<["Right"]>
              right: S.SchemaClass<number>
            }>
          >,
          S.transform<
            typeof S.Boolean,
            S.Struct<{
              _tag: S.Literal<["Left"]>
              right: S.SchemaClass<boolean>
            }>
          >
        ]>
      >()
      expect(schema.from.members[0].to.fields.right).type.toBe<S.SchemaClass<number>>()
      expect(schema.to).type.toBe<S.EitherFromSelf<S.SchemaClass<number>, S.SchemaClass<boolean>>>()

      // should allow never as right
      expect(S.EitherFromUnion({ right: S.Never, left: S.String }))
        .type.toBe<S.EitherFromUnion<typeof S.Never, typeof S.String>>()
      // should allow never as left
      expect(S.EitherFromUnion({ right: S.String, left: S.Never }))
        .type.toBe<S.EitherFromUnion<typeof S.String, typeof S.Never>>()
    })

    it("ReadonlyMapFromSelf", () => {
      const schema = S.ReadonlyMapFromSelf({ key: S.NumberFromString, value: S.String })
      expect(S.asSchema(schema)).type.toBe<S.Schema<ReadonlyMap<number, string>, ReadonlyMap<string, string>>>()
      expect(schema).type.toBe<S.ReadonlyMapFromSelf<typeof S.NumberFromString, typeof S.String>>()
      expect(schema.annotations({})).type.toBe<S.ReadonlyMapFromSelf<typeof S.NumberFromString, typeof S.String>>()
      // should expose the type parameters
      expect(schema.typeParameters).type.toBe<readonly [typeof S.NumberFromString, typeof S.String]>()
    })

    it("ReadonlyMap", () => {
      const schema = S.ReadonlyMap({ key: S.NumberFromString, value: S.String })
      expect(S.asSchema(schema))
        .type.toBe<S.Schema<ReadonlyMap<number, string>, ReadonlyArray<readonly [string, string]>>>()
      expect(schema).type.toBe<S.ReadonlyMap$<typeof S.NumberFromString, typeof S.String>>()
      expect(schema.annotations({})).type.toBe<S.ReadonlyMap$<typeof S.NumberFromString, typeof S.String>>()
      expect(schema.from).type.toBe<S.Array$<S.Tuple2<typeof S.NumberFromString, typeof S.String>>>()
      expect(schema.to).type.toBe<S.ReadonlyMapFromSelf<S.SchemaClass<number>, S.SchemaClass<string>>>()
    })

    it("MapFromSelf", () => {
      const schema = S.MapFromSelf({ key: S.NumberFromString, value: S.String })
      expect(S.asSchema(schema)).type.toBe<S.Schema<Map<number, string>, ReadonlyMap<string, string>>>()
      expect(schema).type.toBe<S.MapFromSelf<typeof S.NumberFromString, typeof S.String>>()
      expect(schema.annotations({})).type.toBe<S.MapFromSelf<typeof S.NumberFromString, typeof S.String>>()
      // should expose the type parameters
      expect(schema.typeParameters).type.toBe<readonly [typeof S.NumberFromString, typeof S.String]>()
    })

    it("Map", () => {
      const schema = S.Map({ key: S.NumberFromString, value: S.String })
      expect(S.asSchema(schema)).type.toBe<S.Schema<Map<number, string>, ReadonlyArray<readonly [string, string]>>>()
      expect(schema).type.toBe<S.Map$<typeof S.NumberFromString, typeof S.String>>()
      expect(schema.annotations({})).type.toBe<S.Map$<typeof S.NumberFromString, typeof S.String>>()
      expect(schema.from).type.toBe<S.Array$<S.Tuple2<typeof S.NumberFromString, typeof S.String>>>()
      expect(schema.to).type.toBe<S.MapFromSelf<S.SchemaClass<number>, S.SchemaClass<string>>>()
    })

    it("HashMapFromSelf", () => {
      const schema = S.HashMapFromSelf({ key: S.NumberFromString, value: S.String })
      expect(S.asSchema(schema)).type.toBe<S.Schema<HashMap.HashMap<number, string>, HashMap.HashMap<string, string>>>()
      expect(schema).type.toBe<S.HashMapFromSelf<typeof S.NumberFromString, typeof S.String>>()
      expect(schema.annotations({})).type.toBe<S.HashMapFromSelf<typeof S.NumberFromString, typeof S.String>>()
      // should expose the type parameters
      expect(schema.typeParameters).type.toBe<readonly [typeof S.NumberFromString, typeof S.String]>()
    })

    it("HashMap", () => {
      const schema = S.HashMap({ key: S.NumberFromString, value: S.String })
      expect(S.asSchema(schema))
        .type.toBe<S.Schema<HashMap.HashMap<number, string>, ReadonlyArray<readonly [string, string]>>>()
      expect(schema).type.toBe<S.HashMap<typeof S.NumberFromString, typeof S.String>>()
      expect(schema.annotations({})).type.toBe<S.HashMap<typeof S.NumberFromString, typeof S.String>>()
      expect(schema.from).type.toBe<S.Array$<S.Tuple2<typeof S.NumberFromString, typeof S.String>>>()
      expect(schema.to).type.toBe<S.HashMapFromSelf<S.SchemaClass<number>, S.SchemaClass<string>>>()
    })

    it("ReadonlySetFromSelf", () => {
      const schema = S.ReadonlySetFromSelf(S.NumberFromString)
      expect(S.asSchema(schema)).type.toBe<S.Schema<ReadonlySet<number>, ReadonlySet<string>>>()
      expect(schema).type.toBe<S.ReadonlySetFromSelf<typeof S.NumberFromString>>()
      expect(schema.annotations({})).type.toBe<S.ReadonlySetFromSelf<typeof S.NumberFromString>>()
      // should expose the type parameters
      expect(schema.typeParameters).type.toBe<readonly [typeof S.NumberFromString]>()
    })

    it("ReadonlySet", () => {
      const schema = S.ReadonlySet(S.NumberFromString)
      expect(S.asSchema(schema)).type.toBe<S.Schema<ReadonlySet<number>, ReadonlyArray<string>>>()
      expect(schema).type.toBe<S.ReadonlySet$<typeof S.NumberFromString>>()
      expect(schema.annotations({})).type.toBe<S.ReadonlySet$<typeof S.NumberFromString>>()
      expect(schema.from).type.toBe<S.Array$<typeof S.NumberFromString>>()
      expect(schema.to).type.toBe<S.ReadonlySetFromSelf<S.SchemaClass<number>>>()
    })

    it("SetFromSelf", () => {
      const schema = S.SetFromSelf(S.NumberFromString)
      expect(S.asSchema(schema)).type.toBe<S.Schema<Set<number>, ReadonlySet<string>>>()
      expect(schema).type.toBe<S.SetFromSelf<typeof S.NumberFromString>>()
      expect(schema.annotations({})).type.toBe<S.SetFromSelf<typeof S.NumberFromString>>()
      // should expose the type parameters
      expect(schema.typeParameters).type.toBe<readonly [typeof S.NumberFromString]>()
    })

    it("Set", () => {
      const schema = S.Set(S.NumberFromString)
      expect(S.asSchema(schema)).type.toBe<S.Schema<Set<number>, ReadonlyArray<string>>>()
      expect(schema).type.toBe<S.Set$<typeof S.NumberFromString>>()
      expect(schema.annotations({})).type.toBe<S.Set$<typeof S.NumberFromString>>()
      expect(schema.from).type.toBe<S.Array$<typeof S.NumberFromString>>()
      expect(schema.to).type.toBe<S.SetFromSelf<S.SchemaClass<number>>>()
    })

    it("HashSetFromSelf", () => {
      const schema = S.HashSetFromSelf(S.NumberFromString)
      expect(S.asSchema(schema)).type.toBe<S.Schema<HashSet.HashSet<number>, HashSet.HashSet<string>>>()
      expect(schema).type.toBe<S.HashSetFromSelf<typeof S.NumberFromString>>()
      expect(schema.annotations({})).type.toBe<S.HashSetFromSelf<typeof S.NumberFromString>>()
      // should expose the type parameters
      expect(schema.typeParameters).type.toBe<readonly [typeof S.NumberFromString]>()
    })

    it("HashSet", () => {
      const schema = S.HashSet(S.NumberFromString)
      expect(S.asSchema(schema)).type.toBe<S.Schema<HashSet.HashSet<number>, ReadonlyArray<string>>>()
      expect(schema).type.toBe<S.HashSet<typeof S.NumberFromString>>()
      expect(schema.annotations({})).type.toBe<S.HashSet<typeof S.NumberFromString>>()
      expect(schema.from).type.toBe<S.Array$<typeof S.NumberFromString>>()
      expect(schema.to).type.toBe<S.HashSetFromSelf<S.SchemaClass<number>>>()
    })

    it("ListFromSelf", () => {
      const schema = S.ListFromSelf(S.NumberFromString)
      expect(S.asSchema(schema)).type.toBe<S.Schema<List.List<number>, List.List<string>>>()
      expect(schema).type.toBe<S.ListFromSelf<typeof S.NumberFromString>>()
      expect(schema.annotations({})).type.toBe<S.ListFromSelf<typeof S.NumberFromString>>()
      // should expose the type parameters
      expect(schema.typeParameters).type.toBe<readonly [typeof S.NumberFromString]>()
    })

    it("List", () => {
      const schema = S.List(S.NumberFromString)
      expect(S.asSchema(schema)).type.toBe<S.Schema<List.List<number>, ReadonlyArray<string>>>()
      expect(schema).type.toBe<S.List<typeof S.NumberFromString>>()
      expect(schema.annotations({})).type.toBe<S.List<typeof S.NumberFromString>>()
      expect(schema.from).type.toBe<S.Array$<typeof S.NumberFromString>>()
      expect(schema.to).type.toBe<S.ListFromSelf<S.SchemaClass<number>>>()
    })

    it("CauseFromSelf", () => {
      const schema = S.CauseFromSelf({ error: S.String, defect: S.Unknown })
      expect(S.asSchema(schema)).type.toBe<S.Schema<Cause.Cause<string>, Cause.Cause<string>>>()
      expect(schema).type.toBe<S.CauseFromSelf<typeof S.String, typeof S.Unknown>>()
      expect(schema.annotations({})).type.toBe<S.CauseFromSelf<typeof S.String, typeof S.Unknown>>()
      // should expose the type parameters
      expect(schema.typeParameters).type.toBe<readonly [typeof S.String, typeof S.Unknown]>()

      const defectWithR = S.CauseFromSelf({ error: S.String, defect: hole<S.Schema<unknown, unknown, "a">>() })
      expect(S.asSchema(defectWithR)).type.toBe<S.Schema<Cause.Cause<string>, Cause.Cause<string>, "a">>()
      expect(defectWithR).type.toBe<S.CauseFromSelf<typeof S.String, S.Schema<unknown, unknown, "a">>>()
    })

    it("Cause", () => {
      const schema = S.Cause({ error: S.String, defect: S.Defect })
      expect(S.asSchema(schema)).type.toBe<S.Schema<Cause.Cause<string>, S.CauseEncoded<string, unknown>>>()
      expect(schema).type.toBe<S.Cause<typeof S.String, typeof S.Defect>>()
      expect(schema.annotations({})).type.toBe<S.Cause<typeof S.String, typeof S.Defect>>()
      expect(schema.from).type.toBe<
        S.SchemaClass<S.CauseEncoded<string, unknown>, S.CauseEncoded<string, unknown>, never>
      >()
      expect(schema.to).type.toBe<S.CauseFromSelf<S.SchemaClass<string>, S.SchemaClass<unknown>>>()

      const defectWithR = S.Cause({ error: S.String, defect: hole<S.Schema<unknown, unknown, "a">>() })
      expect(S.asSchema(defectWithR)).type.toBe<S.Schema<Cause.Cause<string>, S.CauseEncoded<string, unknown>, "a">>()
      expect(defectWithR).type.toBe<S.Cause<typeof S.String, S.Schema<unknown, unknown, "a">>>()
    })

    it("ExitFromSelf", () => {
      const schema = S.ExitFromSelf({ success: S.Number, failure: S.String, defect: S.Unknown })
      expect(S.asSchema(schema)).type.toBe<S.Schema<Exit.Exit<number, string>, Exit.Exit<number, string>>>()
      expect(schema).type.toBe<S.ExitFromSelf<typeof S.Number, typeof S.String, typeof S.Unknown>>()
      expect(schema.annotations({})).type.toBe<S.ExitFromSelf<typeof S.Number, typeof S.String, typeof S.Unknown>>()
      // should expose the type parameters
      expect(schema.typeParameters).type.toBe<readonly [typeof S.Number, typeof S.String, typeof S.Unknown]>()

      const defectWithR = S.ExitFromSelf({
        success: S.Number,
        failure: S.String,
        defect: hole<S.Schema<unknown, unknown, "a">>()
      })
      expect(S.asSchema(defectWithR)).type.toBe<S.Schema<Exit.Exit<number, string>, Exit.Exit<number, string>, "a">>()
      expect(defectWithR).type.toBe<S.ExitFromSelf<typeof S.Number, typeof S.String, S.Schema<unknown, unknown, "a">>>()
    })

    it("Exit", () => {
      const schema = S.Exit({ success: S.NumberFromString, failure: S.String, defect: S.Defect })
      expect(S.asSchema(schema))
        .type.toBe<S.Schema<Exit.Exit<number, string>, S.ExitEncoded<string, string, unknown>>>()
      expect(schema).type.toBe<S.Exit<typeof S.NumberFromString, typeof S.String, typeof S.Defect>>()
      expect(schema.annotations({})).type.toBe<S.Exit<typeof S.NumberFromString, typeof S.String, typeof S.Defect>>()
      expect(schema.from).type.toBe<
        S.Union<[
          S.Struct<{
            _tag: S.Literal<["Failure"]>
            cause: S.SchemaClass<S.CauseEncoded<string, unknown>, S.CauseEncoded<string, unknown>, never>
          }>,
          S.Struct<{
            _tag: S.Literal<["Success"]>
            value: typeof S.NumberFromString
          }>
        ]>
      >()
      expect(schema.to).type.toBe<
        S.ExitFromSelf<S.SchemaClass<number>, S.SchemaClass<string>, S.SchemaClass<unknown>>
      >()

      const defectWithR = S.Exit({
        success: S.Number,
        failure: S.String,
        defect: hole<S.Schema<unknown, unknown, "a">>()
      })
      expect(S.asSchema(defectWithR))
        .type.toBe<S.Schema<Exit.Exit<number, string>, S.ExitEncoded<number, string, unknown>, "a">>()
      expect(defectWithR).type.toBe<S.Exit<typeof S.Number, typeof S.String, S.Schema<unknown, unknown, "a">>>()
    })

    it("SortedSetFromSelf", () => {
      const schema = S.SortedSetFromSelf(S.NumberFromString, N.Order, Str.Order)
      expect(S.asSchema(schema)).type.toBe<S.Schema<SortedSet.SortedSet<number>, SortedSet.SortedSet<string>>>()
      expect(schema).type.toBe<S.SortedSetFromSelf<typeof S.NumberFromString>>()
      expect(schema.annotations({})).type.toBe<S.SortedSetFromSelf<typeof S.NumberFromString>>()
      // should expose the type parameters
      expect(schema.typeParameters).type.toBe<readonly [typeof S.NumberFromString]>()
    })

    it("SortedSet", () => {
      const schema = S.SortedSet(S.NumberFromString, N.Order)
      expect(S.asSchema(schema)).type.toBe<S.Schema<SortedSet.SortedSet<number>, ReadonlyArray<string>>>()
      expect(schema).type.toBe<S.SortedSet<typeof S.NumberFromString>>()
      expect(schema.annotations({})).type.toBe<S.SortedSet<typeof S.NumberFromString>>()
      expect(schema.from).type.toBe<S.Array$<typeof S.NumberFromString>>()
      expect(schema.to).type.toBe<S.SortedSetFromSelf<S.SchemaClass<number>>>()
    })

    it("Config", () => {
      expect(S.Config("A", S.String))
        .type.toBe<Config.Config<string>>()
      expect(S.Config("A", S.BooleanFromString))
        .type.toBe<Config.Config<boolean>>()
      expect(S.Config("A", S.TemplateLiteral(S.Literal("a"), S.String)))
        .type.toBe<Config.Config<`a${string}`>>()

      // passed schemas must be encodable to string
      expect(S.Config).type.not.toBeCallableWith("A", S.Boolean)
    })

    it("Defect", () => {
      const schema = S.Defect
      expect(S.asSchema(schema)).type.toBe<S.Schema<unknown>>()
      expect(schema).type.toBe<typeof S.Defect>()
    })
  })

  describe("parseJson", () => {
    it("no arguments", () => {
      const schema = S.parseJson()
      expect(S.asSchema(schema)).type.toBe<S.Schema<unknown, string>>()
      expect(schema).type.toBe<S.SchemaClass<unknown, string>>()
      expect(schema.annotations({})).type.toBe<S.SchemaClass<unknown, string>>()
    })

    it("single argument", () => {
      const schema = S.parseJson(S.Struct({ a: S.Number }))
      expect(S.asSchema(schema)).type.toBe<S.Schema<{ readonly a: number }, string>>()
      expect(schema).type.toBe<S.transform<S.SchemaClass<unknown, string>, S.Struct<{ a: typeof S.Number }>>>()
      expect(schema.annotations({})).type.toBe<
        S.transform<S.SchemaClass<unknown, string>, S.Struct<{ a: typeof S.Number }>>
      >()
      expect(schema.from).type.toBe<S.SchemaClass<unknown, string>>()
      expect(schema.to).type.toBe<S.Struct<{ a: typeof S.Number }>>()
    })
  })

  it("ArrayEnsure", () => {
    const schema = S.ArrayEnsure(S.NumberFromString)
    expect(S.asSchema(schema)).type.toBe<S.Schema<ReadonlyArray<number>, string | ReadonlyArray<string>>>()
    expect(schema).type.toBe<S.ArrayEnsure<typeof S.NumberFromString>>()
    expect(schema.annotations({})).type.toBe<S.ArrayEnsure<typeof S.NumberFromString>>()
    expect(schema.from).type.toBe<S.Union<[typeof S.NumberFromString, S.Array$<typeof S.NumberFromString>]>>()
    expect(schema.to).type.toBe<S.Array$<S.SchemaClass<number>>>()
  })

  it("NonEmptyArrayEnsure", () => {
    const schema = S.NonEmptyArrayEnsure(S.NumberFromString)
    expect(S.asSchema(schema)).type.toBe<
      S.Schema<readonly [number, ...Array<number>], string | readonly [string, ...Array<string>]>
    >()
    expect(schema).type.toBe<S.NonEmptyArrayEnsure<typeof S.NumberFromString>>()
    expect(schema.annotations({})).type.toBe<S.NonEmptyArrayEnsure<typeof S.NumberFromString>>()
    expect(schema.from).type.toBe<S.Union<[typeof S.NumberFromString, S.NonEmptyArray<typeof S.NumberFromString>]>>()
    expect(schema.to).type.toBe<S.NonEmptyArray<S.SchemaClass<number>>>()
  })

  it("ReadonlyMapFromRecord", () => {
    const schema = S.ReadonlyMapFromRecord({ key: S.NumberFromString, value: S.NumberFromString })
    expect(S.asSchema(schema)).type.toBe<S.Schema<ReadonlyMap<number, number>, { readonly [x: string]: string }>>()
    expect(schema).type.toBe<S.SchemaClass<ReadonlyMap<number, number>, { readonly [x: string]: string }>>()
    expect(schema.annotations({})).type.toBe<
      S.SchemaClass<ReadonlyMap<number, number>, { readonly [x: string]: string }>
    >()
  })

  it("MapFromRecord", () => {
    const schema = S.MapFromRecord({ key: S.NumberFromString, value: S.NumberFromString })
    expect(S.asSchema(schema)).type.toBe<S.Schema<Map<number, number>, { readonly [x: string]: string }>>()
    expect(schema).type.toBe<S.SchemaClass<Map<number, number>, { readonly [x: string]: string }>>()
    expect(schema.annotations({})).type.toBe<S.SchemaClass<Map<number, number>, { readonly [x: string]: string }>>()
  })

  describe("Transformations", () => {
    it("clamp", () => {
      when(S.String.pipe).isCalledWith(expect(S.clamp).type.not.toBeCallableWith(-1, 1))

      const schema = S.Number.pipe(S.clamp(-1, 1))
      expect(S.asSchema(schema)).type.toBe<S.Schema<number>>()
      expect(schema).type.toBe<S.transform<typeof S.Number, S.filter<S.SchemaClass<number>>>>()
      expect(schema.annotations({})).type.toBe<S.transform<typeof S.Number, S.filter<S.SchemaClass<number>>>>()
      expect(schema.from).type.toBe<typeof S.Number>()
      expect(schema.to).type.toBe<S.filter<S.SchemaClass<number>>>()
    })

    it("clampBigInt", () => {
      when(S.String.pipe).isCalledWith(expect(S.clampBigInt).type.not.toBeCallableWith(-1, 1))

      const schema = S.BigIntFromSelf.pipe(S.clampBigInt(-1n, 1n))
      expect(S.asSchema(schema)).type.toBe<S.Schema<bigint>>()
      expect(schema).type.toBe<S.transform<typeof S.BigIntFromSelf, S.filter<S.SchemaClass<bigint>>>>()
      expect(schema.annotations({})).type.toBe<
        S.transform<typeof S.BigIntFromSelf, S.filter<S.SchemaClass<bigint>>>
      >()
      expect(schema.from).type.toBe<typeof S.BigIntFromSelf>()
      expect(schema.to).type.toBe<S.filter<S.SchemaClass<bigint>>>()
    })

    it("clampDuration", () => {
      when(S.String.pipe).isCalledWith(expect(S.clampDuration).type.not.toBeCallableWith(-1, 1))

      const schema = S.DurationFromSelf.pipe(S.clampDuration(-1, 1))
      expect(S.asSchema(schema)).type.toBe<S.Schema<Duration.Duration>>()
      expect(schema).type.toBe<S.transform<typeof S.DurationFromSelf, S.filter<S.SchemaClass<Duration.Duration>>>>()
      expect(schema.annotations({})).type.toBe<
        S.transform<typeof S.DurationFromSelf, S.filter<S.SchemaClass<Duration.Duration>>>
      >()
      expect(schema.from).type.toBe<typeof S.DurationFromSelf>()
      expect(schema.to).type.toBe<S.filter<S.SchemaClass<Duration.Duration>>>()
    })

    it("clampBigDecimal", () => {
      when(S.String.pipe).isCalledWith(expect(S.clampBigDecimal).type.not.toBeCallableWith(-1, 1))

      const schema = S.BigDecimalFromSelf.pipe(
        S.clampBigDecimal(hole<BigDecimal.BigDecimal>(), hole<BigDecimal.BigDecimal>())
      )
      expect(S.asSchema(schema)).type.toBe<S.Schema<BigDecimal.BigDecimal>>()
      expect(schema).type.toBe<
        S.transform<typeof S.BigDecimalFromSelf, S.filter<S.SchemaClass<BigDecimal.BigDecimal>>>
      >()
      expect(schema.annotations({})).type.toBe<
        S.transform<typeof S.BigDecimalFromSelf, S.filter<S.SchemaClass<BigDecimal.BigDecimal>>>
      >()
      expect(schema.from).type.toBe<typeof S.BigDecimalFromSelf>()
      expect(schema.to).type.toBe<S.filter<S.SchemaClass<BigDecimal.BigDecimal>>>()
    })

    it("head", () => {
      expect(S.String.pipe).type.not.toBeCallableWith(S.head)

      const schema = S.head(S.Array(S.NumberFromString))

      expect(S.asSchema(schema)).type.toBe<S.Schema<Option.Option<number>, ReadonlyArray<string>, never>>()
      expect(schema)
        .type.toBe<S.transform<S.Array$<typeof S.NumberFromString>, S.OptionFromSelf<S.SchemaClass<number>>>>()
      expect(schema.annotations({}))
        .type.toBe<S.transform<S.Array$<typeof S.NumberFromString>, S.OptionFromSelf<S.SchemaClass<number>>>>()
      expect(schema.from).type.toBe<S.Array$<typeof S.NumberFromString>>()
      expect(schema.to).type.toBe<S.OptionFromSelf<S.SchemaClass<number>>>()
    })

    it("headNonEmpty", () => {
      expect(S.String.pipe).type.not.toBeCallableWith(S.headNonEmpty)

      const schema = S.headNonEmpty(S.NonEmptyArray(S.Number))
      expect(S.asSchema(schema)).type.toBe<S.Schema<number, readonly [number, ...Array<number>]>>()
      expect(schema)
        .type.toBe<S.transform<S.NonEmptyArray<typeof S.Number>, S.SchemaClass<number>>>()
      expect(schema.annotations({}))
        .type.toBe<S.transform<S.NonEmptyArray<typeof S.Number>, S.SchemaClass<number>>>()
      expect(schema.from).type.toBe<S.NonEmptyArray<typeof S.Number>>()
      expect(schema.to).type.toBe<S.SchemaClass<number>>()
    })

    it("headOrElse", () => {
      expect(S.String.pipe).type.not.toBeCallableWith(S.headOrElse())
      expect(S.headOrElse).type.not.toBeCallableWith(S.Array(S.Number), () => "a")
      when(S.Array(S.Number).pipe).isCalledWith(expect(S.headOrElse).type.not.toBeCallableWith(() => "a"))

      const schema = S.headOrElse(S.Array(S.Number))
      expect(S.asSchema(schema)).type.toBe<S.Schema<number, ReadonlyArray<number>>>()
      expect(schema).type.toBe<S.transform<S.Array$<typeof S.Number>, S.SchemaClass<number>>>()
      expect(schema.annotations({})).type.toBe<S.transform<S.Array$<typeof S.Number>, S.SchemaClass<number>>>()
      expect(schema.from).type.toBe<S.Array$<typeof S.Number>>()
      expect(schema.to).type.toBe<S.SchemaClass<number>>()
    })

    it("pluck", () => {
      expect(S.pluck).type.not.toBeCallableWith(
        S.Struct({ a: S.propertySignature(S.Number).pipe(S.fromKey("c")) }),
        "a"
      )

      expect(pipe(S.Struct({ a: S.String, b: S.Number }), S.pluck("a")))
        .type.toBe<S.SchemaClass<string, { readonly a: string }>>()
      const schema = S.pluck(S.Struct({ a: S.String, b: S.Number }), "a")
      expect(schema).type.toBe<S.SchemaClass<string, { readonly a: string }>>()
      expect(schema.annotations({})).type.toBe<S.SchemaClass<string, { readonly a: string }>>()

      // should support optional fields
      expect(S.pluck(S.Struct({ a: S.optional(S.String), b: S.Number }), "a"))
        .type.toBe<S.SchemaClass<string | undefined, { readonly a?: string | undefined }>>()
      expect(pipe(S.Struct({ a: S.optional(S.String), b: S.Number }), S.pluck("a")))
        .type.toBe<S.SchemaClass<string | undefined, { readonly a?: string | undefined }>>()
      expect(S.pluck(S.Struct({ a: S.optionalWith(S.String, { exact: true }), b: S.Number }), "a"))
        .type.toBe<S.SchemaClass<string | undefined, { readonly a?: string }>>()
      expect(pipe(S.Struct({ a: S.optionalWith(S.String, { exact: true }), b: S.Number }), S.pluck("a")))
        .type.toBe<S.SchemaClass<string | undefined, { readonly a?: string }>>()
    })

    it("parseNumber", () => {
      expect(S.parseNumber).type.not.toBeCallableWith(S.Null)

      const schema = S.parseNumber(S.String)
      expect(S.asSchema(schema)).type.toBe<S.Schema<number, string>>()
      expect(schema).type.toBe<S.transformOrFail<typeof S.String, typeof S.Number>>()
      expect(schema.annotations({})).type.toBe<S.transformOrFail<typeof S.String, typeof S.Number>>()
      expect(schema.from).type.toBe<typeof S.String>()
      expect(schema.to).type.toBe<typeof S.Number>()
    })
  })

  it("standardSchemaV1", () => {
    const standardSchema = S.standardSchemaV1(S.NumberFromString)
    expect(S.asSchema(standardSchema)).type.toBe<S.Schema<number, string>>()
    expect(standardSchema).type.toBe<StandardSchemaV1<string, number> & S.SchemaClass<number, string, never>>()
  })
})
