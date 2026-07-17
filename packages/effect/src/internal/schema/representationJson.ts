import * as Schema from "../../Schema.ts"
import * as SchemaGetter from "../../SchemaGetter.ts"
import type * as SchemaRepresentation from "../../SchemaRepresentation.ts"
import { projectDocument, projectMultiDocument } from "./toRepresentation.ts"

type Representation = SchemaRepresentation.Representation
type Check = SchemaRepresentation.Check
type Document = SchemaRepresentation.Document
type MultiDocument = SchemaRepresentation.MultiDocument

type PersistedCodecs = {
  readonly document: Schema.Codec<Document, Schema.Json>
  readonly multiDocument: Schema.Codec<MultiDocument, Schema.Json>
}

function makePersistedCodecs(): PersistedCodecs {
  const NonEmptyString = Schema.String.check(Schema.makeFilter<string>((value) => value.length > 0))
  const CanonicalBigIntString = Schema.String.check(
    Schema.makeFilter<string>((value) => /^(?:0|-?[1-9]\d*)$/.test(value))
  )
  const CanonicalBigIntFromString = CanonicalBigIntString.pipe(
    Schema.decodeTo(Schema.BigInt, {
      decode: SchemaGetter.transform((value) => globalThis.BigInt(value)),
      encode: SchemaGetter.transform((value) => value.toString(10))
    })
  )

  const BigIntFromJson = Schema.Struct({
    _tag: Schema.tag("BigInt"),
    value: CanonicalBigIntFromString
  }).pipe(
    Schema.decodeTo(Schema.BigInt, {
      decode: SchemaGetter.transform((input) => input.value),
      encode: SchemaGetter.transform((value) => ({ _tag: "BigInt" as const, value }))
    })
  )

  const OrdinaryNumber = Schema.Number.check(
    Schema.makeFilter<number>((value) => Number.isFinite(value) && !Object.is(value, -0))
  )
  const ExceptionalNumber = Schema.Number.check(
    Schema.makeFilter<number>((value) => !Number.isFinite(value) || Object.is(value, -0))
  )
  const ExceptionalNumberFromJson = Schema.Struct({
    _tag: Schema.tag("ExceptionalNumber"),
    value: Schema.Literals(["-0", "NaN", "Infinity", "-Infinity"])
  }).pipe(
    Schema.decodeTo(ExceptionalNumber, {
      decode: SchemaGetter.transform((input) => {
        switch (input.value) {
          case "-0":
            return -0
          case "NaN":
            return Number.NaN
          case "Infinity":
            return Number.POSITIVE_INFINITY
          case "-Infinity":
            return Number.NEGATIVE_INFINITY
        }
      }),
      encode: SchemaGetter.transform((value) => ({
        _tag: "ExceptionalNumber" as const,
        value: Object.is(value, -0)
          ? "-0" as const
          : Number.isNaN(value)
          ? "NaN" as const
          : value === Number.POSITIVE_INFINITY
          ? "Infinity" as const
          : "-Infinity" as const
      }))
    })
  )
  const StructuralNumberFromJson = Schema.Union([OrdinaryNumber, ExceptionalNumberFromJson])

  const GlobalSymbol = Schema.Symbol.check(
    Schema.makeFilter<symbol>((value) => globalThis.Symbol.keyFor(value) !== undefined)
  )
  const GlobalSymbolFromJson = Schema.Struct({
    _tag: Schema.tag("GlobalSymbol"),
    key: Schema.String
  }).pipe(
    Schema.decodeTo(GlobalSymbol, {
      decode: SchemaGetter.transform((input) => globalThis.Symbol.for(input.key)),
      encode: SchemaGetter.transform((symbol) => ({
        _tag: "GlobalSymbol" as const,
        key: globalThis.Symbol.keyFor(symbol) as string
      }))
    })
  )

  type RepresentationCodec = Schema.Codec<Representation, Schema.Json>
  type CheckCodec = Schema.Codec<Check, Schema.Json>

  let RepresentationFromJson: RepresentationCodec
  const RepresentationRef = Schema.suspend((): RepresentationCodec => RepresentationFromJson) as RepresentationCodec

  const RepresentationAnnotationFromJson = Schema.Struct({
    id: NonEmptyString,
    payload: Schema.Json,
    schemas: Schema.optional(Schema.Array(RepresentationRef))
  })

  const AnnotationsFromJson = Schema.Record(Schema.String, Schema.Json)

  let CheckFromJson: CheckCodec
  const CheckRef = Schema.suspend((): CheckCodec => CheckFromJson) as CheckCodec
  const FilterFromJson = Schema.Struct({
    _tag: Schema.tag("Filter"),
    representation: RepresentationAnnotationFromJson,
    annotations: Schema.optional(AnnotationsFromJson),
    aborted: Schema.Boolean
  })
  const FilterGroupFromJson = Schema.Struct({
    _tag: Schema.tag("FilterGroup"),
    representation: Schema.optional(RepresentationAnnotationFromJson),
    annotations: Schema.optional(AnnotationsFromJson),
    checks: Schema.NonEmptyArray(CheckRef)
  })
  CheckFromJson = Schema.Union([FilterFromJson, FilterGroupFromJson]) as unknown as CheckCodec

  function keywordFromJson<Tag extends Exclude<Representation["_tag"], "Reference">>(tag: Tag) {
    return Schema.Struct({
      _tag: Schema.tag(tag),
      annotations: Schema.optional(AnnotationsFromJson),
      checks: Schema.Array(CheckRef)
    })
  }

  const DeclarationFromJson = Schema.Struct({
    _tag: Schema.tag("Declaration"),
    representation: RepresentationAnnotationFromJson,
    annotations: Schema.optional(AnnotationsFromJson),
    typeParameters: Schema.Array(RepresentationRef),
    checks: Schema.Array(CheckRef)
  })
  const SuspendFromJson = Schema.Struct({
    _tag: Schema.tag("Suspend"),
    annotations: Schema.optional(AnnotationsFromJson),
    checks: Schema.Tuple([]),
    thunk: RepresentationRef
  })
  const StringFromJson = Schema.Struct({
    _tag: Schema.tag("String"),
    annotations: Schema.optional(AnnotationsFromJson),
    checks: Schema.Array(CheckRef),
    contentMediaType: Schema.optional(Schema.String),
    contentSchema: Schema.optional(RepresentationRef)
  })
  const LiteralFromJson = Schema.Struct({
    _tag: Schema.tag("Literal"),
    annotations: Schema.optional(AnnotationsFromJson),
    checks: Schema.Array(CheckRef),
    literal: Schema.Union([
      Schema.String,
      StructuralNumberFromJson,
      Schema.Boolean,
      BigIntFromJson
    ])
  })
  const UniqueSymbolFromJson = Schema.Struct({
    _tag: Schema.tag("UniqueSymbol"),
    annotations: Schema.optional(AnnotationsFromJson),
    checks: Schema.Array(CheckRef),
    symbol: GlobalSymbolFromJson
  })
  const EnumFromJson = Schema.Struct({
    _tag: Schema.tag("Enum"),
    annotations: Schema.optional(AnnotationsFromJson),
    checks: Schema.Array(CheckRef),
    enums: Schema.Array(Schema.Tuple([
      Schema.String,
      Schema.Union([Schema.String, StructuralNumberFromJson])
    ]))
  })
  const TemplateLiteralFromJson = Schema.Struct({
    _tag: Schema.tag("TemplateLiteral"),
    annotations: Schema.optional(AnnotationsFromJson),
    checks: Schema.Array(CheckRef),
    parts: Schema.Array(RepresentationRef)
  })
  const ElementFromJson = Schema.Struct({
    isOptional: Schema.Boolean,
    type: RepresentationRef,
    annotations: Schema.optional(AnnotationsFromJson)
  })
  const ArraysFromJson = Schema.Struct({
    _tag: Schema.tag("Arrays"),
    annotations: Schema.optional(AnnotationsFromJson),
    checks: Schema.Array(CheckRef),
    elements: Schema.Array(ElementFromJson),
    rest: Schema.Array(RepresentationRef)
  })
  const StructuralPropertyKeyFromJson = Schema.Union([
    Schema.String,
    StructuralNumberFromJson,
    GlobalSymbolFromJson
  ])
  const PropertySignatureFromJson = Schema.Struct({
    name: StructuralPropertyKeyFromJson,
    type: RepresentationRef,
    isOptional: Schema.Boolean,
    isMutable: Schema.Boolean,
    annotations: Schema.optional(AnnotationsFromJson)
  })
  const IndexSignatureFromJson = Schema.Struct({
    parameter: RepresentationRef,
    type: RepresentationRef
  })
  const ObjectsFromJson = Schema.Struct({
    _tag: Schema.tag("Objects"),
    annotations: Schema.optional(AnnotationsFromJson),
    checks: Schema.Array(CheckRef),
    propertySignatures: Schema.Array(PropertySignatureFromJson),
    indexSignatures: Schema.Array(IndexSignatureFromJson)
  })
  const UnionFromJson = Schema.Struct({
    _tag: Schema.tag("Union"),
    annotations: Schema.optional(AnnotationsFromJson),
    checks: Schema.Array(CheckRef),
    types: Schema.Array(RepresentationRef),
    mode: Schema.Literals(["anyOf", "oneOf"])
  })
  const ReferenceFromJson = Schema.Struct({
    _tag: Schema.tag("Reference"),
    $ref: NonEmptyString
  })

  RepresentationFromJson = Schema.Union([
    DeclarationFromJson,
    ReferenceFromJson,
    SuspendFromJson,
    keywordFromJson("Null"),
    keywordFromJson("Undefined"),
    keywordFromJson("Void"),
    keywordFromJson("Never"),
    keywordFromJson("Unknown"),
    keywordFromJson("Any"),
    StringFromJson,
    keywordFromJson("Number"),
    keywordFromJson("Boolean"),
    keywordFromJson("BigInt"),
    keywordFromJson("Symbol"),
    LiteralFromJson,
    UniqueSymbolFromJson,
    keywordFromJson("ObjectKeyword"),
    EnumFromJson,
    TemplateLiteralFromJson,
    ArraysFromJson,
    ObjectsFromJson,
    UnionFromJson
  ]) as unknown as RepresentationCodec

  const PersistedDocumentWire = Schema.Struct({
    representation: RepresentationRef,
    references: Schema.Record(Schema.String, RepresentationRef)
  }) as unknown as Schema.Codec<Document, Schema.Json>
  const PersistedMultiDocumentWire = Schema.Struct({
    representations: Schema.NonEmptyArray(RepresentationRef),
    references: Schema.Record(Schema.String, RepresentationRef)
  }) as unknown as Schema.Codec<MultiDocument, Schema.Json>

  return {
    document: PersistedDocumentWire,
    multiDocument: PersistedMultiDocumentWire
  }
}

let persistedCodecs: PersistedCodecs | undefined

function getPersistedCodecs(): PersistedCodecs {
  return persistedCodecs ??= makePersistedCodecs()
}

/** @internal */
export function getPersistedDocumentFromJson(): Schema.Codec<Document, Schema.Json> {
  return getPersistedCodecs().document
}

/** @internal */
export function getPersistedMultiDocumentFromJson(): Schema.Codec<MultiDocument, Schema.Json> {
  return getPersistedCodecs().multiDocument
}

/** @internal */
export function toJson(document: Document): Schema.Json {
  const projected = projectDocument(document)
  return Schema.encodeSync(getPersistedCodecs().document)(projected)
}

/** @internal */
export function toJsonMultiDocument(document: MultiDocument): Schema.Json {
  const projected = projectMultiDocument(document)
  return Schema.encodeSync(getPersistedCodecs().multiDocument)(projected)
}

/** @internal */
export function fromJson(input: Schema.Json): Document {
  return Schema.decodeSync(getPersistedCodecs().document)(input)
}

/** @internal */
export function fromJsonMultiDocument(input: Schema.Json): MultiDocument {
  return Schema.decodeSync(getPersistedCodecs().multiDocument)(input)
}
