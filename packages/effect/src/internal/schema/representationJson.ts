import * as Schema from "../../Schema.ts"
import type * as SchemaRepresentation from "../../SchemaRepresentation.ts"
import { projectDocument, projectMultiDocument } from "./toRepresentation.ts"

const RepresentationSchema = Schema.suspend(
  (): Schema.Codec<SchemaRepresentation.Representation> => RepresentationUnion
)
const RepresentationsSchema = Schema.Array(RepresentationSchema)

const RepresentationAnnotationSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  payload: Schema.Json
})

const CheckRepresentationAnnotationSchema = Schema.Struct({
  ...RepresentationAnnotationSchema.fields,
  schemas: Schema.optional(RepresentationsSchema)
})

const AnnotationsSchema = Schema.optional(Schema.Record(Schema.String, Schema.Json))

const CheckSchema = Schema.suspend((): Schema.Codec<SchemaRepresentation.Check> => CheckUnion)
const ChecksSchema = Schema.Array(CheckSchema)
const KeywordFields = {
  annotations: AnnotationsSchema,
  checks: ChecksSchema
}
const FilterSchema = Schema.Struct({
  _tag: Schema.tag("Filter"),
  representation: CheckRepresentationAnnotationSchema,
  annotations: AnnotationsSchema,
  aborted: Schema.Boolean
})
const FilterGroupSchema = Schema.Struct({
  _tag: Schema.tag("FilterGroup"),
  representation: Schema.optional(CheckRepresentationAnnotationSchema),
  annotations: AnnotationsSchema,
  checks: Schema.NonEmptyArray(CheckSchema)
})
const CheckUnion = Schema.Union([FilterSchema, FilterGroupSchema])

function makeKeywordSchema<Tag extends Exclude<SchemaRepresentation.Representation["_tag"], "Reference">>(tag: Tag) {
  return Schema.Struct({
    _tag: Schema.tag(tag),
    ...KeywordFields
  })
}

const DeclarationSchema = Schema.Struct({
  _tag: Schema.tag("Declaration"),
  representation: RepresentationAnnotationSchema,
  annotations: AnnotationsSchema,
  typeParameters: RepresentationsSchema,
  checks: ChecksSchema
})
const SuspendSchema = Schema.Struct({
  _tag: Schema.tag("Suspend"),
  annotations: AnnotationsSchema,
  checks: Schema.Tuple([]),
  thunk: RepresentationSchema
})
function makeValueSchema<Type extends string, Value extends Schema.Constraint>(type: Type, value: Value) {
  return Schema.Struct({ type: Schema.tag(type), value })
}
const StringValueSchema = makeValueSchema("string", Schema.String)
const NumberValueSchema = makeValueSchema("number", Schema.Number)
const LiteralSchema = Schema.Struct({
  _tag: Schema.tag("Literal"),
  ...KeywordFields,
  literal: Schema.Union([
    StringValueSchema,
    makeValueSchema("number", Schema.Finite),
    makeValueSchema("bigint", Schema.BigInt),
    makeValueSchema("boolean", Schema.Boolean)
  ])
})
const UniqueSymbolSchema = Schema.Struct({
  _tag: Schema.tag("UniqueSymbol"),
  ...KeywordFields,
  symbol: Schema.Symbol
})
const EnumSchema = Schema.Struct({
  _tag: Schema.tag("Enum"),
  ...KeywordFields,
  enums: Schema.Array(Schema.Tuple([
    Schema.String,
    Schema.Union([StringValueSchema, NumberValueSchema])
  ]))
})
const TemplateLiteralSchema = Schema.Struct({
  _tag: Schema.tag("TemplateLiteral"),
  ...KeywordFields,
  parts: RepresentationsSchema
})
const ElementSchema = Schema.Struct({
  isOptional: Schema.Boolean,
  type: RepresentationSchema,
  annotations: AnnotationsSchema
})
const ArraysSchema = Schema.Struct({
  _tag: Schema.tag("Arrays"),
  ...KeywordFields,
  elements: Schema.Array(ElementSchema),
  rest: RepresentationsSchema
})
const PropertySignatureSchema = Schema.Struct({
  name: Schema.Union([
    StringValueSchema,
    NumberValueSchema,
    makeValueSchema("symbol", Schema.Symbol)
  ]),
  type: RepresentationSchema,
  isOptional: Schema.Boolean,
  isMutable: Schema.Boolean,
  annotations: AnnotationsSchema
})
const IndexSignatureSchema = Schema.Struct({
  parameter: RepresentationSchema,
  type: RepresentationSchema
})
const ObjectsSchema = Schema.Struct({
  _tag: Schema.tag("Objects"),
  ...KeywordFields,
  propertySignatures: Schema.Array(PropertySignatureSchema),
  indexSignatures: Schema.Array(IndexSignatureSchema)
})
const UnionSchema = Schema.Struct({
  _tag: Schema.tag("Union"),
  ...KeywordFields,
  types: RepresentationsSchema,
  mode: Schema.Literals(["anyOf", "oneOf"])
})
const ReferenceSchema = Schema.Struct({
  _tag: Schema.tag("Reference"),
  $ref: Schema.NonEmptyString
})

const RepresentationUnion = Schema.Union([
  DeclarationSchema,
  ReferenceSchema,
  SuspendSchema,
  makeKeywordSchema("Null"),
  makeKeywordSchema("Undefined"),
  makeKeywordSchema("Void"),
  makeKeywordSchema("Never"),
  makeKeywordSchema("Unknown"),
  makeKeywordSchema("Any"),
  makeKeywordSchema("String"),
  makeKeywordSchema("Number"),
  makeKeywordSchema("Boolean"),
  makeKeywordSchema("BigInt"),
  makeKeywordSchema("Symbol"),
  makeKeywordSchema("ObjectKeyword"),
  LiteralSchema,
  UniqueSymbolSchema,
  EnumSchema,
  TemplateLiteralSchema,
  ArraysSchema,
  ObjectsSchema,
  UnionSchema
])

const ReferencesSchema = Schema.Record(Schema.String, RepresentationSchema)

const DocumentSchema = Schema.Struct({
  representation: RepresentationSchema,
  references: ReferencesSchema
})

const MultiDocumentSchema = Schema.Struct({
  representations: Schema.NonEmptyArray(RepresentationSchema),
  references: ReferencesSchema
})

const DocumentFromJson: Schema.Codec<SchemaRepresentation.Document, Schema.Json> = Schema.toCodecJson(
  DocumentSchema
)

const MultiDocumentFromJson: Schema.Codec<SchemaRepresentation.MultiDocument, Schema.Json> = Schema.toCodecJson(
  MultiDocumentSchema
)

const encodeDocument = Schema.encodeSync(DocumentFromJson)
const encodeMultiDocument = Schema.encodeSync(MultiDocumentFromJson)
const decodeDocument = Schema.decodeSync(DocumentFromJson)
const decodeMultiDocument = Schema.decodeSync(MultiDocumentFromJson)

/** @internal */
export function toJson(document: SchemaRepresentation.Document): Schema.Json {
  const projected = projectDocument(document)
  return encodeDocument(projected)
}

/** @internal */
export function toJsonMultiDocument(document: SchemaRepresentation.MultiDocument): Schema.Json {
  const projected = projectMultiDocument(document)
  return encodeMultiDocument(projected)
}

/** @internal */
export function fromJson(input: Schema.Json): SchemaRepresentation.Document {
  return decodeDocument(input)
}

/** @internal */
export function fromJsonMultiDocument(input: Schema.Json): SchemaRepresentation.MultiDocument {
  return decodeMultiDocument(input)
}
