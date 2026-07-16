import * as Arr from "../../Array.ts"
import * as Effect from "../../Effect.ts"
import type * as JsonSchema from "../../JsonSchema.ts"
import * as Result from "../../Result.ts"
import * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import * as SchemaGetter from "../../SchemaGetter.ts"
import type * as SchemaRepresentation from "../../SchemaRepresentation.ts"
import * as SchemaTransformation from "../../SchemaTransformation.ts"
import { errorWithPath } from "../errors.ts"
import * as InternalRecord from "../record.ts"
import {
  fromJsonSchemaDocument as translateJsonSchemaDocument,
  fromJsonSchemaMultiDocument as translateJsonSchemaMultiDocument,
  projectDocument,
  projectMultiDocument
} from "./representation.ts"

type Path = ReadonlyArray<string | number>

type Representation = SchemaRepresentation.Representation
type Check = SchemaRepresentation.Check
type Document = SchemaRepresentation.Document
type MultiDocument = SchemaRepresentation.MultiDocument
type NodeAnnotations = SchemaRepresentation.Declaration["annotations"]
type FilterAnnotations = SchemaRepresentation.Filter["annotations"]
type RepresentationAnnotation = SchemaRepresentation.RepresentationAnnotation<Representation>

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

  const OrdinaryAnnotationsFromJson = Schema.Record(Schema.String, Schema.Json) as unknown as Schema.Codec<
    NonNullable<SchemaRepresentation.Element["annotations"]>,
    Schema.JsonObject
  >
  const OpaqueAnnotationsFromJson = Schema.StructWithRest(
    Schema.Struct({
      representation: Schema.optional(RepresentationAnnotationFromJson)
    }),
    [Schema.Record(Schema.String, Schema.Json)]
  ) as unknown as Schema.Codec<
    NonNullable<NodeAnnotations>,
    Schema.JsonObject
  >

  let CheckFromJson: CheckCodec
  const CheckRef = Schema.suspend((): CheckCodec => CheckFromJson) as CheckCodec
  const FilterFromJson = Schema.Struct({
    _tag: Schema.tag("Filter"),
    annotations: Schema.optional(OpaqueAnnotationsFromJson),
    aborted: Schema.Boolean
  })
  const FilterGroupFromJson = Schema.Struct({
    _tag: Schema.tag("FilterGroup"),
    annotations: Schema.optional(OpaqueAnnotationsFromJson),
    checks: Schema.NonEmptyArray(CheckRef)
  })
  CheckFromJson = Schema.Union([FilterFromJson, FilterGroupFromJson]) as unknown as CheckCodec

  function keywordFromJson<Tag extends Exclude<Representation["_tag"], "Reference">>(tag: Tag) {
    return Schema.Struct({
      _tag: Schema.tag(tag),
      annotations: Schema.optional(OpaqueAnnotationsFromJson),
      checks: Schema.Array(CheckRef)
    })
  }

  const DeclarationFromJson = Schema.Struct({
    _tag: Schema.tag("Declaration"),
    annotations: Schema.optional(OpaqueAnnotationsFromJson),
    typeParameters: Schema.Array(RepresentationRef),
    checks: Schema.Array(CheckRef)
  })
  const SuspendFromJson = Schema.Struct({
    _tag: Schema.tag("Suspend"),
    annotations: Schema.optional(OpaqueAnnotationsFromJson),
    checks: Schema.Tuple([]),
    thunk: RepresentationRef
  })
  const StringFromJson = Schema.Struct({
    _tag: Schema.tag("String"),
    annotations: Schema.optional(OpaqueAnnotationsFromJson),
    checks: Schema.Array(CheckRef),
    contentMediaType: Schema.optional(Schema.String),
    contentSchema: Schema.optional(RepresentationRef)
  })
  const LiteralFromJson = Schema.Struct({
    _tag: Schema.tag("Literal"),
    annotations: Schema.optional(OpaqueAnnotationsFromJson),
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
    annotations: Schema.optional(OpaqueAnnotationsFromJson),
    checks: Schema.Array(CheckRef),
    symbol: GlobalSymbolFromJson
  })
  const EnumFromJson = Schema.Struct({
    _tag: Schema.tag("Enum"),
    annotations: Schema.optional(OpaqueAnnotationsFromJson),
    checks: Schema.Array(CheckRef),
    enums: Schema.Array(Schema.Tuple([
      Schema.String,
      Schema.Union([Schema.String, StructuralNumberFromJson])
    ]))
  })
  const TemplateLiteralFromJson = Schema.Struct({
    _tag: Schema.tag("TemplateLiteral"),
    annotations: Schema.optional(OpaqueAnnotationsFromJson),
    checks: Schema.Array(CheckRef),
    parts: Schema.Array(RepresentationRef)
  })
  const ElementFromJson = Schema.Struct({
    isOptional: Schema.Boolean,
    type: RepresentationRef,
    annotations: Schema.optional(OrdinaryAnnotationsFromJson)
  })
  const ArraysFromJson = Schema.Struct({
    _tag: Schema.tag("Arrays"),
    annotations: Schema.optional(OpaqueAnnotationsFromJson),
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
    annotations: Schema.optional(OrdinaryAnnotationsFromJson)
  })
  const IndexSignatureFromJson = Schema.Struct({
    parameter: RepresentationRef,
    type: RepresentationRef
  })
  const ObjectsFromJson = Schema.Struct({
    _tag: Schema.tag("Objects"),
    annotations: Schema.optional(OpaqueAnnotationsFromJson),
    checks: Schema.Array(CheckRef),
    propertySignatures: Schema.Array(PropertySignatureFromJson),
    indexSignatures: Schema.Array(IndexSignatureFromJson)
  })
  const UnionFromJson = Schema.Struct({
    _tag: Schema.tag("Union"),
    annotations: Schema.optional(OpaqueAnnotationsFromJson),
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

  function exactParseOptions(options: SchemaAST.ParseOptions): SchemaAST.ParseOptions {
    return { ...options, onExcessProperty: "error" }
  }

  function makePersistedCodec<A>(wire: Schema.Codec<A, Schema.Json>): Schema.Codec<A, Schema.Json> {
    const target = Schema.declare<A>((_): _ is A => true)
    return Schema.Json.pipe(
      Schema.decodeTo(target, {
        decode: SchemaGetter.transformOrFail<A, Schema.Json>((input, options) => {
          const decoded = Schema.decodeUnknownResult(wire, exactParseOptions(options))(input)
          return Result.isFailure(decoded) ? Effect.fail(decoded.failure.issue) : Effect.succeed(decoded.success)
        }),
        encode: SchemaGetter.transformOrFail<Schema.Json, A>((input, options) => {
          const encoded = Schema.encodeUnknownResult(wire, exactParseOptions(options))(input)
          return Result.isFailure(encoded) ? Effect.fail(encoded.failure.issue) : Effect.succeed(encoded.success)
        })
      })
    )
  }

  return {
    document: makePersistedCodec(PersistedDocumentWire),
    multiDocument: makePersistedCodec(PersistedMultiDocumentWire)
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

function encodeProjected<A>(codec: Schema.Codec<A, Schema.Json>, input: A): Schema.Json {
  return Schema.encodeSync(codec)(input)
}

/** @internal */
export function toJson(
  document: SchemaRepresentation.Document
): Schema.Json {
  const projected = projectDocument(document)
  return encodeProjected(getPersistedCodecs().document, projected)
}

/** @internal */
export function toJsonMultiDocument(
  document: SchemaRepresentation.MultiDocument
): Schema.Json {
  const projected = projectMultiDocument(document)
  return encodeProjected(getPersistedCodecs().multiDocument, projected)
}

class ReferenceSlot {
  body: Schema.Top | undefined
  readonly wrapper: Schema.Top

  constructor(key: string) {
    this.wrapper = Schema.suspend((): Schema.Top => {
      if (this.body === undefined) {
        throw new Error(`Reference ${key} was evaluated before it was resolved`)
      }
      return this.body
    }).annotate({ identifier: key })
  }
}

function makeReviverMap(
  revivers: ReadonlyArray<SchemaRepresentation.AnyReviver>
): Map<string, SchemaRepresentation.AnyReviver> {
  const out = new Map<string, SchemaRepresentation.AnyReviver>()

  for (let index = 0; index < revivers.length; index++) {
    const reviver = revivers[index]
    if (!Number.isInteger(reviver.schemasArity) || reviver.schemasArity < 0) {
      throw errorWithPath(`Invalid schemasArity for ${reviver.id}`, ["revivers", index, "schemasArity"])
    }
    if (
      reviver._tag === "Declaration" &&
      (!Number.isInteger(reviver.typeParametersArity) || reviver.typeParametersArity < 0)
    ) {
      throw errorWithPath(`Invalid typeParametersArity for ${reviver.id}`, [
        "revivers",
        index,
        "typeParametersArity"
      ])
    }

    if (out.has(reviver.id)) {
      throw errorWithPath(`Duplicate reviver for ${reviver.id}`, ["revivers", index, "id"])
    }
    out.set(reviver.id, reviver)
  }

  return out
}

function getRepresentationAnnotation(
  annotations:
    | NodeAnnotations
    | FilterAnnotations
    | undefined,
  path: Path,
  required: boolean
): RepresentationAnnotation | undefined {
  const representation = annotations?.representation
  if (representation === undefined && required) {
    throw errorWithPath("Missing representation annotation", path)
  }
  return representation
}

function revivePersisted(
  representations: readonly [
    SchemaRepresentation.Representation,
    ...Array<SchemaRepresentation.Representation>
  ],
  references: SchemaRepresentation.References,
  reviverMap: ReadonlyMap<string, SchemaRepresentation.AnyReviver>,
  singleRoot: boolean
): SchemaRepresentation.SchemaMultiDocument {
  const slots = new Map<string, ReferenceSlot>()
  const referenceKeys = Object.keys(references)

  for (const key of referenceKeys) {
    slots.set(key, new ReferenceSlot(key))
  }

  function resolveReviver(
    representation: RepresentationAnnotation,
    expected: "Declaration",
    path: Path
  ): SchemaRepresentation.DeclarationReviver<any>
  function resolveReviver(
    representation: RepresentationAnnotation,
    expected: "Filter",
    path: Path
  ): SchemaRepresentation.FilterReviver<any>
  function resolveReviver(
    representation: RepresentationAnnotation,
    expected: "FilterGroup",
    path: Path
  ): SchemaRepresentation.FilterGroupReviver<any>
  function resolveReviver(
    representation: RepresentationAnnotation,
    expected: "Declaration" | "Filter" | "FilterGroup",
    path: Path
  ): SchemaRepresentation.AnyReviver {
    const reviver = reviverMap.get(representation.id)
    if (reviver === undefined) {
      throw errorWithPath(`Missing reviver for ${representation.id}`, path)
    }
    if (reviver._tag !== expected) {
      throw errorWithPath(`Invalid reviver kind for ${representation.id}`, path)
    }
    return reviver
  }

  function validateSchemasArity(
    representation: RepresentationAnnotation,
    reviver: SchemaRepresentation.AnyReviver,
    path: Path
  ): ReadonlyArray<SchemaRepresentation.Representation> {
    const schemas = representation.schemas ?? []
    if (schemas.length !== reviver.schemasArity) {
      throw errorWithPath(
        `Invalid schemas arity for ${representation.id}: expected ${reviver.schemasArity}, got ${schemas.length}`,
        path
      )
    }
    return schemas
  }

  function decodePayload(
    representation: RepresentationAnnotation,
    reviver: SchemaRepresentation.AnyReviver,
    path: Path
  ): any {
    const decoded = Schema.decodeUnknownResult(reviver.payloadSchema)(representation.payload)
    if (Result.isFailure(decoded)) {
      throw errorWithPath(`Invalid representation payload for ${representation.id}`, path)
    }
    return decoded.success
  }

  function reviveSchemas(
    representations: ReadonlyArray<SchemaRepresentation.Representation>,
    path: Path
  ): ReadonlyArray<Schema.Top> {
    return representations.map((representation, index) => recur(representation, [...path, index]))
  }

  function reviveAnnotations(
    annotations:
      | NodeAnnotations
      | FilterAnnotations
      | undefined,
    path: Path,
    revivedSchemas?: ReadonlyArray<Schema.Top>
  ): Schema.Annotations.Annotations | undefined {
    const representation = annotations?.representation
    if (representation === undefined) return annotations
    const schemas = revivedSchemas ??
      reviveSchemas(representation.schemas ?? [], [...path, "representation", "schemas"])
    return {
      ...annotations,
      representation: {
        id: representation.id,
        payload: representation.payload,
        ...(representation.schemas === undefined ? undefined : { schemas: schemas.map((schema) => schema.ast) })
      }
    }
  }

  function reviveDeclaration(
    declaration: SchemaRepresentation.Declaration,
    path: Path
  ): Schema.Top {
    const representationPath = [...path, "annotations", "representation"]
    const representation = getRepresentationAnnotation(declaration.annotations, representationPath, true)!
    const reviver = resolveReviver(representation, "Declaration", representationPath)
    const schemaRepresentations = validateSchemasArity(
      representation,
      reviver,
      [...representationPath, "schemas"]
    )
    if (declaration.typeParameters.length !== reviver.typeParametersArity) {
      throw errorWithPath(
        `Invalid type parameters arity for ${representation.id}: expected ${reviver.typeParametersArity}, got ${declaration.typeParameters.length}`,
        [...path, "typeParameters"]
      )
    }
    const payload = decodePayload(representation, reviver, [...representationPath, "payload"])
    const schemas = reviveSchemas(schemaRepresentations, [...representationPath, "schemas"])
    const typeParameters = reviveSchemas(declaration.typeParameters, [...path, "typeParameters"])
    const annotations = reviveAnnotations(declaration.annotations, [...path, "annotations"], schemas)
    const schema = reviver.revive({ payload, schemas, typeParameters, annotations })
    return appendChecks(schema, declaration.checks, [...path, "checks"])
  }

  function reviveFilter(
    filter: SchemaRepresentation.Filter,
    path: Path
  ): SchemaAST.Filter<any> {
    const representationPath = [...path, "annotations", "representation"]
    const representation = getRepresentationAnnotation(filter.annotations, representationPath, true)!
    const reviver = resolveReviver(representation, "Filter", representationPath)
    const schemaRepresentations = validateSchemasArity(
      representation,
      reviver,
      [...representationPath, "schemas"]
    )
    const payload = decodePayload(representation, reviver, [...representationPath, "payload"])
    const schemas = reviveSchemas(schemaRepresentations, [...representationPath, "schemas"])
    const annotations = reviveAnnotations(filter.annotations, [...path, "annotations"], schemas) as
      | Schema.Annotations.Filter
      | undefined
    const check = reviver.revive({ payload, schemas, annotations })
    return filter.aborted ? check.abort() : check
  }

  function reviveFilterGroup(
    group: SchemaRepresentation.FilterGroup,
    path: Path
  ): SchemaAST.FilterGroup<any> {
    const representationPath = [...path, "annotations", "representation"]
    const representation = getRepresentationAnnotation(group.annotations, representationPath, false)
    if (representation === undefined) {
      const checks = group.checks.map((check, index) => reviveCheck(check, [...path, "checks", index]))
      return Schema.makeFilterGroup(
        checks as [SchemaAST.Check<any>, ...Array<SchemaAST.Check<any>>],
        group.annotations as Schema.Annotations.Filter | undefined
      )
    }

    const reviver = resolveReviver(representation, "FilterGroup", representationPath)
    const schemaRepresentations = validateSchemasArity(
      representation,
      reviver,
      [...representationPath, "schemas"]
    )
    const payload = decodePayload(representation, reviver, [...representationPath, "payload"])
    const schemas = reviveSchemas(schemaRepresentations, [...representationPath, "schemas"])
    const annotations = reviveAnnotations(group.annotations, [...path, "annotations"], schemas) as
      | Schema.Annotations.Filter
      | undefined
    return reviver.revive({ payload, schemas, annotations })
  }

  function reviveCheck(
    check: SchemaRepresentation.Check,
    path: Path
  ): SchemaAST.Check<any> {
    return check._tag === "Filter"
      ? reviveFilter(check, path)
      : reviveFilterGroup(check, path)
  }

  function appendChecks<S extends Schema.Top>(
    schema: S,
    checks: ReadonlyArray<SchemaRepresentation.Check>,
    path: Path
  ): S["Rebuild"] {
    const revived = checks.map((check, index) => reviveCheck(check, [...path, index]))
    return Arr.isArrayNonEmpty(revived) ? schema.check(...revived) : schema as S["Rebuild"]
  }

  function annotateNode(
    schema: Schema.Top,
    annotations: NodeAnnotations | undefined,
    path: Path
  ): Schema.Top {
    const revived = reviveAnnotations(annotations, path)
    return revived === undefined ? schema : schema.annotate(revived)
  }

  function finishStructural(
    schema: Schema.Top,
    representation: Exclude<SchemaRepresentation.Representation, SchemaRepresentation.Reference>,
    path: Path
  ): Schema.Top {
    return appendChecks(
      annotateNode(schema, representation.annotations, [...path, "annotations"]),
      representation.checks,
      [...path, "checks"]
    )
  }

  function reviveString(
    representation: SchemaRepresentation.String,
    path: Path
  ): Schema.Top {
    const contentSchema = representation.contentSchema === undefined
      ? undefined
      : recur(representation.contentSchema, [...path, "contentSchema"])
    const ordinary = reviveAnnotations(representation.annotations, [...path, "annotations"])
    const isJson = representation.contentMediaType === "application/json" && contentSchema !== undefined
    const contentIdentifier = isJson ? SchemaAST.resolveIdentifier(contentSchema.ast) : undefined
    const annotations = ordinary === undefined &&
        representation.contentMediaType === undefined &&
        contentSchema === undefined
      ? undefined
      : {
        ...ordinary,
        ...(representation.contentMediaType === undefined
          ? undefined
          : { contentMediaType: representation.contentMediaType }),
        ...(contentSchema === undefined
          ? undefined
          : { contentSchema: SchemaAST.toEncoded(contentSchema.ast) }),
        ...(ordinary?.identifier !== undefined || contentIdentifier === undefined
          ? undefined
          : { identifier: `${contentIdentifier}JsonString` })
      }
    const source = appendChecks(
      annotations === undefined ? Schema.String : Schema.String.annotate(annotations),
      representation.checks,
      [...path, "checks"]
    )
    return isJson
      ? source.pipe(Schema.decodeTo(contentSchema, SchemaTransformation.fromJsonString))
      : source
  }

  function recur(
    representation: SchemaRepresentation.Representation,
    path: Path
  ): Schema.Top {
    switch (representation._tag) {
      case "Reference": {
        const slot = slots.get(representation.$ref)
        if (slot === undefined) {
          throw errorWithPath(`Invalid reference ${representation.$ref}`, [...path, "$ref"])
        }
        return slot.wrapper
      }
      case "Declaration":
        return reviveDeclaration(representation, path)
      case "Suspend": {
        const thunk = recur(representation.thunk, [...path, "thunk"])
        return annotateNode(Schema.suspend(() => thunk), representation.annotations, [...path, "annotations"])
      }
      case "Null":
        return finishStructural(Schema.Null, representation, path)
      case "Undefined":
        return finishStructural(Schema.Undefined, representation, path)
      case "Void":
        return finishStructural(Schema.Void, representation, path)
      case "Never":
        return finishStructural(Schema.Never, representation, path)
      case "Unknown":
        return finishStructural(Schema.Unknown, representation, path)
      case "Any":
        return finishStructural(Schema.Any, representation, path)
      case "String":
        return reviveString(representation, path)
      case "Number":
        return finishStructural(Schema.Number, representation, path)
      case "Boolean":
        return finishStructural(Schema.Boolean, representation, path)
      case "BigInt":
        return finishStructural(Schema.BigInt, representation, path)
      case "Symbol":
        return finishStructural(Schema.Symbol, representation, path)
      case "Literal":
        return finishStructural(Schema.Literal(representation.literal), representation, path)
      case "UniqueSymbol":
        return finishStructural(Schema.UniqueSymbol(representation.symbol), representation, path)
      case "ObjectKeyword":
        return finishStructural(Schema.ObjectKeyword, representation, path)
      case "Enum":
        return finishStructural(Schema.Enum(Object.fromEntries(representation.enums)), representation, path)
      case "TemplateLiteral": {
        const parts = representation.parts.map((part, index) => recur(part, [...path, "parts", index]))
        return finishStructural(
          Schema.TemplateLiteral(parts as unknown as Schema.TemplateLiteral.Parts),
          representation,
          path
        )
      }
      case "Arrays": {
        const elements = representation.elements.map((element, index) => {
          let schema = recur(element.type, [...path, "elements", index, "type"])
          if (element.annotations !== undefined) {
            schema = schema.annotateKey(element.annotations as Schema.Annotations.Key<unknown>)
          }
          return element.isOptional ? Schema.optionalKey(schema) : schema
        })
        const rest = representation.rest.map((item, index) => recur(item, [...path, "rest", index]))
        const schema = Arr.isArrayNonEmpty(rest)
          ? elements.length === 0 && rest.length === 1
            ? Schema.Array(rest[0])
            : Schema.TupleWithRest(Schema.Tuple(elements), rest)
          : Schema.Tuple(elements)
        return finishStructural(schema, representation, path)
      }
      case "Objects": {
        const fields: Record<PropertyKey, Schema.Top> = {}
        for (let index = 0; index < representation.propertySignatures.length; index++) {
          const property = representation.propertySignatures[index]
          let schema = recur(property.type, [...path, "propertySignatures", index, "type"])
          if (property.annotations !== undefined) {
            schema = schema.annotateKey(property.annotations as Schema.Annotations.Key<unknown>)
          }
          if (property.isOptional) {
            schema = Schema.optionalKey(schema)
          }
          if (property.isMutable) {
            schema = Schema.mutableKey(schema)
          }
          InternalRecord.set(fields, property.name, schema)
        }
        const records = representation.indexSignatures.map((indexSignature, index) =>
          Schema.Record(
            recur(indexSignature.parameter, [...path, "indexSignatures", index, "parameter"]) as Schema.Record.Key,
            recur(indexSignature.type, [...path, "indexSignatures", index, "type"])
          )
        )
        const schema = Arr.isArrayNonEmpty(records)
          ? representation.propertySignatures.length === 0 && records.length === 1
            ? records[0]
            : Schema.StructWithRest(Schema.Struct(fields), records)
          : Schema.Struct(fields)
        return finishStructural(schema, representation, path)
      }
      case "Union": {
        const members = representation.types.map((member, index) => recur(member, [...path, "types", index]))
        return finishStructural(Schema.Union(members, { mode: representation.mode }), representation, path)
      }
    }
  }

  const definitions: Record<string, Schema.Top> = {}
  for (const key of referenceKeys) {
    const slot = slots.get(key)!
    slot.body = recur(references[key], ["references", key])
    InternalRecord.set(definitions, key, slot.wrapper)
  }

  const schemas = representations.map((representation, index) =>
    recur(representation, singleRoot ? ["representation"] : ["representations", index])
  ) as [Schema.Top, ...Array<Schema.Top>]
  return { schemas, definitions }
}

/** @internal */
export function toSchema(
  document: Document,
  revivers: ReadonlyArray<SchemaRepresentation.AnyReviver>
): Schema.Top {
  return revivePersisted(
    [document.representation],
    document.references,
    makeReviverMap(revivers),
    true
  ).schemas[0]
}

/** @internal */
export function toSchemaMultiDocument(
  document: MultiDocument,
  revivers: ReadonlyArray<SchemaRepresentation.AnyReviver>
): SchemaRepresentation.SchemaMultiDocument {
  return revivePersisted(document.representations, document.references, makeReviverMap(revivers), false)
}

/** @internal */
export function fromJson(
  input: Schema.Json
): Document {
  return Schema.decodeSync(getPersistedCodecs().document)(input)
}

/** @internal */
export function fromJsonMultiDocument(
  input: Schema.Json
): MultiDocument {
  return Schema.decodeSync(getPersistedCodecs().multiDocument)(input)
}

function jsonSchemaReviverMap(): ReadonlyMap<string, SchemaRepresentation.AnyReviver> {
  const revivers: ReadonlyArray<SchemaRepresentation.AnyReviver> = [
    Schema.JsonReviver,
    Schema.isPatternReviver,
    Schema.isFiniteReviver,
    Schema.isGreaterThanReviver,
    Schema.isGreaterThanOrEqualToReviver,
    Schema.isLessThanReviver,
    Schema.isLessThanOrEqualToReviver,
    Schema.isMultipleOfReviver,
    Schema.isIntReviver,
    Schema.isMinLengthReviver,
    Schema.isMaxLengthReviver,
    Schema.isMinPropertiesReviver,
    Schema.isMaxPropertiesReviver,
    Schema.isPropertyNamesReviver,
    Schema.isUniqueReviver
  ]
  return new Map(revivers.map((reviver) => [reviver.id, reviver]))
}

/** @internal */
export function fromJsonSchemaDocument(
  document: JsonSchema.Document<"draft-2020-12">,
  options?: SchemaRepresentation.FromJsonSchemaOptions
): Schema.Top {
  const translated = translateJsonSchemaDocument(document, options)
  return revivePersisted(
    [translated.representation],
    translated.references,
    jsonSchemaReviverMap(),
    true
  ).schemas[0]
}

/** @internal */
export function fromJsonSchemaMultiDocument(
  document: JsonSchema.MultiDocument<"draft-2020-12">,
  options?: SchemaRepresentation.FromJsonSchemaOptions
): SchemaRepresentation.SchemaMultiDocument {
  const translated = translateJsonSchemaMultiDocument(document, options)
  return revivePersisted(translated.representations, translated.references, jsonSchemaReviverMap(), false)
}
