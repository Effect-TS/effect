import * as Arr from "../../Array.ts"
import * as Result from "../../Result.ts"
import * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import type * as SchemaRepresentation from "../../SchemaRepresentation.ts"
import * as SchemaTransformation from "../../SchemaTransformation.ts"
import { errorWithPath } from "../errors.ts"
import * as InternalRecord from "../record.ts"

type Path = ReadonlyArray<string | number>

/** @internal */
export function fromRepresentations(
  document: SchemaRepresentation.MultiDocument,
  revivers: ReadonlyArray<SchemaRepresentation.AnyReviver>
): SchemaRepresentation.SchemaMultiDocument {
  return revivePersisted(document.representations, document.references, makeReviverMap(revivers), false)
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
    if (out.has(reviver.id)) {
      throw errorWithPath(`Duplicate reviver for ${reviver.id}`, ["revivers", index, "id"])
    }
    out.set(reviver.id, reviver)
  }

  return out
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

  function resolveReviver<R extends SchemaRepresentation.AnyReviver>(
    representation: SchemaRepresentation.RepresentationAnnotation<SchemaRepresentation.Representation>,
    path: Path
  ): R {
    const reviver = reviverMap.get(representation.id)
    if (reviver === undefined) {
      throw errorWithPath(`Missing reviver for ${representation.id}`, path)
    }
    return reviver as R
  }

  function decodePayload(
    representation: SchemaRepresentation.RepresentationAnnotation<SchemaRepresentation.Representation>,
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

  function reviveDeclaration(
    declaration: SchemaRepresentation.Declaration,
    path: Path
  ): Schema.Top {
    const representationPath = [...path, "representation"]
    const representation = declaration.representation
    if (representation === undefined) {
      throw errorWithPath("Missing representation annotation", representationPath)
    }
    const reviver = resolveReviver<SchemaRepresentation.DeclarationReviver<any>>(representation, representationPath)
    const payload = decodePayload(representation, reviver, [...representationPath, "payload"])
    const typeParameters = reviveSchemas(declaration.typeParameters, [...path, "typeParameters"])
    const schema = reviver.revive({ payload, typeParameters, annotations: declaration.annotations })
    return appendChecks(schema, declaration.checks, [...path, "checks"])
  }

  function reviveFilter(
    filter: SchemaRepresentation.Filter,
    path: Path
  ): SchemaAST.Filter<any> {
    const representationPath = [...path, "representation"]
    const representation = filter.representation
    if (representation === undefined) {
      throw errorWithPath("Missing representation annotation", representationPath)
    }
    const reviver = resolveReviver<SchemaRepresentation.FilterReviver<any>>(representation, representationPath)
    const payload = decodePayload(representation, reviver, [...representationPath, "payload"])
    const schemas = reviveSchemas(representation.schemas ?? [], [...representationPath, "schemas"])
    const check = reviver.revive({ payload, schemas, annotations: filter.annotations })
    return filter.aborted ? check.abort() : check
  }

  function reviveFilterGroup(
    group: SchemaRepresentation.FilterGroup,
    path: Path
  ): SchemaAST.FilterGroup<any> {
    const representationPath = [...path, "representation"]
    const representation = group.representation
    if (representation === undefined) {
      const checks = group.checks.map((check, index) => reviveCheck(check, [...path, "checks", index]))
      return Schema.makeFilterGroup(
        checks as [SchemaAST.Check<any>, ...Array<SchemaAST.Check<any>>],
        group.annotations as Schema.Annotations.Filter | undefined
      )
    }

    const reviver = resolveReviver<SchemaRepresentation.FilterGroupReviver<any>>(representation, representationPath)
    const payload = decodePayload(representation, reviver, [...representationPath, "payload"])
    const schemas = reviveSchemas(representation.schemas ?? [], [...representationPath, "schemas"])
    return reviver.revive({ payload, schemas, annotations: group.annotations })
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
    annotations: Schema.Annotations.Annotations | undefined
  ): Schema.Top {
    return annotations === undefined ? schema : schema.annotate(annotations)
  }

  function finishStructural(
    schema: Schema.Top,
    representation: Exclude<SchemaRepresentation.Representation, SchemaRepresentation.Reference>,
    path: Path
  ): Schema.Top {
    return appendChecks(
      annotateNode(schema, representation.annotations),
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
    const ordinary = representation.annotations
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
        return annotateNode(Schema.suspend(() => thunk), representation.annotations)
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
export function fromRepresentation(
  document: SchemaRepresentation.Document,
  revivers: ReadonlyArray<SchemaRepresentation.AnyReviver>
): Schema.Top {
  return revivePersisted(
    [document.representation],
    document.references,
    makeReviverMap(revivers),
    true
  ).schemas[0]
}
