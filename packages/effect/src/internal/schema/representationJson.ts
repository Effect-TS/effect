import * as Schema from "../../Schema.ts"
import type * as SchemaRepresentation from "../../SchemaRepresentation.ts"
import { projectDocument, projectMultiDocument } from "./toRepresentation.ts"

const RepresentationSchema = Schema.suspend(
  (): Schema.Codec<SchemaRepresentation.Representation> => RepresentationUnion
)

const RepresentationAnnotationSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  payload: Schema.Json
})

const CheckRepresentationAnnotationSchema = Schema.Struct({
  ...RepresentationAnnotationSchema.fields,
  schemas: Schema.optional(Schema.Array(RepresentationSchema))
})

const AnnotationsSchema = Schema.Record(Schema.String, Schema.Json)

const CheckSchema = Schema.suspend((): Schema.Codec<SchemaRepresentation.Check> => CheckUnion)
const FilterSchema = Schema.Struct({
  _tag: Schema.tag("Filter"),
  representation: CheckRepresentationAnnotationSchema,
  annotations: Schema.optional(AnnotationsSchema),
  aborted: Schema.Boolean
})
const FilterGroupSchema = Schema.Struct({
  _tag: Schema.tag("FilterGroup"),
  representation: Schema.optional(CheckRepresentationAnnotationSchema),
  annotations: Schema.optional(AnnotationsSchema),
  checks: Schema.NonEmptyArray(CheckSchema)
})
const CheckUnion = Schema.Union([FilterSchema, FilterGroupSchema])

function makeKeywordSchema<Tag extends Exclude<SchemaRepresentation.Representation["_tag"], "Reference">>(tag: Tag) {
  return Schema.Struct({
    _tag: Schema.tag(tag),
    annotations: Schema.optional(AnnotationsSchema),
    checks: Schema.Array(CheckSchema)
  })
}

const DeclarationSchema = Schema.Struct({
  _tag: Schema.tag("Declaration"),
  representation: RepresentationAnnotationSchema,
  annotations: Schema.optional(AnnotationsSchema),
  typeParameters: Schema.Array(RepresentationSchema),
  checks: Schema.Array(CheckSchema)
})
const SuspendSchema = Schema.Struct({
  _tag: Schema.tag("Suspend"),
  annotations: Schema.optional(AnnotationsSchema),
  checks: Schema.Tuple([]),
  thunk: RepresentationSchema
})
function makeValueSchema<Type extends string, Value extends Schema.Constraint>(type: Type, value: Value) {
  return Schema.Struct({ type: Schema.tag(type), value })
}
const LiteralSchema = Schema.Struct({
  _tag: Schema.tag("Literal"),
  annotations: Schema.optional(AnnotationsSchema),
  checks: Schema.Array(CheckSchema),
  literal: Schema.Union([
    makeValueSchema("string", Schema.String),
    makeValueSchema("number", Schema.Finite),
    makeValueSchema("bigint", Schema.BigInt),
    makeValueSchema("boolean", Schema.Boolean)
  ])
})
const UniqueSymbolSchema = Schema.Struct({
  _tag: Schema.tag("UniqueSymbol"),
  annotations: Schema.optional(AnnotationsSchema),
  checks: Schema.Array(CheckSchema),
  symbol: Schema.Symbol
})
const EnumSchema = Schema.Struct({
  _tag: Schema.tag("Enum"),
  annotations: Schema.optional(AnnotationsSchema),
  checks: Schema.Array(CheckSchema),
  enums: Schema.Array(Schema.Tuple([
    Schema.String,
    Schema.Union([
      makeValueSchema("string", Schema.String),
      makeValueSchema("number", Schema.Number)
    ])
  ]))
})
const TemplateLiteralSchema = Schema.Struct({
  _tag: Schema.tag("TemplateLiteral"),
  annotations: Schema.optional(AnnotationsSchema),
  checks: Schema.Array(CheckSchema),
  parts: Schema.Array(RepresentationSchema)
})
const ElementSchema = Schema.Struct({
  isOptional: Schema.Boolean,
  type: RepresentationSchema,
  annotations: Schema.optional(AnnotationsSchema)
})
const ArraysSchema = Schema.Struct({
  _tag: Schema.tag("Arrays"),
  annotations: Schema.optional(AnnotationsSchema),
  checks: Schema.Array(CheckSchema),
  elements: Schema.Array(ElementSchema),
  rest: Schema.Array(RepresentationSchema)
})
const PropertyNameSchema = Schema.Union([
  makeValueSchema("string", Schema.String),
  makeValueSchema("number", Schema.Number),
  makeValueSchema("symbol", Schema.Symbol)
])
const PropertySignatureSchema = Schema.Struct({
  name: PropertyNameSchema,
  type: RepresentationSchema,
  isOptional: Schema.Boolean,
  isMutable: Schema.Boolean,
  annotations: Schema.optional(AnnotationsSchema)
})
const IndexSignatureSchema = Schema.Struct({
  parameter: RepresentationSchema,
  type: RepresentationSchema
})
const ObjectsSchema = Schema.Struct({
  _tag: Schema.tag("Objects"),
  annotations: Schema.optional(AnnotationsSchema),
  checks: Schema.Array(CheckSchema),
  propertySignatures: Schema.Array(PropertySignatureSchema),
  indexSignatures: Schema.Array(IndexSignatureSchema)
})
const UnionSchema = Schema.Struct({
  _tag: Schema.tag("Union"),
  annotations: Schema.optional(AnnotationsSchema),
  checks: Schema.Array(CheckSchema),
  types: Schema.Array(RepresentationSchema),
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

const DocumentSchema = Schema.Struct({
  representation: RepresentationSchema,
  references: Schema.Record(Schema.String, RepresentationSchema)
})

const MultiDocumentSchema = Schema.Struct({
  representations: Schema.NonEmptyArray(RepresentationSchema),
  references: Schema.Record(Schema.String, RepresentationSchema)
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
