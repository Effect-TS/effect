import { hole } from "effect/Function"
import * as S from "effect/Schema"

// ---------------------------------------------
// check that there are no conflicts with the `fields` and `from` fields
// ---------------------------------------------

type HasFields<Fields extends S.Struct.Fields> = S.Struct<Fields> | {
  readonly [S.RefineSchemaId]: HasFields<Fields>
}

declare const checkForConflicts: <Fields extends S.Struct.Fields>(
  fieldsOr: Fields | HasFields<Fields>
) => S.Struct<Fields>

// $ExpectType Struct<{ fields: typeof String$; }>
checkForConflicts({ fields: S.String })

// $ExpectType Struct<{ from: typeof String$; }>
checkForConflicts({ from: S.String })

// $ExpectType Struct<{ fields: typeof String$; }>
checkForConflicts(S.Struct({ fields: S.String }))

// $ExpectType Struct<{ from: typeof String$; }>
checkForConflicts(S.Struct({ from: S.String }))

// $ExpectType Struct<{ fields: typeof String$; }>
checkForConflicts(S.Struct({ fields: S.String }).pipe(S.filter(() => true)))

// $ExpectType Struct<{ from: typeof String$; }>
checkForConflicts(S.Struct({ from: S.String }).pipe(S.filter(() => true)))

// $ExpectType Struct<{ fields: typeof String$; }>
checkForConflicts(S.Struct({ fields: S.String }).pipe(S.filter(() => true), S.filter(() => true)))

// $ExpectType Struct<{ from: typeof String$; }>
checkForConflicts(S.Struct({ from: S.String }).pipe(S.filter(() => true), S.filter(() => true)))

// $ExpectType Struct<{ fields: Struct<{ a: typeof String$; }>; }>
checkForConflicts({ fields: S.Struct({ a: S.String }) })

// $ExpectType Struct<{ fields: filter<Struct<{ a: typeof String$; }>>; }>
checkForConflicts({ fields: S.Struct({ a: S.String }).pipe(S.filter(() => true)) })

// $ExpectType Struct<{ fields: filter<filter<Struct<{ a: typeof String$; }>>>; }>
checkForConflicts({ fields: S.Struct({ a: S.String }).pipe(S.filter(() => true), S.filter(() => true)) })

// $ExpectType Struct<{ from: Struct<{ a: typeof String$; }>; }>
checkForConflicts({ from: S.Struct({ a: S.String }) })

// $ExpectType Struct<{ from: filter<Struct<{ a: typeof String$; }>>; }>
checkForConflicts({ from: S.Struct({ a: S.String }).pipe(S.filter(() => true)) })

// $ExpectType Struct<{ from: filter<filter<Struct<{ a: typeof String$; }>>>; }>
checkForConflicts({ from: S.Struct({ a: S.String }).pipe(S.filter(() => true), S.filter(() => true)) })

// ---------------------------------------------
// A class with no fields should permit an empty argument in the constructor.
// ---------------------------------------------

class NoFields extends S.Class<NoFields>("NoFields")({}) {}

// the ast should be a AST.Transformation

// $ExpectType Transformation
NoFields.ast

// $ExpectType [props?: void | {}, options?: MakeOptions | undefined]
hole<ConstructorParameters<typeof NoFields>>()

new NoFields()

NoFields.make()

new NoFields({})

NoFields.make({})

// ---------------------------------------------
// A class with all fields with a default should permit an empty argument in the constructor.
// ---------------------------------------------

class AllDefaultedFields extends S.Class<AllDefaultedFields>("AllDefaultedFields")({
  a: S.String.pipe(S.propertySignature, S.withConstructorDefault(() => ""))
}) {}

// $ExpectType [props?: void | { readonly a?: string; }, options?: MakeOptions | undefined]
hole<ConstructorParameters<typeof AllDefaultedFields>>()

new AllDefaultedFields()

AllDefaultedFields.make()

new AllDefaultedFields({})

AllDefaultedFields.make({})

// ---------------------------------------------
// test Context
// ---------------------------------------------

declare const aContext: S.Schema<string, string, "a">
declare const bContext: S.Schema<number, number, "b">
declare const cContext: S.Schema<boolean, boolean, "c">

class WithContext extends S.Class<WithContext>("WithContext")({ a: aContext, b: bContext }) {}

// $ExpectType WithContext
hole<S.Schema.Type<typeof WithContext>>()

// $ExpectType { readonly a: string; readonly b: number; }
hole<S.Schema.Encoded<typeof WithContext>>()

// $ExpectType "a" | "b"
hole<S.Schema.Context<typeof WithContext>>()

// ---------------------------------------------
// should be a constructor
// ---------------------------------------------

// $ExpectType [props: { readonly a: string; readonly b: number; }, options?: MakeOptions | undefined]
hole<ConstructorParameters<typeof WithContext>>()

// ---------------------------------------------
// should expose a `fields` field
// ---------------------------------------------

// $ExpectType { readonly a: Schema<string, string, "a">; readonly b: Schema<number, number, "b">; }
WithContext.fields

// ---------------------------------------------
// can be extended with Class.extend
// ---------------------------------------------

class Extended extends WithContext.extend<Extended>("Extended")({
  c: cContext
}) {}

// $ExpectType Extended
hole<S.Schema.Type<typeof Extended>>()

// $ExpectType { readonly a: string; readonly b: number; readonly c: boolean; }
hole<S.Schema.Encoded<typeof Extended>>()

// $ExpectType "a" | "b" | "c"
hole<S.Schema.Context<typeof Extended>>()

// $ExpectType { readonly a: Schema<string, string, "a">; readonly b: Schema<number, number, "b">; readonly c: Schema<boolean, boolean, "c">; }
Extended.fields

// $ExpectType [props: { readonly a: string; readonly b: number; readonly c: boolean; }, options?: MakeOptions | undefined]
hole<ConstructorParameters<typeof Extended>>()

// ---------------------------------------------
// can be extended with another Class `fields` field
// ---------------------------------------------

class ExtendedFromClassFields extends S.Class<ExtendedFromClassFields>("ExtendedFromClassFields")({
  ...WithContext.fields,
  b: S.String,
  c: cContext
}) {}

// $ExpectType ExtendedFromClassFields
hole<S.Schema.Type<typeof ExtendedFromClassFields>>()

// $ExpectType { readonly a: string; readonly b: string; readonly c: boolean; }
hole<S.Schema.Encoded<typeof ExtendedFromClassFields>>()

// $ExpectType "a" | "c"
hole<S.Schema.Context<typeof ExtendedFromClassFields>>()

// $ExpectType { readonly b: typeof String$; readonly c: Schema<boolean, boolean, "c">; readonly a: Schema<string, string, "a">; }
ExtendedFromClassFields.fields

// $ExpectType [props: { readonly a: string; readonly b: string; readonly c: boolean; }, options?: MakeOptions | undefined]
hole<ConstructorParameters<typeof ExtendedFromClassFields>>()

// ---------------------------------------------
// can be extended with another TaggedClass `fields` field
// ---------------------------------------------

class ExtendedFromTaggedClassFields
  extends S.TaggedClass<ExtendedFromTaggedClassFields>()("ExtendedFromTaggedClassFields", {
    ...WithContext.fields,
    b: S.String,
    c: cContext
  })
{}

// $ExpectType ExtendedFromTaggedClassFields
hole<S.Schema.Type<typeof ExtendedFromTaggedClassFields>>()

// $ExpectType { readonly a: string; readonly b: string; readonly c: boolean; readonly _tag: "ExtendedFromTaggedClassFields"; }
hole<S.Schema.Encoded<typeof ExtendedFromTaggedClassFields>>()

// $ExpectType "a" | "c"
hole<S.Schema.Context<typeof ExtendedFromTaggedClassFields>>()

// $ExpectType { readonly _tag: tag<"ExtendedFromTaggedClassFields">; readonly b: typeof String$; readonly c: Schema<boolean, boolean, "c">; readonly a: Schema<string, string, "a">; }
ExtendedFromTaggedClassFields.fields

// $ExpectType [props: { readonly a: string; readonly b: string; readonly c: boolean; }, options?: MakeOptions | undefined]
hole<ConstructorParameters<typeof ExtendedFromTaggedClassFields>>()

// ---------------------------------------------
// should accept a HasFields as argument
// ---------------------------------------------

export class FromStruct extends S.Class<FromStruct>("FromStruct")(S.Struct({ a: S.String })) {}

export class FromRefinement
  extends S.Class<FromRefinement>("FromRefinement")(S.Struct({ a: S.String }).pipe(S.filter(() => true)))
{}

export class FromDoubleRefinement extends S.Class<FromDoubleRefinement>("FromDoubleRefinement")(
  S.Struct({ a: S.String }).pipe(S.filter(() => true), S.filter(() => true))
) {}

// ---------------------------------------------
// users can override an instance member property
// ---------------------------------------------

class OverrideBase1 extends S.Class<OverrideBase1>("OverrideBase1")(S.Struct({
  a: S.String
})) {
  readonly b: number = 1
}

class OverrideExtended1 extends OverrideBase1.extend<OverrideExtended1>(
  "OverrideExtended1"
)({
  c: S.String
}) {
  override readonly b = 2
}

// $ExpectType 2
new OverrideExtended1({ a: "a", c: "c" }).b

// ---------------------------------------------
// users can override an instance member function
// ---------------------------------------------

class OverrideBase2 extends S.Class<OverrideBase2>("OverrideBase2")(S.Struct({
  a: S.String
})) {
  b(): number {
    return 1
  }
}

class OverrideExtended2 extends OverrideBase2.extend<OverrideExtended2>(
  "OverrideExtended2"
)({
  c: S.String
}) {
  override b(): 2 {
    return 2
  }
}

// $ExpectType 2
new OverrideExtended2({ a: "a", c: "c" }).b()

// ---------------------------------------------
// users can override a field with an instance member property
// ---------------------------------------------

class OverrideBase3 extends S.Class<OverrideBase3>("OverrideBase3")(S.Struct({
  a: S.String
})) {}

class OverrideExtended3 extends OverrideBase3.extend<OverrideExtended3>(
  "OverrideExtended3"
)({
  c: S.String
}) {
  override readonly a = "default"
}

// $ExpectType "default"
new OverrideExtended3({ a: "a", c: "c" }).a

// ---------------------------------------------
// users can't override an instance member property with a field
// ---------------------------------------------

class OverrideBase4 extends S.Class<OverrideBase4>("OverrideBase4")(S.Struct({
  a: S.String
})) {
  readonly b = 1
}

class OverrideExtended4 extends OverrideBase4.extend<OverrideExtended4>(
  "OverrideExtended4"
)({
  b: S.Number
}) {}

// $ExpectType 1
new OverrideExtended4({ a: "a", b: 2 }).b
