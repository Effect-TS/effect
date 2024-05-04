import * as S from "@effect/schema/Schema"
import { hole } from "effect/Function"

// ---------------------------------------------
// A class with no fields should permit an empty argument in the constructor.
// ---------------------------------------------

class NoFields extends S.Class<NoFields>("NoFields")({}) {}

// $ExpectType [props?: void | {}, disableValidation?: boolean | undefined]
hole<ConstructorParameters<typeof NoFields>>()

// ---------------------------------------------
// A class with all fields with a default should permit an empty argument in the constructor.
// ---------------------------------------------

class AllDefaultedFields extends S.Class<AllDefaultedFields>("AllDefaultedFields")({
  a: S.String.pipe(S.propertySignature, S.withConstructorDefault(() => ""))
}) {}

// $ExpectType [props?: void | {}, disableValidation?: boolean | undefined]
hole<ConstructorParameters<typeof AllDefaultedFields>>()

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

// $ExpectType [props: { readonly a: string; readonly b: number; }, disableValidation?: boolean | undefined]
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

// $ExpectType [props: { readonly a: string; readonly b: number; readonly c: boolean; }, disableValidation?: boolean | undefined]
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

// $ExpectType { readonly b: typeof $String; readonly c: Schema<boolean, boolean, "c">; readonly a: Schema<string, string, "a">; }
ExtendedFromClassFields.fields

// $ExpectType [props: { readonly a: string; readonly b: string; readonly c: boolean; }, disableValidation?: boolean | undefined]
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

// $ExpectType { readonly _tag: PropertySignature<":", "ExtendedFromTaggedClassFields", never, ":", "ExtendedFromTaggedClassFields", true, never>; readonly b: typeof $String; readonly c: Schema<boolean, boolean, "c">; readonly a: Schema<string, string, "a">; }
ExtendedFromTaggedClassFields.fields

// $ExpectType [props: { readonly a: string; readonly b: string; readonly c: boolean; }, disableValidation?: boolean | undefined]
hole<ConstructorParameters<typeof ExtendedFromTaggedClassFields>>()

// ---------------------------------------------
// should accept a HasFields as argument
// ---------------------------------------------

export class FromHasFields extends S.Class<FromHasFields>("FromHasFields")({ fields: { a: S.String } }) {}

export class FromStruct extends S.Class<FromStruct>("FromStruct")(S.Struct({ a: S.String })) {}

export class FromRefinement
  extends S.Class<FromRefinement>("FromRefinement")(S.Struct({ a: S.String }).pipe(S.filter(() => true)))
{}

export class FromDoubleRefinement extends S.Class<FromDoubleRefinement>("FromDoubleRefinement")(
  S.Struct({ a: S.String }).pipe(S.filter(() => true), S.filter(() => true))
) {}
